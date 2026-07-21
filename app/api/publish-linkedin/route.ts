import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { createTextPost } from "@/lib/linkedin";
import { HUMANIZER_RULES } from "@/lib/voice";

export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// LinkedIn posts want a different shape than an IG caption: no "watch till the end",
// a text-first hook, and a lighter touch on hashtags. We write it fresh per post so the
// copy is LinkedIn-native rather than a repurposed reel caption.
async function writeLinkedInPost(input: {
  headline: string;
  source: string;
  url: string;
  script: string;
  hashtags: string;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Write a LinkedIn post for @productbykel, a channel for PMs and AI builders, about this AI news story.

${HUMANIZER_RULES}

LinkedIn format:
- First line is a scroll-stopping hook: a specific claim, number, or question. No "watch till the end" — this is a text post, not a video teaser.
- 2 to 4 short paragraphs (single or double sentences, blank line between them). Explain what happened and the concrete implication for PMs or builders. Use specifics from the story.
- End with one genuine question to the reader.
- Then the source on its own line: "Source: ${input.source} — ${input.url}"
- Then 3 to 5 relevant hashtags on the final line.
- Total length 600 to 1200 characters. Return ONLY the post text, nothing else.

Story: ${input.headline}
Reel script for context: ${input.script}
Candidate hashtags: ${input.hashtags}`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

export async function POST(req: NextRequest) {
  const { episode_id } = await req.json();

  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, selected_story, script, hashtags, linkedin_post_id")
    .eq("id", episode_id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  if (episode.linkedin_post_id) return NextResponse.json({ error: "Already posted to LinkedIn" }, { status: 409 });

  const story = (episode.selected_story ?? {}) as { headline?: string; source?: string; url?: string };

  try {
    const commentary = await writeLinkedInPost({
      headline: story.headline ?? "AI News",
      source: story.source ?? "",
      url: story.url ?? "",
      script: episode.script ?? "",
      hashtags: episode.hashtags ?? "",
    });

    const { id, url } = await createTextPost(commentary);

    await supabase
      .from("episodes")
      .update({ linkedin_post_id: id, linkedin_url: url, error: null })
      .eq("id", episode_id);

    await supabase.from("content_posts").upsert(
      {
        platform: "linkedin",
        platform_id: id,
        title: story.headline ?? null,
        caption: commentary.slice(0, 500),
        permalink: url,
        published_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      },
      { onConflict: "platform_id" }
    );

    return NextResponse.json({ success: true, post_id: id, url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LinkedIn publish failed";
    await supabase.from("episodes").update({ error: msg }).eq("id", episode_id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
