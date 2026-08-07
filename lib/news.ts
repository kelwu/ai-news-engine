// Shared news sourcing + ranking. Both /api/ingest (full episode run) and
// /api/trending (ephemeral idea cards) pull from here so there's one place that
// knows how to fetch and score AI news.

import Parser from "rss-parser";

export type Story = {
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
};

export type RankedStory = Story & {
  score: number;
  reason: string;
  source_count: number; // how many sources covered this story (velocity signal)
};

export async function fetchNewsAPI(): Promise<Story[]> {
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", "artificial intelligence OR AI OR LLM");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("apiKey", process.env.NEWS_API_KEY!);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`);
  const data = await res.json();

  return (data.articles ?? []).map((a: any) => ({
    title: a.title,
    summary: (a.description ?? "").slice(0, 500),
    url: a.url,
    source: a.source?.name ?? "NewsAPI",
    published_at: a.publishedAt,
  }));
}

export async function fetchTLDR(): Promise<Story[]> {
  const parser = new Parser();
  const feed = await parser.parseURL("https://tldr.tech/api/rss/ai");

  return (feed.items ?? []).slice(0, 3).map((item) => ({
    title: item.title ?? "",
    summary: (item.contentSnippet ?? "").slice(0, 500),
    url: item.link ?? "",
    source: "TLDR AI",
    published_at: item.pubDate ?? new Date().toISOString(),
  }));
}

// Fetch an article URL and return stripped plain text (first 4k chars). Used to
// give Claude the full story when scripting an episode or writing a shoot brief.
// Returns "" on any failure so callers can degrade gracefully.
export async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
  } catch {
    return "";
  }
}

// Topics that matter to PMs and AI builders — the @productbykel audience.
// A story mentioning several of these is more on-brand than generic AI news.
const PM_KEYWORDS = [
  "launch", "launches", "released", "release", "funding", "raised", "raises",
  "model", "agent", "agents", "product", "pricing", "api", "roadmap",
  "acquisition", "acquires", "gpt", "claude", "gemini", "llama", "openai",
  "anthropic", "startup", "feature", "benchmark", "enterprise", "revenue",
  "ipo", "valuation", "shipping", "adoption", "users", "growth",
];

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "to", "of", "in", "on", "at",
  "is", "are", "was", "were", "with", "as", "by", "from", "how", "why", "what",
  "this", "that", "it", "its", "new", "ai", "will", "has", "have", "you", "your",
]);

// Significant lowercased tokens from a title, used for cross-source overlap.
function keywords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  );
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

const RECENCY_WINDOW_MS = 72 * 60 * 60 * 1000; // 72h decay window

// Rank stories by cross-source velocity, recency, and PM/builder relevance.
// De-dupes near-identical titles (keeping the earliest-listed) but rolls the
// duplicate's coverage into a source_count "velocity" signal.
export function rankStories(stories: Story[]): RankedStory[] {
  const now = Date.now();
  const kw = stories.map((s) => keywords(s.title));

  // Cluster near-duplicate stories: >=2 significant shared title tokens.
  const clusterOf: number[] = stories.map((_, i) => i); // union-find-lite: index -> representative
  for (let i = 0; i < stories.length; i++) {
    for (let j = i + 1; j < stories.length; j++) {
      if (clusterOf[j] !== j) continue;
      if (overlapCount(kw[i], kw[j]) >= 2) clusterOf[j] = clusterOf[i];
    }
  }

  const sourcesByRep = new Map<number, Set<string>>();
  for (let i = 0; i < stories.length; i++) {
    const rep = clusterOf[i];
    if (!sourcesByRep.has(rep)) sourcesByRep.set(rep, new Set());
    sourcesByRep.get(rep)!.add(stories[i].source);
  }

  const ranked: RankedStory[] = [];
  const seenReps = new Set<number>();

  for (let i = 0; i < stories.length; i++) {
    const rep = clusterOf[i];
    if (seenReps.has(rep)) continue; // keep only the representative of each cluster
    seenReps.add(rep);

    const s = stories[i];
    const sourceCount = sourcesByRep.get(rep)!.size;

    // Recency: 0..1, linear decay over the window.
    const ageMs = now - new Date(s.published_at).getTime();
    const recency = Math.max(0, 1 - ageMs / RECENCY_WINDOW_MS);

    // Relevance: PM keyword hits in title + summary.
    const haystack = `${s.title} ${s.summary}`.toLowerCase();
    const hits = PM_KEYWORDS.filter((k) => haystack.includes(k));

    // Weighted score. Velocity dominates (cross-source coverage is the strongest
    // "this is actually trending" signal), then relevance, then recency.
    const velocityScore = (sourceCount - 1) * 5; // 0 for single-source, 5 per extra source
    const relevanceScore = Math.min(hits.length, 5) * 2;
    const recencyScore = recency * 3;
    const score = Math.round((velocityScore + relevanceScore + recencyScore) * 10) / 10;

    const reasonParts: string[] = [];
    if (sourceCount > 1) reasonParts.push(`Covered by ${sourceCount} sources`);
    if (hits.length > 0) reasonParts.push(`mentions ${hits.slice(0, 3).join(", ")}`);
    if (recency > 0.66) reasonParts.push("just published");
    const reason = reasonParts.length > 0 ? reasonParts.join(" · ") : "Recent AI story";

    ranked.push({ ...s, score, reason, source_count: sourceCount });
  }

  return ranked.sort((a, b) => b.score - a.score);
}
