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

async function publishReel(episode: {
  video_url: string;
  caption: string;
  hashtags: string;
}): Promise<string> {
  const caption = `${episode.caption}\n\n${episode.hashtags}`;

  const { id: creationId } = await igPost(`${ACCOUNT_ID}/media`, {
    media_type: "REELS",
    video_url: episode.video_url,
    caption,
  });

  await pollUntilReady(creationId);

  const { id: postId } = await igPost(`${ACCOUNT_ID}/media_publish`, {
    creation_id: creationId,
  });

  return postId;
}

async function publishCarousel(episode: {
  carousel_urls: string[];
  caption: string;
  hashtags: string;
}): Promise<string> {
  const caption = `${episode.caption}\n\n${episode.hashtags}`;

  // Create a container for each image
  const itemIds = await Promise.all(
    episode.carousel_urls.map(async (url) => {
      const { id } = await igPost(`${ACCOUNT_ID}/media`, {
        image_url: url,
        is_carousel_item: "true",
      });
      return id;
    })
  );

  // Create carousel container
  const { id: creationId } = await igPost(`${ACCOUNT_ID}/media`, {
    media_type: "CAROUSEL",
    children: itemIds.join(","),
    caption,
  });

  // Publish
  const { id: postId } = await igPost(`${ACCOUNT_ID}/media_publish`, {
    creation_id: creationId,
  });

  return postId;
}

export async function POST(req: NextRequest) {
  const { episode_id, format = "reel", closing_caption = "" } = await req.json();

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, video_url, carousel_urls, caption, caption_carousel, hashtags")
    .eq("id", episode_id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });

  const reelCaption = closing_caption
    ? `${episode.caption}\n\n${closing_caption}`
    : episode.caption;

  const carouselCaption = closing_caption
    ? `${episode.caption_carousel ?? episode.caption}\n\n${closing_caption}`
    : (episode.caption_carousel ?? episode.caption);

  try {
    const result: { reel_id?: string; carousel_id?: string } = {};

    if (format === "reel" || format === "both") {
      if (!episode.video_url) return NextResponse.json({ error: "No video URL — render the reel first" }, { status: 400 });
      result.reel_id = await publishReel({ ...episode, caption: reelCaption });
    }

    if (format === "carousel" || format === "both") {
      if (!episode.carousel_urls?.length) return NextResponse.json({ error: "No carousel URLs — render the carousel first" }, { status: 400 });
      result.carousel_id = await publishCarousel({ ...episode, caption: carouselCaption });
    }

    await supabase
      .from("episodes")
      .update({
        status: "published",
        error: null,
        ...(result.reel_id ? { instagram_reel_id: result.reel_id } : {}),
        ...(result.carousel_id ? { instagram_carousel_id: result.carousel_id } : {}),
        posted_at: new Date().toISOString(),
      })
      .eq("id", episode_id);

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
