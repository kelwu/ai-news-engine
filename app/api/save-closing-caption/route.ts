import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { episode_id, closing_caption } = await req.json() as { episode_id: string; closing_caption: string };

  const { error } = await supabase
    .from("episodes")
    .update({ closing_caption })
    .eq("id", episode_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
