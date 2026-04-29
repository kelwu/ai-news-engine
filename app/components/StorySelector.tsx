"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type RawStory = { title: string; summary: string; url: string; source: string; published_at: string };
type Candidate = { story_index: number; reason: string };
type Format = "reel" | "carousel" | "both";

const FORMAT_LABELS: Record<Format, string> = {
  reel: "Reel",
  carousel: "Carousel",
  both: "Both",
};

export default function StorySelector({
  episodeId,
  stories,
  candidates,
  defaultSelected,
  recommendedFormat,
}: {
  episodeId: string;
  stories: RawStory[];
  candidates: Candidate[];
  defaultSelected: number[];
  recommendedFormat?: string;
}) {
  const [format, setFormat] = useState<Format>((recommendedFormat as Format) ?? "carousel");
  const [selected, setSelected] = useState<Set<number>>(new Set(defaultSelected.slice(0, 3)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const needsCarousel = format === "carousel" || format === "both";
  const requiredCount = needsCarousel ? 3 : 0;

  const candidateMap = new Map(candidates.map((c) => [c.story_index, c.reason]));

  function toggle(index: number) {
    if (!needsCarousel) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (next.size >= 3) return prev;
        next.add(index);
      }
      return next;
    });
  }

  function handleFormatChange(f: Format) {
    setFormat(f);
  }

  const canConfirm = format === "reel" || selected.size === 3;

  async function confirm() {
    if (!canConfirm) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/confirm-stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episode_id: episodeId,
        selected_indices: needsCarousel ? [...selected] : [],
        format,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to confirm");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Format picker */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Output format</p>
        <div className="flex gap-2">
          {(["reel", "carousel", "both"] as Format[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFormatChange(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                format === f
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
        {format === "reel" && (
          <p className="text-sm text-zinc-500 mt-2">
            Using Claude&apos;s top pick — no story selection needed.
          </p>
        )}
      </div>

      {/* Story selector (carousel/both only) */}
      {needsCarousel && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-base text-zinc-300">
              <span className={selected.size === 3 ? "text-emerald-400 font-bold" : "text-white font-bold"}>
                {selected.size}/3
              </span>{" "}
              stories selected
              {selected.size < 3 && (
                <span className="text-zinc-500"> — pick {3 - selected.size} more</span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            {stories.map((story, i) => {
              const isSelected = selected.has(i);
              const isClaude = candidateMap.has(i);
              const reason = candidateMap.get(i);
              const isDisabled = !isSelected && selected.size >= 3;

              return (
                <div
                  key={i}
                  onClick={() => !isDisabled && toggle(i)}
                  className={`rounded-xl border p-5 cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-950/30"
                      : isDisabled
                      ? "border-zinc-800 bg-zinc-900/50 opacity-40 cursor-not-allowed"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1 w-6 h-6 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors ${
                        isSelected ? "bg-blue-500 border-blue-500" : "border-zinc-500 bg-zinc-800"
                      }`}
                    >
                      {isSelected && (
                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                          <path
                            d="M1 4.5l3.5 3.5 6.5-7"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={`text-base font-semibold leading-snug ${
                            isSelected ? "text-white" : "text-zinc-100"
                          }`}
                        >
                          {story.title}
                        </p>
                        {isClaude && (
                          <span className="text-sm text-blue-400 font-semibold shrink-0 mt-0.5">
                            ✦ Claude pick
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5">
                        <a
                          href={story.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-zinc-400 hover:text-blue-400 font-medium transition-colors"
                        >
                          {story.source} →
                        </a>
                        <span className="text-zinc-600 text-sm">·</span>
                        <span className="text-sm text-zinc-500">
                          {new Date(story.published_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      {story.summary && (
                        <p className="text-sm text-zinc-400 mt-2 leading-relaxed line-clamp-2">
                          {story.summary}
                        </p>
                      )}

                      {reason && (
                        <p className="text-sm text-blue-400/80 mt-2 italic">&ldquo;{reason}&rdquo;</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={confirm}
        disabled={!canConfirm || loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors"
      >
        {loading
          ? format === "reel"
            ? "Saving…"
            : "Generating carousel…"
          : format === "reel"
          ? "Confirm — Reel Only"
          : format === "both"
          ? "Confirm — Generate Both"
          : "Confirm — Generate Carousel"}
      </button>
    </div>
  );
}
