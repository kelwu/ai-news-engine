import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadShort } from "@/lib/youtube";

export const maxDuration = 300;

// Split the shared hashtag string into YouTube tags, capped at YouTube's ~500 char total.
function toTags(hashtags: string | null): string[] {
  if (!hashtags) return [];
  const tags: string[] = [];
  let total = 0;
  for (const raw of hashtags.split(/\s+/)) {
    const t = raw.replace(/^#/, "").trim();
    if (!t) continue;
    total += t.length + 1;
    if (total > 480) break;
    tags.push(t);
  }
  return tags;
}

export async function POST(req: NextRequest) {
  const { episode_id, privacy = "public", closing_caption = "" } = await req.json();

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, selected_story, script, caption, hashtags, video_url, youtube_video_id")
    .eq("id", episode_id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (!episode.video_url) return NextResponse.json({ error: "No video URL — render the reel first" }, { status: 400 });
  if (episode.youtube_video_id) return NextResponse.json({ error: "Already posted to YouTube" }, { status: 409 });

  const story = (episode.selected_story ?? {}) as { headline?: string; source?: string };
  const headline = story.headline ?? "AI News";
  const title = `${headline} #Shorts`.slice(0, 100);

  const description = [episode.caption ?? episode.script ?? "", closing_caption, episode.hashtags ?? ""]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { id, url } = await uploadShort({
      videoUrl: episode.video_url,
      title,
      description,
      tags: toTags(episode.hashtags),
      privacyStatus: privacy as "public" | "unlisted" | "private",
    });

    await supabase
      .from("episodes")
      .update({ youtube_video_id: id, youtube_url: url, error: null })
      .eq("id", episode_id);

    // Surface in the content dashboard immediately; /api/sync-content backfills metrics later.
    await supabase.from("content_posts").upsert(
      {
        platform: "youtube",
        platform_id: id,
        title,
        caption: episode.caption?.slice(0, 500) ?? null,
        permalink: url,
        published_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      },
      { onConflict: "platform_id" }
    );

    return NextResponse.json({ success: true, video_id: id, url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "YouTube publish failed";
    await supabase.from("episodes").update({ error: msg }).eq("id", episode_id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
