import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Story } from "@/lib/news";

export const maxDuration = 300;

// Turn a trending idea card into a real episode. Seeds the episode with the
// chosen story first (plus the rest of the trending pool for carousel variety)
// and records seed_story so generate-script honors the user's pick.
export async function POST(req: Request) {
  let body: { chosen?: Story; pool?: Story[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { chosen, pool } = body;
  if (!chosen?.title || !chosen?.url) {
    return NextResponse.json({ error: "Missing chosen story" }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); // YYYY-MM-DD in PT

  // Chosen story first, then the rest of the pool (deduped by url).
  const rest = (pool ?? []).filter((s) => s.url !== chosen.url);
  const rawStories = [chosen, ...rest];

  const { data: episode, error } = await supabase
    .from("episodes")
    .insert({
      scheduled_for: today,
      raw_stories: rawStories,
      seed_story: chosen,
      status: "ingested",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, episode_id: episode.id });
}
