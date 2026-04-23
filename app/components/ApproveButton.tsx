"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Format = "reel" | "carousel" | "both";

const DEFAULT_CLOSING = `Follow @productbykel for your daily Tech Brief

📺 YouTube: youtube.com/@productbykel
🎵 TikTok: @productbykel`;

export default function ApproveButton({
  episodeId,
  status,
  recommendedFormat,
  formatReason,
  hasVideo,
  hasCarousel,
}: {
  episodeId: string;
  status: string;
  recommendedFormat?: string;
  formatReason?: string;
  hasVideo: boolean;
  hasCarousel: boolean;
}) {
  const defaultFormat = (recommendedFormat as Format) ?? "reel";
  const [format, setFormat] = useState<Format>(defaultFormat);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState("");
  const [error, setError] = useState("");
  const [closingCaption, setClosingCaption] = useState(DEFAULT_CLOSING);
  const router = useRouter();

  const assetsExist =
    (format === "reel" && hasVideo) ||
    (format === "carousel" && hasCarousel) ||
    (format === "both" && hasVideo && hasCarousel);

  const isPublished = status === "published";

  async function renderPreview() {
    setRunning(true);
    setError("");

    if (format === "reel" || format === "both") {
      setLog("Rendering reel…");
      const res = await fetch("/api/render", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reel render failed");
        setRunning(false);
        return;
      }
    }

    if (format === "carousel" || format === "both") {
      setLog("Rendering carousel…");
      const res = await fetch("/api/render-carousel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Carousel render failed");
        setRunning(false);
        return;
      }
    }

    setLog("");
    setRunning(false);
    router.refresh();
  }

  async function publish() {
    setRunning(true);
    setError("");
    setLog("Publishing…");
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episode_id: episodeId, format, closing_caption: closingCaption }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Publish failed");
    } else {
      router.refresh();
    }
    setLog("");
    setRunning(false);
  }

  if (isPublished) {
    return <p className="text-emerald-400 font-semibold text-sm">Published to Instagram ✓</p>;
  }

  return (
    <div className="space-y-4">
      {/* Claude recommendation */}
      {recommendedFormat && formatReason && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-3">
          <p className="text-xs mb-0.5">
            <span className="text-blue-400 font-medium">✦ Claude recommends:</span>{" "}
            <span className="text-white font-semibold capitalize">{recommendedFormat}</span>
          </p>
          <p className="text-xs text-zinc-500">{formatReason}</p>
        </div>
      )}

      {/* Format selector */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Format</p>
        <div className="flex gap-2">
          {(["reel", "carousel", "both"] as Format[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              disabled={running}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                format === f ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {f === "reel" ? "Reel" : f === "carousel" ? "Carousel" : "Both"}
            </button>
          ))}
        </div>
      </div>

      {!assetsExist ? (
        /* Phase 1: Render */
        <button
          onClick={renderPreview}
          disabled={running}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          {running ? log || "Rendering…" : "Render Preview"}
        </button>
      ) : (
        /* Phase 2: Publish */
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 uppercase tracking-wider block">
              Closing caption (appended to every post)
            </label>
            <textarea
              value={closingCaption}
              onChange={(e) => setClosingCaption(e.target.value)}
              rows={5}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={publish}
              disabled={running}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              {running ? log || "Publishing…" : "Publish to Instagram"}
            </button>
            <button
              onClick={renderPreview}
              disabled={running}
              className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              Re-render
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2">{error}</p>}
    </div>
  );
}
