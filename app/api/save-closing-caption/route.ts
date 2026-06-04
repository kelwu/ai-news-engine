import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { episode_id, closing_caption } = await req.json() as { episode_id?: string; closing_caption: string };

  const ops: Promise<{ error: { message: string } | null }>[] = [
    supabase.from("settings").upsert({ key: "closing_caption", value: closing_caption, updated_at: new Date().toISOString() }, { onConflict: "key" }),
  ];
  if (episode_id) {
    ops.push(supabase.from("episodes").update({ closing_caption }).eq("id", episode_id));
  }

  const results = await Promise.all(ops);
  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
