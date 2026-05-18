import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a research agent and AI news editor for @productbykel — a channel for PMs and AI builders on Instagram.

Your job each day:
1. Review today's AI news stories (headlines + summaries provided)
2. Identify the 2-3 most promising stories for a PM/builder audience
3. Use fetch_article to read the full content of each candidate — always fetch at least 2 stories before deciding
4. Select the single best story for the reel based on: depth of content, relevance to PMs/builders, recency
5. Call finalize_output with all your results

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

Carousel candidates: suggest 3-5 stories from the list (by index) that would work well as carousel slides. The user will make the final selection. Give a brief reason per story (1 sentence) explaining why it's a good carousel candidate.

Caption writing rules (Instagram best practices — applies to both caption fields):
- Line 1 is the hook — must be under 125 characters (the "more" cutoff). Make it a bold claim, surprising stat, or question that demands a tap.
- Use blank lines between paragraphs for readability.
- After the hook, write 3-5 sentences of body content. Explain what happened, why it matters for PMs/builders, and one forward-looking takeaway. Be specific — name the company, product, or number. Do not just repeat the hook.
- End with one engagement question (e.g. "Which story surprised you most? Drop it below 👇").
- Hashtags go in the hashtags field, not in either caption field. 5–8 tightly relevant tags.
- Never use em-dashes or asterisks. Write in second person, conversational tone.
- Target 150-250 words total per caption. Short captions get buried — substance earns saves and shares.

caption_reel (the "caption" field): Written for a video post. Hook teases what the viewer is about to watch. After the hook, summarize what happened and why it matters. CTA is "Watch till the end 👇" or "Sound on 🔊". Assumes the viewer is watching a 45-second reel.

caption_carousel (the "caption_carousel" field): Written for a swipeable carousel. Hook teases the stories inside. Include "Swipe → for the full breakdown" after the hook. After that, describe what's inside — 2-3 sentences on the themes covered. Add "Save this for later 🔖" as a second CTA. Tone is more editorial and educational — you're curating a briefing, not narrating a video.`;

const FETCH_ARTICLE_TOOL: Anthropic.Tool = {
  name: "fetch_article",
  description: "Fetch and read the full text of a news article before deciding which story to cover. Use on your top 2-3 candidates.",
  input_schema: {
    type: "object" as const,
    properties: {
      url: { type: "string", description: "Article URL to fetch" },
    },
    required: ["url"],
  },
};

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
        description: "3-5 stories suggested for the carousel, by index in the raw stories list",
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

async function fetchArticleContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return `[Could not fetch article: HTTP ${res.status}]`;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
    return text || "[Article content empty]";
  } catch {
    return "[Could not fetch article: request failed or timed out]";
  }
}

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
  const today = new Date().toISOString().split("T")[0];

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, raw_stories")
    .eq("scheduled_for", today)
    .eq("status", "ingested")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "No ingested episode found for today" }, { status: 404 });

  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Today is ${dateStr}. Here are today's AI news stories:\n\n${JSON.stringify(episode.raw_stories, null, 2)}\n\nResearch the top candidates then call finalize_output with your results.`,
    },
  ];

  let result: FinalOutput | null = null;
  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [FETCH_ARTICLE_TOOL, FINALIZE_OUTPUT_TOOL],
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      if (block.name === "finalize_output") {
        result = block.input as FinalOutput;
        break;
      }

      if (block.name === "fetch_article") {
        const { url } = block.input as { url: string };
        const content = await fetchArticleContent(url);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content });
      }
    }

    if (result) break;

    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
    }
  }

  if (!result) {
    await supabase.from("episodes").update({ status: "error", error: "Agent did not produce output" }).eq("id", episode.id);
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
      recommended_format: result.recommended_format ?? "reel",
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
