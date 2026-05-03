"use client";
import { useState } from "react";

export default function MetricsRefreshButton({ episodeId }: { episodeId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/fetch-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: episodeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
      } else {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={refresh}
        disabled={loading}
        className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
      >
        {loading ? "Fetching…" : "Refresh"}
      </button>
      {error && <span className="text-red-400 text-xs ml-2">{error}</span>}
    </div>
  );
}
