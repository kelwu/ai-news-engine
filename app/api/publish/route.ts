import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const IG_API = "https://graph.instagram.com/v25.0";
const ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID!;
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;

async function igPost(path: string, body: Record<string, string>) {
  const res = await fetch(`${IG_API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: ACCESS_TOKEN }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message ?? `IG API error on ${path}`);
  return data as { id: string };
}

async function pollUntilReady(creationId: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${IG_API}/${creationId}?fields=status_code&access_token=${ACCESS_TOKEN}`
    );
    const data = await res.json() as { status_code: string };
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("Instagram media processing failed");
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Instagram media processing timed out");
}

async function publishWithRetry(creationId: string, maxAttempts = 5): Promise<string> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 3000 * i));
    try {
      const { id } = await igPost(`${ACCOUNT_ID}/media_publish`, { creation_id: creationId });
      return id;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on "media ID is not available" — other errors are final
      if (!lastError.message.toLowerCase().includes("not available")) throw lastError;
    }
  }
  throw lastError!;
}

async function fetchPermalink(mediaId: string): Promise<string | null> {
  try {
    const res = await fetch(`${IG_API}/${mediaId}?fields=permalink&access_token=${ACCESS_TOKEN}`);
    const data = await res.json() as { permalink?: string };
    return data.permalink ?? null;
  } catch {
    return null;
  }
}

async function publishReel(episode: {
  video_url: string;
  caption: string;
  hashtags: string;
}): Promise<{ id: string; permalink: string | null }> {
  const caption = `${episode.caption}\n\n${episode.hashtags}`;

  const { id: creationId } = await igPost(`${ACCOUNT_ID}/media`, {
    media_type: "REELS",
    video_url: episode.video_url,
    caption,
  });

  await pollUntilReady(creationId);
  const id = await publishWithRetry(creationId);
  const permalink = await fetchPermalink(id);
  return { id, permalink };
}

async function publishCarousel(episode: {
  carousel_urls: string[];
  caption: string;
  hashtags: string;
}): Promise<{ id: string; permalink: string | null }> {
  const caption = `${episode.caption}\n\n${episode.hashtags}`;

  const itemIds = await Promise.all(
    episode.carousel_urls.map(async (url) => {
      const { id } = await igPost(`${ACCOUNT_ID}/media`, {
        image_url: url,
        is_carousel_item: "true",
      });
      return id;
    })
  );

  const { id: creationId } = await igPost(`${ACCOUNT_ID}/media`, {
    media_type: "CAROUSEL",
    children: itemIds.join(","),
    caption,
  });

  const id = await publishWithRetry(creationId);
  const permalink = await fetchPermalink(id);
  return { id, permalink };
}

export async function POST(req: NextRequest) {
  const { episode_id, format = "reel", closing_caption = "" } = await req.json();

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, status, video_url, carousel_urls, caption, caption_carousel, hashtags")
    .eq("id", episode_id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (episode.status === "published") return NextResponse.json({ error: "Already published" }, { status: 409 });

  const reelCaption = closing_caption
    ? `${episode.caption}\n\n${closing_caption}`
    : episode.caption;

  const carouselCaption = closing_caption
    ? `${episode.caption_carousel ?? episode.caption}\n\n${closing_caption}`
    : (episode.caption_carousel ?? episode.caption);

  try {
    const update: Record<string, string | null> = {};

    if (format === "reel" || format === "both") {
      if (!episode.video_url) return NextResponse.json({ error: "No video URL — render the reel first" }, { status: 400 });
      const { id, permalink } = await publishReel({ ...episode, caption: reelCaption });
      update.instagram_reel_id = id;
      update.instagram_reel_url = permalink;
    }

    if (format === "carousel" || format === "both") {
      if (!episode.carousel_urls?.length) return NextResponse.json({ error: "No carousel URLs — render the carousel first" }, { status: 400 });
      const { id, permalink } = await publishCarousel({ ...episode, caption: carouselCaption });
      update.instagram_carousel_id = id;
      update.instagram_carousel_url = permalink;
    }

    await supabase
      .from("episodes")
      .update({ status: "published", error: null, posted_at: new Date().toISOString(), ...update })
      .eq("id", episode_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
