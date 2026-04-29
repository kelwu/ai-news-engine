import { NextResponse } from "next/server";
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
    const res = await fetch(`${IG_API}/${creationId}?fields=status_code&access_token=${ACCESS_TOKEN}`);
    const data = await res.json() as { status_code: string };
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("Instagram media processing failed");
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Instagram media processing timed out");
}

export async function GET() {
  const now = new Date().toISOString();

  const { data: episodes, error } = await supabase
    .from("episodes")
    .select("id, video_url, carousel_urls, caption, caption_carousel, hashtags, scheduled_format, scheduled_closing_caption")
    .eq("status", "rendered")
    .lte("scheduled_publish_at", now)
    .not("scheduled_publish_at", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!episodes?.length) return NextResponse.json({ published: 0 });

  const results = [];

  for (const episode of episodes) {
    try {
      const format = episode.scheduled_format ?? "reel";
      const closing = episode.scheduled_closing_caption ?? "";

      const reelCaption = closing ? `${episode.caption}\n\n${closing}` : episode.caption;
      const carouselCaption = closing
        ? `${episode.caption_carousel ?? episode.caption}\n\n${closing}`
        : (episode.caption_carousel ?? episode.caption);

      if (format === "reel" || format === "both") {
        if (!episode.video_url) throw new Error("No video URL");
        const caption = `${reelCaption}\n\n${episode.hashtags}`;
        const { id: creationId } = await igPost(`${ACCOUNT_ID}/media`, {
          media_type: "REELS",
          video_url: episode.video_url,
          caption,
        });
        await pollUntilReady(creationId);
        await igPost(`${ACCOUNT_ID}/media_publish`, { creation_id: creationId });
      }

      if (format === "carousel" || format === "both") {
        if (!episode.carousel_urls?.length) throw new Error("No carousel URLs");
        const caption = `${carouselCaption}\n\n${episode.hashtags}`;
        const itemIds = await Promise.all(
          episode.carousel_urls.map(async (url: string) => {
            const { id } = await igPost(`${ACCOUNT_ID}/media`, { image_url: url, is_carousel_item: "true" });
            return id;
          })
        );
        const { id: creationId } = await igPost(`${ACCOUNT_ID}/media`, {
          media_type: "CAROUSEL",
          children: itemIds.join(","),
          caption,
        });
        await igPost(`${ACCOUNT_ID}/media_publish`, { creation_id: creationId });
      }

      await supabase
        .from("episodes")
        .update({ status: "published", scheduled_publish_at: null, error: null })
        .eq("id", episode.id);

      results.push({ id: episode.id, status: "published" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await supabase.from("episodes").update({ error: msg }).eq("id", episode.id);
      results.push({ id: episode.id, status: "error", error: msg });
    }
  }

  return NextResponse.json({ published: results.filter((r) => r.status === "published").length, results });
}
