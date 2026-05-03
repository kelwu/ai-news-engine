import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const IG_API = "https://graph.instagram.com/v25.0";
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;

const REEL_METRICS = "impressions,reach,saved,likes,comments,shares,plays,total_interactions";
const CAROUSEL_METRICS = "impressions,reach,saved,likes,comments,shares,total_interactions";

async function fetchMediaMetrics(mediaId: string, metrics: string): Promise<Record<string, number>> {
  const res = await fetch(
    `${IG_API}/${mediaId}/insights?metric=${metrics}&access_token=${ACCESS_TOKEN}`
  );
  const data = await res.json() as { data?: Array<{ name: string; values: Array<{ value: number }> }>; error?: { message: string } };
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "Failed to fetch metrics");

  return Object.fromEntries(
    (data.data ?? []).map((m) => [m.name, m.values?.[0]?.value ?? 0])
  );
}

export async function POST(req: NextRequest) {
  const { episode_id } = await req.json() as { episode_id: string };

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, instagram_reel_id, instagram_carousel_id")
    .eq("id", episode_id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (!episode.instagram_reel_id && !episode.instagram_carousel_id) {
    return NextResponse.json({ error: "No Instagram post IDs found — publish the episode first" }, { status: 400 });
  }

  const metrics: Record<string, Record<string, number>> = {};

  if (episode.instagram_reel_id) {
    metrics.reel = await fetchMediaMetrics(episode.instagram_reel_id, REEL_METRICS);
  }
  if (episode.instagram_carousel_id) {
    metrics.carousel = await fetchMediaMetrics(episode.instagram_carousel_id, CAROUSEL_METRICS);
  }

  await supabase
    .from("episodes")
    .update({ ig_metrics: metrics, ig_metrics_at: new Date().toISOString() })
    .eq("id", episode_id);

  return NextResponse.json({ success: true, metrics });
}
