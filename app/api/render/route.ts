import { NextResponse } from "next/server";
import { renderMediaOnLambda } from "@remotion/lambda/client";
import { supabase } from "@/lib/supabase";

const REGION = process.env.REMOTION_REGION as import("@remotion/lambda").AwsRegion;
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME ?? "remotion-render-4-0-448-mem2048mb-disk2048mb-300sec";
const SERVE_URL = process.env.REMOTION_SERVE_URL!;
const S3_BUCKET = process.env.REMOTION_S3_BUCKET!;

process.env.AWS_ACCESS_KEY_ID = process.env.REMOTION_AWS_ACCESS_KEY_ID!;
process.env.AWS_SECRET_ACCESS_KEY = process.env.REMOTION_AWS_SECRET_ACCESS_KEY!;

export async function POST() {
  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, selected_story, script, image_url, image_urls, voiceover_url, caption, hashtags")
    .in("status", ["voiced", "rendering"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "No voiced episode found" }, { status: 404 });

  const story = episode.selected_story as { headline: string; source: string };

  const { renderId, bucketName } = await renderMediaOnLambda({
    region: REGION,
    functionName: FUNCTION_NAME,
    serveUrl: SERVE_URL,
    composition: "AINewsReel",
    inputProps: {
      headline: story.headline,
      summary: episode.script,
      source: story.source,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      voiceover_url: episode.voiceover_url,
      image_url: episode.image_url,
      image_urls: episode.image_urls ?? [episode.image_url],
      duration: 50,
    },
    codec: "h264",
    outName: `${episode.id}.mp4`,
    concurrencyPerLambda: 1,
    framesPerLambda: 750,
    maxRetries: 2,
  });

  await supabase
    .from("episodes")
    .update({ status: "rendering", render_id: renderId, render_bucket: bucketName, error: null })
    .eq("id", episode.id);

  return NextResponse.json({ success: true, episode_id: episode.id, renderId, bucketName });
}
