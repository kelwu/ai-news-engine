import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { IG_API, getInstagramToken, refreshInstagramToken, storeInstagramThumbnail } from "@/lib/instagram";

// First run copies up to 50 thumbnails into storage, so allow the full window.
export const maxDuration = 300;

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
    `?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;

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
  // Rotate the token before using it. A failed refresh isn't fatal — the current
  // token is still valid for weeks — but surface it in the response.
  let tokenRefresh: Awaited<ReturnType<typeof refreshInstagramToken>> | { error: string };
  try {
    tokenRefresh = await refreshInstagramToken();
  } catch (err) {
    tokenRefresh = { error: (err as Error).message };
  }
  const token = await getInstagramToken();

  const fields = "id,caption,media_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count";
  const url = `${IG_API}/me/media?fields=${fields}&limit=50&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
  const data = await res.json();

  const items: unknown[] = data.data ?? [];

  // Posts whose thumbnail is already copied to storage keep it; only new ones are fetched.
  const { data: existing } = await supabase
    .from("content_posts")
    .select("platform_id, thumbnail_url")
    .eq("platform", "instagram");
  const storedThumbs = new Map(
    (existing ?? [])
      .filter((p) => p.thumbnail_url?.includes("/storage/v1/object/public/thumbnails/"))
      .map((p) => [p.platform_id as string, p.thumbnail_url as string])
  );

  let upserted = 0;
  let thumbnailsStored = 0;

  for (const item of items) {
    const i = item as Record<string, unknown>;
    const mediaId = i.id as string;
    const cdnThumbnail = (i.thumbnail_url ?? i.media_url ?? null) as string | null;
    let thumbnail = storedThumbs.get(mediaId) ?? null;
    if (!thumbnail && cdnThumbnail) {
      thumbnail = await storeInstagramThumbnail(mediaId, cdnThumbnail);
      if (thumbnail) thumbnailsStored++;
      else thumbnail = cdnThumbnail;
    }
    const caption = i.caption as string | undefined;

    const { error } = await supabase.from("content_posts").upsert(
      {
        platform: "instagram",
        platform_id: mediaId,
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

  return { fetched: items.length, upserted, thumbnailsStored, tokenRefresh };
}
