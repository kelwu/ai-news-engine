"use client";
import { useState } from "react";

type Privacy = "public" | "unlisted" | "private";

export default function DistributeButtons({
  episodeId,
  hasVideo,
  youtubeUrl,
  linkedinUrl,
}: {
  episodeId: string;
  hasVideo: boolean;
  youtubeUrl: string | null;
  linkedinUrl: string | null;
}) {
  if (!hasVideo) {
    return <p className="text-zinc-600 text-sm">Render the reel first to enable distribution.</p>;
  }

  return (
    <div className="space-y-3">
      <YouTubeRow episodeId={episodeId} postedUrl={youtubeUrl} />
      <LinkedInRow episodeId={episodeId} postedUrl={linkedinUrl} />
    </div>
  );
}

function ChannelRow({
  icon,
  iconColor,
  label,
  postedUrl,
  children,
}: {
  icon: string;
  iconColor: string;
  label: string;
  postedUrl: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className={`${iconColor} text-lg leading-none`}>{icon}</span>
        <span className="text-white text-sm font-medium">{label}</span>
      </div>
      {postedUrl ? (
        <a
          href={postedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Posted ✓ ↗
        </a>
      ) : (
        children
      )}
    </div>
  );
}

function YouTubeRow({ episodeId, postedUrl }: { episodeId: string; postedUrl: string | null }) {
  const [privacy, setPrivacy] = useState<Privacy>("unlisted");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState<string | null>(postedUrl);

  async function post() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/publish-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: episodeId, privacy }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "YouTube upload failed");
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "YouTube upload failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <ChannelRow icon="▶" iconColor="text-red-500" label="YouTube Shorts" postedUrl={url}>
        <div className="flex items-center gap-2">
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as Privacy)}
            disabled={running}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
          <button
            onClick={post}
            disabled={running}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors text-sm"
          >
            {running ? "Uploading…" : "Post to Shorts"}
          </button>
        </div>
      </ChannelRow>
      {error && <p className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2">{error}</p>}
    </>
  );
}

function LinkedInRow({ episodeId, postedUrl }: { episodeId: string; postedUrl: string | null }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState<string | null>(postedUrl);

  async function post() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/publish-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: episodeId }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "LinkedIn post failed");
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "LinkedIn post failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <ChannelRow icon="in" iconColor="text-blue-400 text-sm font-bold" label="LinkedIn" postedUrl={url}>
        <button
          onClick={post}
          disabled={running}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors text-sm"
        >
          {running ? "Posting…" : "Post to LinkedIn"}
        </button>
      </ChannelRow>
      {error && <p className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2">{error}</p>}
    </>
  );
}
