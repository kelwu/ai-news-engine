"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { status: null, route: "/api/ingest", label: "Ingest" },
  { status: "ingested", route: "/api/generate-script", label: "Generate script" },
  { status: "scripted", route: "/api/generate-image", label: "Generate image" },
  { status: "imaged", route: "/api/voiceover", label: "Voiceover" },
];

export default function RunPipeline({ currentStatus }: { currentStatus?: string }) {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const router = useRouter();

  async function run() {
    setRunning(true);
    setLog([]);
    const normalizedStatus = currentStatus === "rendering" ? "imaged" : currentStatus;
    const startIndex = normalizedStatus
      ? STEPS.findIndex((s) => s.status === normalizedStatus)
      : 0;
    const stepsToRun = startIndex >= 0 ? STEPS.slice(startIndex) : STEPS;

    for (const step of stepsToRun) {
      setLog((l) => [...l, `Running ${step.label}...`]);
      const res = await fetch(step.route, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setLog((l) => [...l, `✗ ${step.label} failed: ${data.error}`]);
        setRunning(false);
        return;
      }
      setLog((l) => [...l, `✓ ${step.label} done`]);
    }
    setRunning(false);
    router.refresh();
  }

  const label = currentStatus
    ? "Run pipeline"
    : "Run full pipeline";

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={running}
        className="bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {running ? "Running…" : label}
      </button>
      {log.length > 0 && (
        <ul className="text-xs text-zinc-400 space-y-1 font-mono">
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}
    </div>
  );
}
