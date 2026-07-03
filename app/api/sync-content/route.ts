import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 30;

export async function GET() {
  const [youtubeResult, instagramResult] = await Promise.allSettled([
    syncYouTube(),
    syncInstagram(),
  ]);

  const response = {
    youtube: youtubeResult.status === "fulfilled" ? youtubeResult.value : { error: (youtubeResult.reason as Error).message },
    instagram: instagramResult.status === "fulfilled" ? instagramResult.value : { error: (instagramResult.reason as Error).message },
  };

  const anySuccess = youtubeResult.status === "fulfilled" || instagramResult.status === "fulfilled";
  return NextResponse.json(response, { status: anySuccess ? 200 : 500 });
}

async function syncYouTube() {
  const playlistId = process.env.YOUTUBE_UPLOADS_PLAYLIST_ID;
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!playlistId || !apiKey) throw new Error("Missing YOUTUBE_UPLOADS_PLAYLIST_ID or YOUTUBE_API_KEY");

  // Step 1: fetch playlist items
  const playlistUrl =
    `https://www.googleapis.com/youtube/v3/playlistItems` +
    `?part=snippet&maxResults=10&playlistId=${playlistId}&key=${apiKey}`;

  const playlistRes = await fetch(playlistUrl);
  if (!playlistRes.ok) throw new Error(`YouTube API error: ${playlistRes.status}`);
  const playlistData = await playlistRes.json();
  const items: unknown[] = playlistData.items ?? [];

  // Step 2: batch fetch statistics for all video IDs
  const videoIds = items
    .map((item) => {
      const i = item as Record<string, unknown>;
      const snippet = i.snippet as Record<string, unknown>;
      const resourceId = snippet.resourceId as Record<string, string> | undefined;
      return resourceId?.videoId;
    })
    .filter(Boolean) as string[];

  const statsMap: Record<string, { views: number; likes: number; comments: number }> = {};
  if (videoIds.length > 0) {
    const statsUrl =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=statistics&id=${videoIds.join(",")}&key=${apiKey}`;
    const statsRes = await fetch(statsUrl);
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      for (const v of statsData.items ?? []) {
        const s = v.statistics ?? {};
        statsMap[v.id] = {
          views: parseInt(s.viewCount ?? "0", 10),
          likes: parseInt(s.likeCount ?? "0", 10),
          comments: parseInt(s.commentCount ?? "0", 10),
        };
      }
    }
  }

  // Step 3: upsert with stats
  let upserted = 0;
  for (const item of items) {
    const i = item as Record<string, unknown>;
    const snippet = i.snippet as Record<string, unknown>;
    const resourceId = snippet.resourceId as Record<string, string> | undefined;
    const videoId = resourceId?.videoId;
    if (!videoId) continue;

    const thumbnails = snippet.thumbnails as Record<string, { url: string }> | undefined;
    const thumbnail = thumbnails?.maxres?.url ?? thumbnails?.high?.url ?? thumbnails?.default?.url ?? null;
    const description = snippet.description as string | undefined;
    const stats = statsMap[videoId];

    const { error } = await supabase.from("content_posts").upsert(
      {
        platform: "youtube",
        platform_id: videoId,
        title: snippet.title as string,
        caption: description?.slice(0, 500) ?? null,
        thumbnail_url: thumbnail,
        permalink: `https://www.youtube.com/watch?v=${videoId}`,
        published_at: snippet.publishedAt as string,
        views: stats?.views ?? null,
        likes: stats?.likes ?? null,
        comments: stats?.comments ?? null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "platform_id" }
    );

    if (!error) upserted++;
  }

  return { fetched: items.length, upserted };
}

async function syncInstagram() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("Missing INSTAGRAM_ACCESS_TOKEN");

  const fields = "id,caption,media_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count";
  const url = `https://graph.instagram.com/v25.0/me/media?fields=${fields}&limit=10&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
  const data = await res.json();

  const items: unknown[] = data.data ?? [];
  let upserted = 0;

  for (const item of items) {
    const i = item as Record<string, unknown>;
    const thumbnail = (i.thumbnail_url ?? i.media_url ?? null) as string | null;
    const caption = i.caption as string | undefined;

    const { error } = await supabase.from("content_posts").upsert(
      {
        platform: "instagram",
        platform_id: i.id as string,
        title: null,
        caption: caption?.slice(0, 500) ?? null,
        thumbnail_url: thumbnail,
        permalink: i.permalink as string,
        published_at: i.timestamp as string,
        likes: (i.like_count as number) ?? null,
        comments: (i.comments_count as number) ?? null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "platform_id" }
    );

    if (!error) upserted++;
  }

  return { fetched: items.length, upserted };
}
