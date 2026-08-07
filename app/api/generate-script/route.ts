import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { HUMANIZER_RULES } from "@/lib/voice";
import { getPerformanceInsights } from "@/lib/insights";
import { fetchArticleText } from "@/lib/news";

export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI news editor for @productbykel, a channel for PMs and AI builders on Instagram.

${HUMANIZER_RULES}


Your job each day:
1. Review today's AI news stories — full article content is provided for each
2. Select the single best story for the reel based on: depth of content, relevance to PMs/builders, recency
3. Call finalize_output with all your results

Reel script guidance (110-130 words, ~45 seconds):
- Hook: one punchy sentence that creates urgency or curiosity
- What happened: plain language, specific details from the article
- Why it matters: concrete implication for PMs or builders
- Forward look: one sentence on what to watch

Carousel guidance (3 stories, structured data):
- Cover headline: 6-10 words capturing today's theme
Format recommendation:
- "reel": breaking news, single strong narrative, emotional/dramatic
- "carousel": educational, multiple distinct points, how-it-works
- "both": high-importance story worth maximum reach

Carousel candidates (REQUIRED — always provide exactly 3): Pick the 3 best stories from the raw list for the carousel by their 0-based index. Include one even if you would not normally recommend it — the user overrides your selection. Give a one-sentence reason per story. Never leave carousel_candidates empty.

Caption writing rules (Instagram best practices — applies to both caption fields):
- Line 1 is the hook — must be under 125 characters (the "more" cutoff). Make it a bold claim, surprising stat, or question that demands a tap.
- Use blank lines between paragraphs for readability.
- After the hook, write 3-5 sentences of body content. Explain what happened, why it matters for PMs/builders, and one forward-looking takeaway. Be specific — name the company, product, or number. Do not just repeat the hook.
- After the body content, add "Source: [source name]" on its own line.
- End with one engagement question (e.g. "Which story surprised you most? Drop it below 👇").
- Hashtags go in the hashtags field, not in either caption field. 5–8 tightly relevant tags.
- Never use em-dashes or asterisks. Write in second person, conversational tone.
- Target 150-250 words total per caption. Short captions get buried — substance earns saves and shares.

caption_reel (the "caption" field): Written for a video post. Hook teases what the viewer is about to watch. After the hook, summarize what happened and why it matters. CTA is "Watch till the end 👇" or "Sound on 🔊". Assumes the viewer is watching a 45-second reel.

