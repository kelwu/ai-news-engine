import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type RawStory = { title: string; summary: string; url: string; source: string; published_at: string };

// ── Character budgets derived from 1080×1080 canvas pixel math ────────────────
// Slide padding: 60px L/R → 960px usable width. Font sizes are Plus Jakarta Sans.
const LIMITS = {
  coverHeadline: 55,    // 92px font, 960px wide, 3-line max
  category: 25,         // "AI · FUNDING" style label
  headlinePrefix: 20,   // 1-3 words
  headlineHighlight: 20,// 1-3 words
  headlineSuffix: 50,   // rest of headline ending with period
  headlineCombined: 80, // 52px font, 752px wide (next to 180px thumb), 3 lines
  body: 280,            // 28px font, 960px wide, ~5 lines of flex space
  kelsTake: 120,        // 26px font, 912px inner width, 2 lines
  cardKey: 25,          // 22px font, ~273px inner card width
  cardValue: 15,        // 32px font, same card — numbers/stats only
  coverStatNumber: 12,  // 48px font, ~272px inner card width
  coverStatLabel: 30,   // 26px font, ~272px, 1-2 lines
} as const;

type StoryShape = {
  category: string;
  source?: string;
  url?: string;
  headlinePrefix?: string;
  headlineHighlight?: string;
  headlineSuffix?: string;
  headline?: string;
  body?: string;
  cards: Array<{ key: string; value: string }>;
  kelsTake: string;
  coverStat: { number: string; label: string };
};

type CarouselDataShape = {
  coverHeadline: string;
  date: string;
  stories: StoryShape[];
};


const GENERATE_CAROUSEL_TOOL: Anthropic.Tool = {
  name: "generate_carousel_data",
  description: "Output the carousel slide data for the selected stories.",
  input_schema: {
    type: "object" as const,
    properties: {
      coverHeadline: { type: "string" },
      date: { type: "string" },
      stories: {
        type: "array",
        items: {
          type: "object" as const,
          properties: {
            category: { type: "string" },
            source: { type: "string" },
            url: { type: "string" },
            headlinePrefix: { type: "string" },
            headlineHighlight: { type: "string" },
            headlineSuffix: { type: "string" },
            body: { type: "string" },
            cards: {
              type: "array",
              items: {
                type: "object" as const,
                properties: {
                  key: { type: "string" },
                  value: { type: "string" },
                },
                required: ["key", "value"],
                additionalProperties: false,
              },
            },
            kelsTake: { type: "string" },
            coverStat: {
              type: "object" as const,
              properties: {
                number: { type: "string" },
                label: { type: "string" },
              },
              required: ["number", "label"],
              additionalProperties: false,
            },
          },
          required: ["category", "source", "url", "headlinePrefix", "headlineHighlight", "headlineSuffix", "body", "cards", "kelsTake", "coverStat"],
          additionalProperties: false,
        },
      },
    },
    required: ["coverHeadline", "date", "stories"],
    additionalProperties: false,
  },
};

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}

function enforceHardLimits(data: CarouselDataShape): CarouselDataShape {
  return {
    ...data,
    coverHeadline: truncateAtWord(data.coverHeadline ?? "", LIMITS.coverHeadline),
    stories: (data.stories ?? []).map((s) => ({
      ...s,
      headlinePrefix: s.headlinePrefix ? truncateAtWord(s.headlinePrefix, LIMITS.headlinePrefix) : s.headlinePrefix,
      headlineHighlight: s.headlineHighlight ? truncateAtWord(s.headlineHighlight, LIMITS.headlineHighlight) : s.headlineHighlight,
      headlineSuffix: s.headlineSuffix ? truncateAtWord(s.headlineSuffix, LIMITS.headlineSuffix) : s.headlineSuffix,
      body: s.body ? truncateAtWord(s.body, LIMITS.body) : s.body,
      kelsTake: truncateAtWord(s.kelsTake ?? "", LIMITS.kelsTake),
      cards: (s.cards ?? []).map((c) => ({
        key: truncateAtWord(c.key ?? "", LIMITS.cardKey),
        value: truncateAtWord(c.value ?? "", LIMITS.cardValue),
      })),
      coverStat: {
        number: truncateAtWord(s.coverStat?.number ?? "", LIMITS.coverStatNumber),
        label: truncateAtWord(s.coverStat?.label ?? "", LIMITS.coverStatLabel),
      },
    })),
  };
}


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

Generate carousel_data for these exactly 3 stories by calling generate_carousel_data with:

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
        { "key": "second stat label", "value": "10 yrs" },
        { "key": "third stat label", "value": "−40%" }
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
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    tools: [GENERATE_CAROUSEL_TOOL],
    tool_choice: { type: "tool", name: "generate_carousel_data" },
  });

  const toolBlock = message.content.find(b => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    return NextResponse.json({ error: "Failed to generate carousel data" }, { status: 500 });
  }
  let carouselData = toolBlock.input as CarouselDataShape;

  // Enforce hard character limits — word-boundary truncation, no-op when within budget
  carouselData = enforceHardLimits(carouselData);

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
