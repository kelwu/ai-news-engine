import { getSupabaseServer } from "@/lib/supabase-server";
import StorySelector from "../components/StorySelector";

export default async function SelectPage() {
  const supabase = getSupabaseServer();

  const { data: episode } = await supabase
    .from("episodes")
    .select("id, raw_stories, carousel_candidates, recommended_format, format_reason, selected_story, script")
    .eq("status", "story_selection")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!episode) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Select Stories</h1>
        <p className="text-zinc-500">No episode waiting for story selection.</p>
      </div>
    );
  }

  type RawStory = { title: string; summary: string; url: string; source: string; published_at: string };
  type Candidate = { story_index: number; reason: string };

  const rawStories = (episode.raw_stories ?? []) as RawStory[];
  const candidates = (episode.carousel_candidates ?? []) as Candidate[];
  const candidateIndices = candidates.map((c) => c.story_index);
  const selectedStory = episode.selected_story as { headline?: string; source?: string } | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Select Carousel Stories</h1>
        <p className="text-zinc-500 text-sm mt-1">Pick exactly 3 stories for today's Tech Brief carousel.</p>
      </div>

      {/* Reel context */}
      {selectedStory?.headline && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Reel story (already locked in)</p>
            <p className="text-zinc-300 text-sm font-medium">{selectedStory.headline}</p>
            {selectedStory.source && <p className="text-zinc-500 text-xs mt-0.5">via {selectedStory.source}</p>}
          </div>
        </div>
      )}

      {/* Format recommendation */}
      {episode.recommended_format && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-3">
          <p className="text-xs mb-0.5">
            <span className="text-blue-400 font-medium">✦ Claude recommends:</span>{" "}
            <span className="text-white font-semibold capitalize">{episode.recommended_format}</span>
          </p>
          {episode.format_reason && <p className="text-xs text-zinc-500">{episode.format_reason}</p>}
        </div>
      )}

      <StorySelector
        episodeId={episode.id}
        stories={rawStories}
        candidates={candidates}
        defaultSelected={candidateIndices.slice(0, 3)}
      />
    </div>
  );
}
