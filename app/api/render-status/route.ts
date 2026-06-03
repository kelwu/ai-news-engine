import { NextRequest, NextResponse } from "next/server";
import { getRenderProgress } from "@remotion/lambda/client";
import { supabase } from "@/lib/supabase";

const REGION = process.env.REMOTION_REGION as import("@remotion/lambda").AwsRegion;
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME!;

process.env.AWS_ACCESS_KEY_ID = process.env.REMOTION_AWS_ACCESS_KEY_ID!;
process.env.AWS_SECRET_ACCESS_KEY = process.env.REMOTION_AWS_SECRET_ACCESS_KEY!;

export async function POST(req: NextRequest) {
  const { episode_id, renderId, bucketName } = await req.json() as {
    episode_id: string;
    renderId: string;
    bucketName: string;
  };

  const progress = await getRenderProgress({
    renderId,
    bucketName,
    functionName: FUNCTION_NAME,
    region: REGION,
  });

  if (progress.fatalErrorEncountered) {
    const msg = progress.errors[0]?.message ?? "Render failed";
    await supabase.from("episodes").update({ status: "voiced", error: msg }).eq("id", episode_id);
    return NextResponse.json({ done: false, error: msg });
  }

  if (progress.done) {
    await supabase.from("episodes")
      .update({ video_url: progress.outputFile, status: "rendered", error: null })
      .eq("id", episode_id);
    return NextResponse.json({ done: true, video_url: progress.outputFile });
  }

  const pct = progress.overallProgress != null
    ? Math.round(progress.overallProgress * 100)
    : null;

  return NextResponse.json({ done: false, progress: pct });
}