caption_carousel (the "caption_carousel" field): Written for a swipeable carousel. Hook teases the stories inside. Include "Swipe → for the full breakdown" after the hook. After that, describe what's inside — 2-3 sentences on the themes covered. Add "Save this for later 🔖" as a second CTA. Tone is more editorial and educational — you're curating a briefing, not narrating a video.`;

const FINALIZE_OUTPUT_TOOL: Anthropic.Tool = {
  name: "finalize_output",
  description: "Output the final selected story, reel script, carousel data, caption, hashtags and format recommendation after completing your research.",
  input_schema: {
    type: "object" as const,
    properties: {
      selected_story: {
        type: "object",
        properties: {
          headline: { type: "string" },
          source: { type: "string" },
          url: { type: "string" },
        },
        required: ["headline", "source", "url"],
      },
      script: { type: "string", description: "45-second voiceover script, 110-130 words" },
      caption: { type: "string", description: "Reel caption. Hook under 125 chars, watch CTA, engagement question. No hashtags." },
      caption_carousel: { type: "string", description: "Carousel caption. Hook under 125 chars, swipe CTA, save CTA, engagement question. No hashtags." },
      hashtags: { type: "string", description: "Hashtags string, space-separated. Used for both formats." },
      recommended_format: { type: "string", enum: ["reel", "carousel", "both"] },
      format_reason: { type: "string", description: "One sentence explaining the format recommendation" },
      carousel_candidates: {
        type: "array",
        description: "REQUIRED: exactly 3 stories for the carousel, chosen by their 0-based index in the raw stories array. Must never be empty.",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            story_index: { type: "number", description: "0-based index into the raw stories array" },
            reason: { type: "string", description: "One sentence explaining why this story works as a carousel slide" },
          },
          required: ["story_index", "reason"],
        },
      },
    },
    required: ["selected_story", "script", "caption", "caption_carousel", "hashtags", "recommended_format", "format_reason", "carousel_candidates"],
  },
};


type FinalOutput = {
  selected_story: { headline: string; source: string; url: string };
  script: string;
  caption: string;
  caption_carousel: string;
  hashtags: string;
  recommended_format: string;
  format_reason: string;
  carousel_candidates: Array<{ story_index: number; reason: string }>;
};

export async function POST() {
  const pt = { timeZone: "America/Los_Angeles" } as const;
  const dateStr = new Date().toLocaleDateString("en-US", { ...pt, month: "long", day: "numeric", year: "numeric" });

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, raw_stories, seed_story, seed_format")
    .eq("status", "ingested")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "No ingested episode found" }, { status: 404 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPublished } = await supabase
    .from("episodes")
    .select("selected_story")
    .eq("status", "published")
    .gte("created_at", sevenDaysAgo)
    .not("selected_story", "is", null);

  const recentHeadlines = (recentPublished ?? [])
    .map((e) => (e.selected_story as { headline?: string } | null)?.headline)
    .filter(Boolean) as string[];

  const recentBlock = recentHeadlines.length > 0
    ? `\n\nTopics published in the last 7 days — avoid repeating these:\n${recentHeadlines.map((h) => `- ${h}`).join("\n")}`
    : "";

  // Feedback loop: nudge Claude toward the formats/topics that actually performed.
  const insights = await getPerformanceInsights(supabase);
  const performanceBlock = insights.summary
    ? `\n\nPerformance signals from published posts (use these to guide your reel pick and format recommendation):\n${insights.summary}`
    : "";

  // Honor an idea the user explicitly chose from the trending cards.
  const seed = episode.seed_story as { headline?: string; title?: string } | null;
  const seedHeadline = seed?.headline ?? seed?.title ?? null;
  const seedBlock = seedHeadline
    ? `\n\nThe user specifically chose this story for the reel: "${seedHeadline}". Use it as your selected_story unless it is clearly unusable, in which case pick the closest strong alternative.`
    : "";

  // Honor a format the user pre-picked from a news card. Claude still writes the
  // script and carousel candidates so the story_selection gate works either way.
  const seedFormat = (episode.seed_format as string | null) ?? null;
  const seedFormatBlock = seedFormat
    ? `\n\nThe user already chose to make a ${seedFormat}. Recommend "${seedFormat}" as the format and still produce the script and carousel candidates so they can curate.`
    : "";

  type RawStory = { title: string; summary: string; url: string; source: string; published_at: string };
  const rawStories = episode.raw_stories as RawStory[];

  const articleTexts = await Promise.allSettled(rawStories.map((s) => fetchArticleText(s.url)));

  const storiesWithContent = rawStories.map((s, i) => ({
    ...s,
    articleText: articleTexts[i].status === "fulfilled" ? articleTexts[i].value : "",
  }));

  const storiesBlock = storiesWithContent.map((s, i) =>
    `Story ${i}:\nTitle: ${s.title}\nSource: ${s.source}\nURL: ${s.url}\nSummary: ${s.summary}${s.articleText ? `\n\nArticle content:\n${s.articleText}` : ""}`
  ).join("\n\n---\n\n");

  let result: FinalOutput | null = null;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [FINALIZE_OUTPUT_TOOL],
      tool_choice: { type: "any" },
      messages: [
        {
          role: "user",
          content: `Today is ${dateStr}. Here are today's AI news stories with full article content:\n\n${storiesBlock}${recentBlock}${performanceBlock}${seedBlock}${seedFormatBlock}\n\nReview all stories, select the best one for the reel, and call finalize_output with your results.`,
        },
      ],
    });

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "finalize_output") {
        result = block.input as FinalOutput;
        break;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.from("episodes").update({ status: "ingested", error: msg }).eq("id", episode.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!result) {
    await supabase.from("episodes").update({ status: "ingested", error: "Agent did not produce output" }).eq("id", episode.id);
    return NextResponse.json({ error: "Agent did not produce output after max iterations" }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("episodes")
    .update({
      selected_story: result.selected_story,
      script: result.script,
      caption: result.caption,
      caption_carousel: result.caption_carousel,
      hashtags: result.hashtags,
      recommended_format: seedFormat ?? result.recommended_format ?? "reel",
      format_reason: result.format_reason ?? null,
      carousel_candidates: result.carousel_candidates ?? [],
      status: "story_selection",
      error: null,
    })
    .eq("id", episode.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    episode_id: episode.id,
    selected_story: result.selected_story,
    script: result.script,
    recommended_format: result.recommended_format,
    format_reason: result.format_reason,
  });
}
