"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSync() {
    setState("loading");
    try {
      const res = await fetch("/api/sync-content");
      if (!res.ok) throw new Error("Sync failed");
      setState("done");
      router.refresh();
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const label = { idle: "Sync now", loading: "Syncing…", done: "Synced!", error: "Failed" }[state];
  const cls = {
    idle:    "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
    loading: "bg-zinc-800 text-zinc-500 cursor-not-allowed",
    done:    "bg-emerald-500/20 text-emerald-400",
    error:   "bg-red-500/20 text-red-400",
  }[state];

  return (
    <button
      onClick={handleSync}
      disabled={state === "loading"}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${cls}`}
    >
      {label}
    </button>
  );
}
