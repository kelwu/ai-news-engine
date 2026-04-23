import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { episode_id } = await req.json();

  const { error } = await supabase
    .from("episodes")
    .update({ status: "ingested", error: "Rejected — re-run pipeline from script step" })
    .eq("id", episode_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
