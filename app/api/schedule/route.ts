import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { episode_id, scheduled_publish_at, format, closing_caption } = await req.json();

  if (!episode_id || !scheduled_publish_at || !format) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabase
    .from("episodes")
    .update({
      scheduled_publish_at,
      scheduled_format: format,
      scheduled_closing_caption: closing_caption ?? "",
    })
    .eq("id", episode_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { episode_id } = await req.json();

  const { error } = await supabase
    .from("episodes")
    .update({
      scheduled_publish_at: null,
      scheduled_format: null,
      scheduled_closing_caption: null,
    })
    .eq("id", episode_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
