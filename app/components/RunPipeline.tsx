"use client";
import { useState } from "react";

const STEPS = [
  { status: null,       route: "/api/ingest",          label: "Ingest" },
  { status: "ingested", route: "/api/generate-script", label: "Generate script" },
  { status: "scripted", route: "/api/generate-image",  label: "Generate image" },
  { status: "imaged",   route: "/api/voiceover",       label: "Voiceover" },
];

type LogEntry = { text: string; state: "running" | "done" | "skipped" | "error" };

function LogLine({ entry }: { entry: LogEntry }) {
  if (entry.state === "running") {
    return (
      <li className="flex items-center gap-2 text-white">
        <svg className="animate-spin shrink-0 w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span>{entry.text}</span>
      </li>
    );
  }
  if (entry.state === "done") {
    return <li className="flex items-center gap-2 text-emerald-400"><span className="shrink-0">✓</span><span>{entry.text}</span></li>;
  }
  if (entry.state === "skipped") {
    return <li className="flex items-center gap-2 text-zinc-500"><span className="shrink-0">⏭</span><span>{entry.text}</span></li>;
  }
  return <li className="flex items-center gap-2 text-red-400"><span className="shrink-0">✗</span><span>{entry.text}</span></li>;
}

export default function RunPipeline({
  currentStatus,
  recommendedFormat,
  forceNew,
}: {
  currentStatus?: string;
  recommendedFormat?: string;
  forceNew?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  function pushLog(entry: LogEntry) {
    setLog((l) => [...l, entry]);
  }

  async function run() {
    setRunning(true);
    setLog([]);

    const normalizedStatus = currentStatus === "rendering" ? "imaged" : currentStatus;
    const startIndex = forceNew
      ? 0
      : normalizedStatus
      ? STEPS.findIndex((s) => s.status === normalizedStatus)
      : 0;
    const stepsToRun = startIndex >= 0 ? STEPS.slice(startIndex) : STEPS;

    const skipVoiceover = recommendedFormat === "carousel";

    for (const step of stepsToRun) {
      const isSkip = step.route === "/api/voiceover" && skipVoiceover;
      pushLog({ text: isSkip ? "Skipping voiceover (carousel)" : step.label, state: "running" });

      let body: string | undefined;
      if (step.route === "/api/ingest" && forceNew) body = JSON.stringify({ force: true });
      if (step.route === "/api/voiceover" && skipVoiceover) body = JSON.stringify({ skip: true });

      const res = await fetch(step.route, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      const data = await res.json();

      // Replace last "running" entry with result
      setLog((l) => {
        const next = [...l];
        if (!res.ok) {
          next[next.length - 1] = { text: `${step.label}: ${data.error}`, state: "error" };
        } else if (isSkip) {
          next[next.length - 1] = { text: "Voiceover skipped", state: "skipped" };
        } else if (step.route === "/api/generate-script") {
          next[next.length - 1] = { text: "Stories ready — select below", state: "done" };
        } else {
          next[next.length - 1] = { text: step.label, state: "done" };
        }
        return next;
      });

      if (!res.ok) { setRunning(false); return; }
      if (step.route === "/api/generate-script") { setRunning(false); window.location.reload(); return; }
    }

    setRunning(false);
    window.location.reload();
  }

  const label = running
    ? "Running…"
    : forceNew ? "Run pipeline"
    : currentStatus ? "Continue pipeline"
    : "Run pipeline";

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={running}
        className="bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {label}
      </button>
      {log.length > 0 && (
        <ul className="text-xs space-y-1.5 font-mono">
          {log.map((entry, i) => <LogLine key={i} entry={entry} />)}
        </ul>
      )}
    </div>
  );
}
