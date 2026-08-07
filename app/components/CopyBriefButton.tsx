"use client";
import { useState } from "react";

// Copies the plain-text brief to the clipboard so Kel can paste it into a
// teleprompter/notes app on his phone. Reuses the SyncButton state-toggle feel.
export default function CopyBriefButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  const label = { idle: "Copy brief", done: "Copied ✓", error: "Copy failed" }[state];
  const cls = {
    idle: "bg-zinc-100 text-zinc-900 hover:bg-white",
    done: "bg-emerald-500/20 text-emerald-400",
    error: "bg-red-500/20 text-red-400",
  }[state];

  return (
    <button onClick={copy} className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${cls}`}>
      {label}
    </button>
  );
}
