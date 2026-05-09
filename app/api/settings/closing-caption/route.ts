import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const KEY = "closing_caption";

export async function GET() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", KEY)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ value: data?.value ?? null });
}

export async function POST(req: NextRequest) {
  const { value } = await req.json() as { value: string };

  const { error } = await supabase
    .from("settings")
    .upsert({ key: KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
