import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { episode_id, closing_caption } = await req.json() as { episode_id?: string; closing_caption: string };

  const { error: settingsError } = await supabase
    .from("settings")
    .upsert({ key: "closing_caption", value: closing_caption, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  if (episode_id) {
    const { error: episodeError } = await supabase
      .from("episodes")
      .update({ closing_caption })
      .eq("id", episode_id);
    if (episodeError) return NextResponse.json({ error: episodeError.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
