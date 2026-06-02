import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fal } from "@fal-ai/client";
import { supabase } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

fal.config({ credentials: process.env.FAL_API_KEY });

const STYLE_SUFFIX =
  "photorealistic, editorial photography, cinematic lighting, ultra sharp, no text, no logos, no faces, 9:16 vertical aspect ratio";

const IMAGE_PROMPT_SYSTEM = `Based on this AI news headline, write 2 photorealistic image generation prompts that visually represent what the story is actually about.

Return a JSON array of exactly 2 prompts:
[0] Wide editorial shot — the physical subject matter (device, chip, robot, server) in a dramatic environment
[1] Cinematic scene — the technology shown in a real-world context or environment

Rules:
- Photorealistic, not abstract
- Literal subject of the story — if about AI chips, show chips; if about a phone, show the device
- No faces, no real people, no logos, no text
- Dramatic cinematic lighting
- Each must end with: "${STYLE_SUFFIX}"

Return only the JSON array, no markdown fences, no explanation.`;

async function ensureStorageBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === "episodes");
  if (!exists) {
    await supabase.storage.createBucket("episodes", { public: true });
  }
}

async function fetchOgImage(articleUrl: string, episodeId: string): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)" },
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Try both attribute orderings
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (!match?.[1]) return null;

    const imgRes = await fetch(match[1]);
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const filePath = `images/${episodeId}_0.jpg`;

    const { error } = await supabase.storage
      .from("episodes")
      .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true });

    if (error) return null;

    const { data } = supabase.storage.from("episodes").getPublicUrl(filePath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

async function generateAndUpload(prompt: string, episodeId: string, index: number): Promise<string> {
  const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
    input: {
      prompt,
      image_size: { width: 1080, height: 1920 },
      num_images: 1,
    },
  });

  const falUrl = (result.data as { images: { url: string }[] }).images[0].url;
  const imgRes = await fetch(falUrl);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const filePath = `images/${episodeId}_${index}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("episodes")
    .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("episodes").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function POST() {
  const { data: episode, error: fetchError } = await supabase
    .from("episodes")
    .select("id, selected_story")
    .eq("status", "scripted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!episode) return NextResponse.json({ error: "No scripted episode found" }, { status: 404 });

  const story = episode.selected_story as { headline: string; url: string };

  const claudeMsg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: `${IMAGE_PROMPT_SYSTEM}\n\nHeadline: ${story.headline}` }],
  });

  const raw = (claudeMsg.content[0] as { type: string; text: string }).text.trim()
    .replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  const imagePrompts: string[] = JSON.parse(raw);

  await ensureStorageBucket();

  const [ogUrl, falUrl1, falUrl2] = await Promise.all([
    fetchOgImage(story.url, episode.id),
    generateAndUpload(imagePrompts[0], episode.id, 1),
    generateAndUpload(imagePrompts[1], episode.id, 2),
  ]);

  // Fall back to a third fal.ai image if og:image fetch failed
  const firstImage = ogUrl ?? await generateAndUpload(imagePrompts[0], episode.id, 0);
  const imageUrls = [firstImage, falUrl1, falUrl2];

  const { error: updateError } = await supabase
    .from("episodes")
    .update({
      image_prompt: imagePrompts[0],
      image_url: imageUrls[0],
      image_urls: imageUrls,
      status: "imaged",
      error: null,
    })
    .eq("id", episode.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true, episode_id: episode.id, image_urls: imageUrls });
}
