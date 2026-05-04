"use client";
import { useState } from "react";

type Format = "reel" | "carousel" | "both";
type PublishMode = "now" | "schedule";

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
  scheduledAt,
  scheduledFormat,
  savedClosingCaption,
}: {
  episodeId: string;
  status: string;
  recommendedFormat?: string;
  formatReason?: string;
  hasVideo: boolean;
  hasCarousel: boolean;
  scheduledAt: string | null;
  scheduledFormat: string | null;
  savedClosingCaption: string | null;
}) {
  const defaultFormat = (recommendedFormat as Format) ?? "reel";
  const [format, setFormat] = useState<Format>((scheduledFormat as Format) ?? defaultFormat);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState("");
  const [error, setError] = useState("");
  const [closingCaption, setClosingCaption] = useState(savedClosingCaption ?? DEFAULT_CLOSING);
  const [captionSaved, setCaptionSaved] = useState(false);
  const [mode, setMode] = useState<PublishMode>("now");
  const [scheduleTime, setScheduleTime] = useState("");
  const [currentSchedule, setCurrentSchedule] = useState<string | null>(scheduledAt);

  const assetsExist =
    status === "rendered" ||
    status === "published" ||
    (format === "reel" && hasVideo) ||
    (format === "carousel" && hasCarousel) ||
    (format === "both" && hasVideo && hasCarousel);

  const isPublished = status === "published";

  async function renderPreview() {
    setRunning(true);
    setError("");
    try {
      if (format === "reel" || format === "both") {
        setLog("Rendering reel…");
        const res = await fetch("/api/render", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? `Reel render failed (${res.status})`);
          return;
        }
      }

      if (format === "carousel" || format === "both") {
        setLog("Rendering carousel…");
        const res = await fetch("/api/render-carousel", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? `Carousel render failed (${res.status})`);
          return;
        }
      }

      setLog("");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render failed — check console");
    } finally {
      setRunning(false);
    }
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
      window.location.reload();
    }
    setLog("");
    setRunning(false);
  }

  async function schedulePost() {
    if (!scheduleTime) { setError("Pick a date and time first"); return; }
    setRunning(true);
    setError("");
    setLog("Scheduling…");
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episode_id: episodeId,
        scheduled_publish_at: new Date(scheduleTime).toISOString(),
        format,
        closing_caption: closingCaption,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Schedule failed");
    } else {
      setCurrentSchedule(new Date(scheduleTime).toISOString());
      window.location.reload();
    }
    setLog("");
    setRunning(false);
  }

  async function cancelSchedule() {
    setRunning(true);
    setError("");
    const res = await fetch("/api/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episode_id: episodeId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Cancel failed");
    } else {
      setCurrentSchedule(null);
      setScheduleTime("");
      window.location.reload();
    }
    setRunning(false);
  }

  async function saveCaption() {
    setRunning(true);
    const res = await fetch("/api/save-closing-caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episode_id: episodeId, closing_caption: closingCaption }),
    });
    if (res.ok) {
      setCaptionSaved(true);
      setTimeout(() => setCaptionSaved(false), 2000);
    } else {
      const data = await res.json();
      setError(data.error ?? "Save failed");
    }
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
        /* Phase 2: Publish or Schedule */
        <div className="space-y-4">
          {/* Closing caption */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-500 uppercase tracking-wider">
                Closing caption (appended to every post)
              </label>
              <button
                onClick={saveCaption}
                disabled={running}
                className="text-xs text-zinc-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                {captionSaved ? "✓ Saved" : "Save"}
              </button>
            </div>
            <textarea
              value={closingCaption}
              onChange={(e) => { setClosingCaption(e.target.value); setCaptionSaved(false); }}
              rows={5}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>

          {/* Scheduled indicator */}
          {currentSchedule && (
            <div className="flex items-center justify-between rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3">
              <div>
                <p className="text-xs text-amber-400 font-medium">Scheduled</p>
                <p className="text-sm text-amber-200 mt-0.5">
                  {new Date(currentSchedule).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  {" · "}{scheduledFormat ?? format}
                </p>
              </div>
              <button
                onClick={cancelSchedule}
                disabled={running}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2">
            {(["now", "schedule"] as PublishMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={running}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mode === m ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {m === "now" ? "Publish Now" : "Schedule"}
              </button>
            ))}
          </div>

          {mode === "now" ? (
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
          ) : (
            <div className="flex gap-3 items-center">
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                disabled={running}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
              />
              <button
                onClick={schedulePost}
                disabled={running || !scheduleTime}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                {running ? log || "Scheduling…" : currentSchedule ? "Reschedule" : "Schedule Post"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2">{error}</p>}
    </div>
  );
}
