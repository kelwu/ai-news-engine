// Closes the content flywheel: reads how published posts actually performed
// (content_posts) and matches them back to the episodes that made them, so we
// can tell which FORMAT and which TOPICS land. The result feeds two places:
//   1. generate-script — a "Performance signals" nudge in Claude's prompt.
//   2. the home cockpit — a human-readable performance pulse.

import type { SupabaseClient } from "@supabase/supabase-js";

type FormatStat = { total: number; count: number };

export type PerformanceInsights = {
  summary: string | null; // null when the sample is too small to trust
  byFormat: { reel: FormatStat; carousel: FormatStat };
  topTopics: Array<{ topic: string; engagement: number }>;
  sampleSize: number; // matched posts with real engagement data
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "to", "of", "in", "on", "at",
  "is", "are", "was", "were", "with", "as", "by", "from", "how", "why", "what",
  "this", "that", "it", "its", "new", "ai", "will", "has", "have", "you", "your",
  "can", "now", "into", "just", "more", "than", "over", "out", "get", "gets",
]);

function topicWords(headline: string): string[] {
  return Array.from(
    new Set(
      headline
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
    )
  );
}

type PublishedEpisode = {
  post_format: string | null;
  recommended_format: string | null;
  selected_story: { headline?: string } | null;
  instagram_reel_id: string | null;
  instagram_carousel_id: string | null;
  youtube_video_id: string | null;
};

export async function getPerformanceInsights(
  supabase: SupabaseClient
): Promise<PerformanceInsights> {
  const empty: PerformanceInsights = {
    summary: null,
    byFormat: { reel: { total: 0, count: 0 }, carousel: { total: 0, count: 0 } },
    topTopics: [],
    sampleSize: 0,
  };

  const [{ data: episodes }, { data: posts }] = await Promise.all([
    supabase
      .from("episodes")
      .select(
        "post_format, recommended_format, selected_story, instagram_reel_id, instagram_carousel_id, youtube_video_id"
      )
      .eq("status", "published"),
    supabase.from("content_posts").select("platform_id, likes, comments"),
  ]);

  if (!episodes?.length || !posts?.length) return empty;

  // platform_id -> engagement (likes + comments, comparable across platforms).
  const engagementById = new Map<string, number>();
  for (const p of posts as Array<{ platform_id: string; likes: number | null; comments: number | null }>) {
    engagementById.set(p.platform_id, (p.likes ?? 0) + (p.comments ?? 0));
  }

  const byFormat = { reel: { total: 0, count: 0 }, carousel: { total: 0, count: 0 } };
  const topicEngagement = new Map<string, number>();
  let sampleSize = 0;

  for (const ep of episodes as PublishedEpisode[]) {
    // Classify each published asset by its known format via the episode's id fields.
    const assets: Array<{ id: string | null; format: "reel" | "carousel" }> = [
      { id: ep.instagram_reel_id, format: "reel" },
      { id: ep.youtube_video_id, format: "reel" }, // YouTube Shorts behaves like a reel
      { id: ep.instagram_carousel_id, format: "carousel" },
    ];

    let episodeEngagement = 0;
    let episodeMatched = false;

    for (const asset of assets) {
      if (!asset.id || !engagementById.has(asset.id)) continue;
      const eng = engagementById.get(asset.id)!;
      byFormat[asset.format].total += eng;
      byFormat[asset.format].count += 1;
      episodeEngagement += eng;
      episodeMatched = true;
      sampleSize += 1;
    }

    if (episodeMatched) {
      for (const w of topicWords(ep.selected_story?.headline ?? "")) {
        topicEngagement.set(w, (topicEngagement.get(w) ?? 0) + episodeEngagement);
      }
    }
  }

  const topTopics = Array.from(topicEngagement.entries())
    .map(([topic, engagement]) => ({ topic, engagement }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);

  // Too few matched posts — don't coach Claude (or the user) on noise.
  if (sampleSize < 3) return { ...empty, byFormat, topTopics, sampleSize };

  const reelAvg = byFormat.reel.count > 0 ? byFormat.reel.total / byFormat.reel.count : 0;
  const carouselAvg = byFormat.carousel.count > 0 ? byFormat.carousel.total / byFormat.carousel.count : 0;

  const parts: string[] = [];

  if (byFormat.reel.count > 0 && byFormat.carousel.count > 0) {
    const [hi, lo, hiName, loName] =
      carouselAvg >= reelAvg
        ? [carouselAvg, reelAvg, "Carousels", "reels"]
        : [reelAvg, carouselAvg, "Reels", "carousels"];
    const ratio = lo > 0 ? (hi / lo).toFixed(1) : null;
    parts.push(
      ratio
        ? `${hiName} average about ${ratio}x the engagement of ${loName} (n=${sampleSize}). Lean toward ${hiName.toLowerCase()}.`
        : `${hiName} are outperforming ${loName} (n=${sampleSize}). Lean toward ${hiName.toLowerCase()}.`
    );
  } else if (byFormat.carousel.count > 0) {
    parts.push(`Carousels are the only format with engagement data so far (n=${sampleSize}).`);
  } else if (byFormat.reel.count > 0) {
    parts.push(`Reels are the only format with engagement data so far (n=${sampleSize}).`);
  }

  const topicList = topTopics.filter((t) => t.engagement > 0).slice(0, 3).map((t) => t.topic);
  if (topicList.length > 0) {
    parts.push(`Top-performing topics: ${topicList.join(", ")}. Favor stories in these themes.`);
  }

  return {
    summary: parts.length > 0 ? parts.join(" ") : null,
    byFormat,
    topTopics,
    sampleSize,
  };
}
