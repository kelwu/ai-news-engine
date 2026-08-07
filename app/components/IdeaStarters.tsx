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

export default function IdeaStarters({ autoLoad = false }: { autoLoad?: boolean }) {
  const [stories, setStories] = useState<RankedStory[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingUrl, setStartingUrl] = useState<string | null>(null);

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

  async function startEpisode(chosen: RankedStory) {
    if (!stories) return;
    setStartingUrl(chosen.url);
    setError(null);
    try {
      const res = await fetch("/api/ideas/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chosen, pool: stories }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Server error (${res.status})`);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start episode");
      setStartingUrl(null);
    }
  }

  if (!autoLoad && stories === null && !loading) {
    return (
      <button
        onClick={load}
        className="bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Show trending ideas
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Trending in AI · idea starters</p>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2">{error}</p>}

      {loading && stories === null && (
        <p className="text-zinc-500 text-sm">Pulling the latest AI stories…</p>
      )}

      {stories && stories.length === 0 && !loading && (
        <p className="text-zinc-500 text-sm">No trending stories right now. Try again shortly.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {stories?.map((s, i) => (
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
            <div className="mt-auto flex items-center justify-between gap-2">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Read source ↗
              </a>
              <button
                onClick={() => startEpisode(s)}
                disabled={startingUrl !== null}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {startingUrl === s.url ? "Starting…" : "Start episode →"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
