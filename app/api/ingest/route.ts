import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchNewsAPI, fetchTLDR } from "@/lib/news";

export const maxDuration = 300;

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
