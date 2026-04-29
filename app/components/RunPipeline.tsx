"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { status: null,       route: "/api/ingest",          label: "Ingest" },
  { status: "ingested", route: "/api/generate-script", label: "Generate script" },
  { status: "scripted", route: "/api/generate-image",  label: "Generate image" },
  { status: "imaged",   route: "/api/voiceover",       label: "Voiceover" },
];

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
  const [log, setLog] = useState<string[]>([]);
  const router = useRouter();

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

    let skipVoiceover = recommendedFormat === "carousel";

    for (const step of stepsToRun) {
      setLog((l) => [...l, step.route === "/api/voiceover" && skipVoiceover ? "⏭ Skipping voiceover (carousel)…" : `Running ${step.label}…`]);

      let body: string | undefined;
      if (step.route === "/api/ingest" && forceNew) body = JSON.stringify({ force: true });
      if (step.route === "/api/voiceover" && skipVoiceover) body = JSON.stringify({ skip: true });

      const res = await fetch(step.route, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      const data = await res.json();

      if (!res.ok) {
        setLog((l) => [...l, `✗ ${step.label} failed: ${data.error}`]);
        setRunning(false);
        return;
      }

      if (step.route === "/api/generate-script") {
        setLog((l) => [...l, "✓ Stories ready — select below"]);
        setRunning(false);
        router.refresh();
        return;
      }

      const doneLabel = step.route === "/api/voiceover" && skipVoiceover ? "⏭ Voiceover skipped" : `✓ ${step.label} done`;
      setLog((l) => [...l, doneLabel]);
    }

    setRunning(false);
    router.refresh();
  }

  const label = running
    ? "Running…"
    : forceNew
    ? "Run pipeline"
    : currentStatus
    ? "Continue pipeline"
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
        <ul className="text-xs text-zinc-400 space-y-1 font-mono">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
