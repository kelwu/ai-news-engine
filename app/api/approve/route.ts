import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { episode_id, format = "reel" } = await req.json();

  const { data: episode } = await supabase
    .from("episodes")
    .select("id, status")
    .eq("id", episode_id)
    .in("status", ["voiced", "rendered"])
    .maybeSingle();

  if (!episode) {
    return NextResponse.json({ error: "Episode not found or not ready for approval" }, { status: 404 });
  }

  // Render reel if needed
  if ((format === "reel" || format === "both") && episode.status !== "rendered") {
    const renderRes = await fetch(new URL("/api/render", req.url), { method: "POST" });
    const renderData = await renderRes.json();
    if (!renderRes.ok) {
      return NextResponse.json({ error: renderData.error }, { status: 500 });
    }
  }

  // Render carousel if needed
  if (format === "carousel" || format === "both") {
    const carouselRes = await fetch(new URL("/api/render-carousel", req.url), { method: "POST" });
    const carouselData = await carouselRes.json();
    if (!carouselRes.ok) {
      return NextResponse.json({ error: carouselData.error }, { status: 500 });
    }
  }

  const publishRes = await fetch(new URL("/api/publish", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ episode_id, format }),
  });
  const publishData = await publishRes.json();

  if (!publishRes.ok) {
    return NextResponse.json({ error: publishData.error }, { status: publishRes.status });
  }

  return NextResponse.json({ success: true, ...publishData });
}
