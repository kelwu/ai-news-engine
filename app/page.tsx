import { getSupabaseServer } from "@/lib/supabase-server";
import RunPipeline from "./components/RunPipeline";
import StorySelector from "./components/StorySelector";

export const dynamic = 'force-dynamic';

type Candidate = { story_index: number; reason: string };
type RawStory = { title: string; summary: string; url: string; source: string; published_at: string };

const PIPELINE_STEPS = ["ingested", "story_selection", "scripted", "imaged", "voiced", "rendered", "published"];
const STEP_LABELS: Record<string, string> = { story_selection: "select stories" };

function StatusStep({ step, current, error }: { step: string; current: string; error?: string | null }) {
  const ci = PIPELINE_STEPS.indexOf(current);
  const si = PIPELINE_STEPS.indexOf(step);
  const done = ci > si;
  const active = current === step;
  const isError = error && active;
  const label = STEP_LABELS[step] ?? step;

  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        isError ? "bg-red-500 text-white" : done ? "bg-emerald-500 text-white" : active ? "bg-blue-500 text-white" : "bg-zinc-800 text-zinc-500"
      }`}>
        {isError ? "!" : done ? "✓" : si + 1}
      </div>
      <span className={`text-sm capitalize ${done || active ? "text-white" : "text-zinc-500"}`}>{label}</span>
    </div>
  );
}

export default async function Home() {
  const supabase = getSupabaseServer();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

  const { data: episode } = await supabase
    .from("episodes")
    .select("*")
    .eq("scheduled_for", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const story = episode?.selected_story as { headline?: string; source?: string } | null;
  const canContinue = episode && !["story_selection", "voiced", "rendering", "rendered", "published"].includes(episode.status);

  const rawStories = (episode?.raw_stories ?? []) as RawStory[];
  const candidates = (episode?.carousel_candidates ?? []) as Candidate[];
  const defaultSelected = candidates.slice(0, 3).map((c) => c.story_index);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Today&apos;s Episode</h1>
          <p className="text-zinc-500 text-sm mt-1">{today}</p>
        </div>
        <RunPipeline forceNew />
      </div>

      {!episode ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-4">
          <p className="text-zinc-400">No episode yet for today.</p>
          <RunPipeline />
        </div>
      ) : (
        <div className="space-y-4">
          {story?.headline && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Reel story</p>
              <p className="text-white font-medium">{story.headline}</p>
              {story.source && <p className="text-zinc-500 text-sm mt-1">via {story.source}</p>}
            </div>
          )}

          {episode.script && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Script preview</p>
              <p className="text-zinc-300 text-sm leading-relaxed line-clamp-4">{episode.script}</p>
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Pipeline</p>
            {PIPELINE_STEPS.map((step) => (
              <StatusStep key={step} step={step} current={episode.status} error={episode.error} />
            ))}
            {episode.error && (
              <p className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2">{episode.error}</p>
            )}
          </div>

          {/* Inline story selector */}
          {episode.status === "story_selection" && (
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

          {/* Ready to review */}
          {["voiced", "rendered", "published"].includes(episode.status) && (
            <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Ready to review</p>
                <p className="text-zinc-400 text-sm">Preview and publish your content.</p>
              </div>
              <a href="/review" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Review →
              </a>
            </div>
          )}

          {canContinue && (
            <RunPipeline
              currentStatus={episode.status}
              recommendedFormat={episode.recommended_format ?? undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
