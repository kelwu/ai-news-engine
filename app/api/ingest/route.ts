import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { supabase } from "@/lib/supabase";

type Story = {
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
};

async function fetchNewsAPI(): Promise<Story[]> {
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
    summary: a.description ?? "",
    url: a.url,
    source: a.source?.name ?? "NewsAPI",
    published_at: a.publishedAt,
  }));
}

async function fetchTLDR(): Promise<Story[]> {
  const parser = new Parser();
  const feed = await parser.parseURL("https://tldr.tech/api/rss/ai");

  return (feed.items ?? []).slice(0, 10).map((item) => ({
    title: item.title ?? "",
    summary: item.contentSnippet ?? "",
    url: item.link ?? "",
    source: "TLDR AI",
    published_at: item.pubDate ?? new Date().toISOString(),
  }));
}

export async function POST(req: Request) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); // YYYY-MM-DD in PT

  let force = false;
  try {
    const body = await req.json();
    force = Boolean(body?.force);
  } catch { /* no body is fine */ }

  if (!force) {
    const { data: existing } = await supabase
      .from("episodes")
      .select("id")
      .eq("scheduled_for", today)
      .neq("status", "error")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ status: "already_ingested", episode_id: existing.id });
    }
  }

  const results = await Promise.allSettled([fetchNewsAPI(), fetchTLDR()]);

  const newsStories = results[0].status === "fulfilled" ? results[0].value : [];
  const tldrStories = results[1].status === "fulfilled" ? results[1].value : [];
  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason?.message)
    .join("; ");

  const rawStories = [...newsStories, ...tldrStories];
  const status = rawStories.length === 0 ? "error" : "ingested";

  const { data: episode, error: dbError } = await supabase
    .from("episodes")
    .insert({
      scheduled_for: today,
      raw_stories: rawStories,
      status,
      error: errors || null,
    })
    .select("id")
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    episode_id: episode.id,
    story_count: rawStories.length,
    status,
    ...(errors && { warnings: errors }),
  });
}
