"use client";
import { useCallback, useEffect, useState } from "react";

type RankedStory = {
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  score: number;
  reason: string;
  source_count: number;
};

// Which action is mid-flight for a given card, so we can show per-button spinners.
type Pending = { url: string; action: "carousel" | "reel" | "brief" } | null;

export default function NewsFeed({ autoLoad = false }: { autoLoad?: boolean }) {
  const [stories, setStories] = useState<RankedStory[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trending");
      const data = (await res.json().catch(() => ({}))) as { stories?: RankedStory[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Server error (${res.status})`);
      setStories(data.stories ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trending stories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) load();
  }, [autoLoad, load]);

  async function startEpisode(chosen: RankedStory, format: "carousel" | "reel") {
    if (!stories) return;
    setPending({ url: chosen.url, action: format });
    setError(null);
    try {
      const res = await fetch("/api/ideas/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chosen, pool: stories, format }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Server error (${res.status})`);
      window.location.href = "/"; // land on the cockpit to continue the pipeline
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start episode");
      setPending(null);
    }
  }

  async function makeBrief(chosen: RankedStory) {
    setPending({ url: chosen.url, action: "brief" });
    setError(null);
    try {
      const res = await fetch("/api/briefs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chosen }),
      });
      const data = (await res.json().catch(() => ({}))) as { brief_id?: string; error?: string };
      if (!res.ok || !data.brief_id) throw new Error(data.error ?? `Server error (${res.status})`);
      window.location.href = `/briefs/${data.brief_id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate brief");
      setPending(null);
    }
  }

  if (!autoLoad && stories === null && !loading) {
    return (
      <button
        onClick={load}
        className="bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Show trending news
      </button>
    );
  }

  const busy = pending !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Trending in AI</p>
        <button
          onClick={load}
          disabled={loading || busy}
          className="text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2">{error}</p>}

      {loading && stories === null && <p className="text-zinc-500 text-sm">Pulling the latest AI stories…</p>}

      {stories && stories.length === 0 && !loading && (
        <p className="text-zinc-500 text-sm">No trending stories right now. Try again shortly.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {stories?.map((s, i) => {
          const p = pending?.url === s.url ? pending.action : null;
          return (
            <div key={s.url} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium leading-snug">{s.title}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {s.source}
                    {s.source_count > 1 && <span className="text-amber-400"> · 🔥 hot</span>}
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed">{s.reason}</p>

              <div className="mt-auto space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => startEpisode(s, "carousel")}
                    disabled={busy}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {p === "carousel" ? "…" : "Carousel"}
                  </button>
                  <button
                    onClick={() => startEpisode(s, "reel")}
                    disabled={busy}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {p === "reel" ? "…" : "Reel"}
                  </button>
                  <button
                    onClick={() => makeBrief(s)}
                    disabled={busy}
                    className="bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {p === "brief" ? "…" : "My reel"}
                  </button>
                </div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Read source ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
