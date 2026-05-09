"use client";
import { useState } from "react";

export default function ClosingCaptionSetting({ initial }: { initial: string | null }) {
  const DEFAULT = `Follow @productbykel for your daily Tech Brief

📺 YouTube: youtube.com/@productbykel
🎵 TikTok: @productbykel`;

  const [value, setValue] = useState(initial ?? DEFAULT);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setStatus("saving");
    const res = await fetch("/api/settings/closing-caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Closing caption</p>
          <p className="text-zinc-500 text-xs">Appended to every Instagram post. Editable per-post on the Review page.</p>
        </div>
        <button
          onClick={save}
          disabled={status === "saving"}
          className="text-xs text-zinc-400 hover:text-white disabled:opacity-50 transition-colors shrink-0 ml-4"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "✓ Saved" : status === "error" ? "Error" : "Save"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setStatus("idle"); }}
        rows={5}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-500 font-mono"
      />
    </div>
  );
}
