import { getSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import StorySelector from "../../components/StorySelector";
import RunPipeline from "../../components/RunPipeline";

export const dynamic = "force-dynamic";

type RawStory = { title: string; summary: string; url: string; source: string; published_at: string };
type Candidate = { story_index: number; reason: string };

const PIPELINE_STEPS = ["ingested", "story_selection", "scripted", "imaged", "voiced", "rendered", "published"];

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServer();

  const { data: episode } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!episode) notFound();

  const story = episode.selected_story as { headline?: string; source?: string } | null;
  const rawStories = (episode.raw_stories ?? []) as RawStory[];
  const candidates = (episode.carousel_candidates ?? []) as Candidate[];
  const defaultSelected = candidates.slice(0, 3).map((c) => c.story_index);

  const canContinue = !["story_selection", "voiced", "rendering", "rendered", "published"].includes(episode.status);

  return (
    <div className="space-y-6">
      <Link href="/episodes" className="text-zinc-500 hover:text-zinc-300 text-sm inline-block">
        ← Episodes
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{episode.scheduled_for}</h1>
          <p className="text-zinc-500 text-sm mt-1 capitalize">{episode.status}</p>
        </div>
      </div>

      {story?.headline && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Reel story</p>
          <p className="text-white font-medium">{story.headline}</p>
          {story.source && <p className="text-zinc-500 text-sm mt-1">via {story.source}</p>}
        </div>
      )}

      {episode.script && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Script</p>
          <p className="text-zinc-300 text-sm leading-relaxed">{episode.script}</p>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Pipeline</p>
        {PIPELINE_STEPS.map((step) => {
          const ci = PIPELINE_STEPS.indexOf(episode.status);
          const si = PIPELINE_STEPS.indexOf(step);
          const done = ci > si;
          const active = episode.status === step;
          const isError = episode.error && active;
          return (
            <div key={step} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                isError ? "bg-red-500 text-white" : done ? "bg-emerald-500 text-white" : active ? "bg-blue-500 text-white" : "bg-zinc-800 text-zinc-500"
              }`}>
                {isError ? "!" : done ? "✓" : si + 1}
              </div>
              <span className={`text-sm capitalize ${done || active ? "text-white" : "text-zinc-500"}`}>{step.replace("_", " ")}</span>
            </div>
          );
        })}
        {episode.error && (
          <p className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2">{episode.error}</p>
        )}
      </div>

      {episode.status === "story_selection" && rawStories.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div>
            <p className="text-white font-medium">Curate today&apos;s content</p>
            <p className="text-zinc-400 text-sm mt-0.5">
              Claude pre-selected stories and a format — override anything before confirming.
            </p>
          </div>
          <StorySelector
            episodeId={episode.id}
            stories={rawStories}
            candidates={candidates}
            defaultSelected={defaultSelected}
            recommendedFormat={episode.recommended_format ?? "carousel"}
          />
        </div>
      )}

      {["voiced", "rendered", "published"].includes(episode.status) && (
        <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-5 flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Ready to review</p>
            <p className="text-zinc-400 text-sm">Preview and publish your content.</p>
          </div>
          <Link href="/review" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Review →
          </Link>
        </div>
      )}

      {canContinue && (
        <RunPipeline
          currentStatus={episode.status}
          recommendedFormat={episode.recommended_format ?? undefined}
        />
      )}
    </div>
  );
}
