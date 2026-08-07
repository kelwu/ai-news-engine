import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { HUMANIZER_RULES } from "@/lib/voice";
import { fetchArticleText, type Story } from "@/lib/news";

export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a content strategist for @productbykel, a channel for PMs and AI builders.

${HUMANIZER_RULES}

Kel is going to film a short vertical reel on his phone himself, reading from your brief. Write a brief he can shoot from directly. It should be punchy, specific, and easy to deliver on camera.

- hook: the first line he says on camera. One sentence, under 15 words, creates curiosity or stakes. Lead with the concrete specific (a number, a name, a product).
- angle: one or two sentences on why this matters for PMs or builders specifically. The take, not a summary.
- talking_points: 3 to 5 short beats to hit, in order. Each is a phrase or short sentence he can glance at, not a paragraph. This is the spine of the reel.
- key_facts: 2 to 4 concrete facts to cite on camera (numbers, company names, dates, benchmarks). Short strings.
- cta: the closing line he says to drive engagement (a question or a save/follow prompt). One sentence.
- visual_idea: one optional suggestion for a shot, screen recording, or b-roll that would make the reel stronger. One sentence.

Call generate_brief with your results.`;

const GENERATE_BRIEF_TOOL: Anthropic.Tool = {
  name: "generate_brief",
  description: "Output a shootable reel brief the creator will film himself.",
  input_schema: {
    type: "object" as const,
    properties: {
      hook: { type: "string", description: "First on-camera line, under 15 words" },
      angle: { type: "string", description: "Why it matters for PMs/builders — the take, 1-2 sentences" },
      talking_points: {
        type: "array",
        description: "3-5 short beats to hit, in order",
        minItems: 3,
        maxItems: 5,
        items: { type: "string" },
      },
      key_facts: {
        type: "array",
        description: "2-4 concrete facts to cite (numbers, names, dates)",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
      },
      cta: { type: "string", description: "Closing on-camera line to drive engagement" },
      visual_idea: { type: "string", description: "One shot/b-roll/screen-recording suggestion" },
    },
    required: ["hook", "angle", "talking_points", "key_facts", "cta", "visual_idea"],
  },
};

type BriefOutput = {
  hook: string;
  angle: string;
  talking_points: string[];
  key_facts: string[];
  cta: string;
  visual_idea: string;
};

export async function POST(req: Request) {
  let body: { chosen?: Story };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const chosen = body.chosen;
  if (!chosen?.title || !chosen?.url) {
    return NextResponse.json({ error: "Missing chosen story" }, { status: 400 });
  }

  const articleText = await fetchArticleText(chosen.url);

  let result: BriefOutput | null = null;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [GENERATE_BRIEF_TOOL],
      tool_choice: { type: "any" },
      messages: [
        {
          role: "user",
          content: `Story to turn into a shoot brief:\nTitle: ${chosen.title}\nSource: ${chosen.source}\nURL: ${chosen.url}\nSummary: ${chosen.summary}${articleText ? `\n\nArticle content:\n${articleText}` : ""}\n\nWrite the brief and call generate_brief.`,
        },
      ],
    });

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "generate_brief") {
        result = block.input as BriefOutput;
        break;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!result) {
    return NextResponse.json({ error: "Claude did not produce a brief" }, { status: 500 });
  }

  const { data: brief, error } = await supabase
    .from("content_briefs")
    .insert({
      story: chosen,
      hook: result.hook,
      angle: result.angle,
      talking_points: result.talking_points,
      key_facts: result.key_facts,
      cta: result.cta,
      visual_idea: result.visual_idea,
      status: "new",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, brief_id: brief.id });
}
