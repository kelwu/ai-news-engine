import { NextResponse } from "next/server";
import { renderStillOnLambda } from "@remotion/lambda/client";
import { supabase } from "@/lib/supabase";

const REGION = process.env.REMOTION_REGION as "us-west-2";
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME!;
const SERVE_URL = process.env.REMOTION_SERVE_URL!;

process.env.AWS_ACCESS_KEY_ID = process.env.REMOTION_AWS_ACCESS_KEY_ID!;
process.env.AWS_SECRET_ACCESS_KEY = process.env.REMOTION_AWS_SECRET_ACCESS_KEY!;

async function renderAndUpload(slideIndex: number, inputProps: object, episodeId: string): Promise<string> {
  const { url } = await renderStillOnLambda({
    region: REGION,
    functionName: FUNCTION_NAME,
    serveUrl: SERVE_URL,
    composition: "CarouselSlide",
    inputProps: { ...inputProps, slideIndex },
    imageFormat: "jpeg",
    privacy: "public",
  });

  const imgRes = await fetch(url);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const filePath = `carousel/${episodeId}_${slideIndex}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("episodes")
    .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("episodes").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function POST() {
  const today = new Date().toISOString().split("T")[0];

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, carousel_data, image_urls, image_url")
    .eq("scheduled_for", today)
    .in("status", ["voiced", "rendered"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "No voiced/rendered episode found for today" }, { status: 404 });
  if (!episode.carousel_data) return NextResponse.json({ error: "No carousel_data — re-run the script step" }, { status: 400 });

  const imageUrls: string[] = episode.image_urls ?? [episode.image_url, episode.image_url, episode.image_url];
  const images = {
    cover: imageUrls[0] ?? "",
    story1: imageUrls[0] ?? "",
    story2: imageUrls[1] ?? imageUrls[0] ?? "",
    story3: imageUrls[2] ?? imageUrls[0] ?? "",
  };

  const carouselData = episode.carousel_data as { coverHeadline: string; date: string; stories: object[] };
  const sharedProps = {
    coverHeadline: carouselData.coverHeadline,
    date: carouselData.date,
    stories: carouselData.stories,
    images,
  };

  let carouselUrls: string[];
  try {
    carouselUrls = await Promise.all(
      [0, 1, 2, 3, 4].map((i) => renderAndUpload(i, sharedProps, episode.id))
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Render failed: ${msg}` }, { status: 500 });
  }

  await supabase
    .from("episodes")
    .update({ carousel_urls: carouselUrls })
    .eq("id", episode.id);

  return NextResponse.json({ success: true, carousel_urls: carouselUrls });
}
