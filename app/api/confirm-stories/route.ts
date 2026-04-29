import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type RawStory = { title: string; summary: string; url: string; source: string; published_at: string };

export async function POST(req: NextRequest) {
  const { episode_id, selected_indices, format } = await req.json() as {
    episode_id: string;
    selected_indices: number[];
    format: "reel" | "carousel" | "both";
  };

  const needsCarousel = format === "carousel" || format === "both";

  if (needsCarousel && (!Array.isArray(selected_indices) || selected_indices.length !== 3)) {
    return NextResponse.json({ error: "Exactly 3 stories must be selected for carousel" }, { status: 400 });
  }

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, raw_stories")
    .eq("id", episode_id)
    .eq("status", "story_selection")
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "Episode not found or not in story_selection status" }, { status: 404 });

  // For reel-only: just save format and advance status — reel script already exists from generate-script
  if (!needsCarousel) {
    const { error: updateError } = await supabase
      .from("episodes")
      .update({ recommended_format: "reel", status: "scripted", error: null })
      .eq("id", episode_id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const rawStories = episode.raw_stories as RawStory[];
  const selectedStories = selected_indices.map((i) => rawStories[i]).filter(Boolean);

  if (selectedStories.length !== 3) {
    return NextResponse.json({ error: "One or more selected indices are out of range" }, { status: 400 });
  }

  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const prompt = `You are generating carousel slide content for @productbykel (Instagram channel for PMs and AI builders).

Today is ${dateStr}. The user has selected these 3 stories for today's Tech Brief carousel:

${selectedStories.map((s, i) => `Story ${i + 1}: ${s.title}\nSource: ${s.source}\nURL: ${s.url}\nSummary: ${s.summary}`).join("\n\n")}

Generate carousel_data for these exactly 3 stories. Return JSON only, no markdown:

{
  "coverHeadline": "6-10 word punchy headline capturing today's overall theme",
  "date": "${dateStr}",
  "stories": [
    {
      "category": "AI · FUNDING",
      "source": "TechCrunch",
      "url": "https://...",
      "headlinePrefix": "1-3 word intro",
      "headlineHighlight": "key number or term to show in blue (1-3 words)",
      "headlineSuffix": "rest of headline ending with period",
      "body": "2-3 sentences explaining what happened and why it matters. Be specific — reference actual details from the article, not vague summaries.",
      "cards": [
        { "key": "descriptive stat label", "value": "$33B" },
        { "key": "second stat label", "value": "10 yrs" }
      ],
      "kelsTake": "One punchy PM-specific insight sentence, 15-20 words.",
      "coverStat": { "number": "$33B", "label": "brief cover card description" }
    }
  ]
}

Category examples: "AI · FUNDING", "PRODUCT · STRATEGY", "BIG TECH · AI", "OPEN SOURCE · AI", "POLICY · AI", "AI · RESEARCH"
Use the actual source name and URL for each story.
IMPORTANT: Card values must be very short — numbers, percentages, or 2-3 word stats only (e.g. "$33B", "−40%", "10 yrs"). Never sentences.
Body is the main readable content on each slide — 2-3 informative sentences that a PM would find valuable.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let carouselData: object;
  try {
    carouselData = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse carousel data from Claude" }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("episodes")
    .update({
      carousel_data: carouselData,
      recommended_format: format,
      status: "scripted",
      error: null,
    })
    .eq("id", episode_id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
