import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCRIPT_PROMPT = `You are an AI news editor for @productbykel, a channel for PMs and AI builders on Instagram.

Given today's AI news stories, do two things:

1. Pick the single best story for a 45-second reel and write a voiceover script (~110-130 words):
   - One-sentence hook → what happened → why it matters for PMs/builders → forward-looking close

2. Produce a carousel brief covering the top 3 stories with structured data for each.

Return JSON only, no markdown:
{
  "selected_story": { "headline": "", "source": "", "url": "" },
  "script": "",
  "caption": "",
  "hashtags": "",
  "recommended_format": "reel" | "carousel" | "both",
  "format_reason": "",
  "carousel_data": {
    "coverHeadline": "6-10 word punchy headline summarizing today's theme",
    "date": "{{date}}",
    "stories": [
      {
        "category": "AI · FUNDING",
        "headlinePrefix": "1-3 word intro",
        "headlineHighlight": "key number or term (1-3 words)",
        "headlineSuffix": "rest of headline ending with period",
        "cards": [
          { "key": "descriptive stat label", "value": "short value only" },
          { "key": "second stat label", "value": "short value only" }
        ],
        "kelsTake": "One punchy PM-specific sentence (15-20 words).",
        "coverStat": { "number": "$33B", "label": "brief cover card description" }
      }
    ]
  }
}

For recommended_format:
- "reel": breaking news, single strong narrative
- "carousel": educational, multiple distinct points, how-it-works
- "both": high-importance story worth maximum reach

The carousel stories array must have exactly 3 entries — use the top 3 most relevant stories from today.
Category examples: "AI · FUNDING", "PRODUCT · STRATEGY", "BIG TECH · AI", "OPEN SOURCE · AI", "POLICY · AI"

Stories:
{{raw_stories}}`;

export async function POST() {
  const today = new Date().toISOString().split("T")[0];

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, raw_stories")
    .eq("scheduled_for", today)
    .eq("status", "ingested")
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!episode) {
    return NextResponse.json({ error: "No ingested episode found for today" }, { status: 404 });
  }

  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const prompt = SCRIPT_PROMPT
    .replace("{{date}}", dateStr)
    .replace("{{raw_stories}}", JSON.stringify(episode.raw_stories, null, 2));

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let parsed: {
    selected_story: { headline: string; source: string; url: string };
    script: string;
    caption: string;
    hashtags: string;
    recommended_format?: string;
    format_reason?: string;
    carousel_data?: object;
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    await supabase
      .from("episodes")
      .update({ status: "error", error: "Failed to parse Claude response" })
      .eq("id", episode.id);
    return NextResponse.json({ error: "Failed to parse Claude response", raw }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("episodes")
    .update({
      selected_story: parsed.selected_story,
      script: parsed.script,
      caption: parsed.caption,
      hashtags: parsed.hashtags,
      recommended_format: parsed.recommended_format ?? "reel",
      format_reason: parsed.format_reason ?? null,
      carousel_data: parsed.carousel_data ?? null,
      status: "scripted",
      error: null,
    })
    .eq("id", episode.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    episode_id: episode.id,
    selected_story: parsed.selected_story,
    script: parsed.script,
  });
}
