import { getSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import CopyBriefButton from "../../components/CopyBriefButton";

export const dynamic = "force-dynamic";

type Brief = {
  id: string;
  created_at: string;
  story: { title?: string; source?: string; url?: string } | null;
  hook: string | null;
  angle: string | null;
  talking_points: string[] | null;
  key_facts: string[] | null;
  cta: string | null;
  visual_idea: string | null;
};

function toPlainText(b: Brief): string {
  const lines = [
    `HOOK: ${b.hook ?? ""}`,
    ``,
    `ANGLE: ${b.angle ?? ""}`,
    ``,
    `TALKING POINTS:`,
    ...(b.talking_points ?? []).map((t, i) => `${i + 1}. ${t}`),
    ``,
    `FACTS TO CITE:`,
    ...(b.key_facts ?? []).map((f) => `- ${f}`),
    ``,
    `CTA: ${b.cta ?? ""}`,
    ``,
    `SHOT IDEA: ${b.visual_idea ?? ""}`,
  ];
  return lines.join("\n");
}

export default async function BriefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServer();

  const { data } = await supabase.from("content_briefs").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const b = data as Brief;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/briefs" className="text-xs text-zinc-500 hover:text-white transition-colors">← Briefs</Link>
          <h1 className="text-xl font-bold text-white mt-1 leading-snug">{b.story?.title ?? "Shoot brief"}</h1>
          {b.story?.source && <p className="text-zinc-500 text-sm mt-1">via {b.story.source}</p>}
        </div>
        <CopyBriefButton text={toPlainText(b)} />
      </div>

      {/* Hook */}
      {b.hook && (
        <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-5">
          <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">Hook — say this first</p>
          <p className="text-white text-lg font-medium leading-snug">{b.hook}</p>
        </div>
      )}

      {/* Angle */}
      {b.angle && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Angle</p>
          <p className="text-zinc-300 leading-relaxed">{b.angle}</p>
        </div>
      )}

      {/* Talking points */}
      {b.talking_points && b.talking_points.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Talking points</p>
          <ol className="space-y-2.5">
            {b.talking_points.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-zinc-200 leading-relaxed pt-0.5">{t}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Key facts */}
      {b.key_facts && b.key_facts.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Facts to cite</p>
          <ul className="space-y-2">
            {b.key_facts.map((f, i) => (
              <li key={i} className="flex gap-2 text-zinc-200 leading-relaxed">
                <span className="text-amber-400 shrink-0">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      {b.cta && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Close with</p>
          <p className="text-white font-medium leading-relaxed">{b.cta}</p>
        </div>
      )}

      {/* Visual idea */}
      {b.visual_idea && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Shot idea</p>
          <p className="text-zinc-300 leading-relaxed">{b.visual_idea}</p>
        </div>
      )}

      {b.story?.url && (
        <a
          href={b.story.url}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Read the source ↗
        </a>
      )}
    </div>
  );
}
