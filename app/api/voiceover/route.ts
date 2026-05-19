import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export async function POST(req: Request) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

  let skip = false;
  try {
    const body = await req.json();
    skip = Boolean(body?.skip);
  } catch { /* no body */ }

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, script, recommended_format")
    .eq("scheduled_for", today)
    .eq("status", "imaged")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!episode) {
    return NextResponse.json({ error: "No imaged episode found for today" }, { status: 404 });
  }

  if (skip || episode.recommended_format === "carousel") {
    const { error } = await supabase
      .from("episodes")
      .update({ status: "voiced", error: null })
      .eq("id", episode.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, skipped: true });
  }

  const res = await fetch(`${ELEVENLABS_API_URL}/${process.env.ELEVENLABS_VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: episode.script,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `ElevenLabs error: ${err}` }, { status: 500 });
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const filePath = `voiceovers/${episode.id}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from("episodes")
    .upload(filePath, buffer, { contentType: "audio/mpeg", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = supabase.storage.from("episodes").getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from("episodes")
    .update({
      voiceover_url: publicUrl.publicUrl,
      status: "voiced",
      error: null,
    })
    .eq("id", episode.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    episode_id: episode.id,
    voiceover_url: publicUrl.publicUrl,
  });
}
