import { getSupabaseServer } from "@/lib/supabase-server";
import ApproveButton from "../components/ApproveButton";

export default async function ReviewPage() {
  const supabase = getSupabaseServer();

  const { data: episode } = await supabase
    .from("episodes")
    .select("*")
    .in("status", ["voiced", "rendered", "published"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!episode) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Review</h1>
        <p className="text-zinc-500">No episode ready for review. Run the pipeline first.</p>
      </div>
    );
  }

  const story = episode.selected_story as { headline?: string; source?: string; url?: string } | null;
  const carouselUrls: string[] = episode.carousel_urls ?? [];
  const hasVideo = !!episode.video_url;
  const hasCarousel = carouselUrls.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Review</h1>
        <p className="text-zinc-500 text-sm mt-1">{episode.scheduled_for}</p>
      </div>

      {/* Content summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Story</p>
          <p className="text-white font-medium">{story?.headline}</p>
          {story?.source && <p className="text-zinc-500 text-sm">via {story.source}</p>}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Caption preview</p>
          <p className="text-zinc-300 text-sm leading-relaxed">{episode.caption}</p>
          <p className="text-zinc-600 text-xs">{episode.hashtags}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Script</p>
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{episode.script}</p>
      </div>

      {/* Voiceover */}
      {episode.voiceover_url && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Voiceover</p>
          <audio controls src={episode.voiceover_url} className="w-full" />
        </div>
      )}

      {/* Reel preview */}
      {hasVideo && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Reel preview</p>
            <a
              href={episode.video_url}
              download
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Download ↓
            </a>
          </div>
          <div className="flex justify-center bg-black rounded-lg overflow-hidden">
            <video
              controls
              src={episode.video_url}
              className="max-h-[640px] w-auto"
              style={{ aspectRatio: "9/16" }}
            />
          </div>
        </div>
      )}

      {/* Carousel preview */}
      {hasCarousel && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Carousel slides ({carouselUrls.length})</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {carouselUrls.map((url, i) => (
              <div key={i} className="shrink-0 space-y-2">
                <div className="w-40 h-40 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
                  <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                </div>
                <a
                  href={url}
                  download={`slide-${i + 1}.jpg`}
                  className="block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Slide {i + 1} ↓
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Publish</p>
        <ApproveButton
          episodeId={episode.id}
          status={episode.status}
          recommendedFormat={episode.recommended_format}
          formatReason={episode.format_reason}
          hasVideo={hasVideo}
          hasCarousel={hasCarousel}
        />
      </div>
    </div>
  );
}
