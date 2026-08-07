import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type BriefRow = {
  id: string;
  created_at: string;
  hook: string | null;
  status: string | null;
  story: { title?: string; source?: string } | null;
};

export default async function BriefsPage() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("content_briefs")
    .select("id, created_at, hook, status, story")
    .order("created_at", { ascending: false })
    .limit(50);

  const briefs = (data ?? []) as BriefRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Shoot Briefs</h1>
        <p className="text-zinc-500 text-sm mt-1">Reels to film yourself. Open one on your phone and read from it.</p>
      </div>

      {briefs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-2">
          <p className="text-zinc-400">No briefs yet.</p>
          <p className="text-zinc-600 text-sm">
            Head to <Link href="/news" className="text-blue-400 hover:text-blue-300">News</Link> and hit &quot;My reel&quot; on a story.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {briefs.map((b) => (
            <Link
              key={b.id}
              href={`/briefs/${b.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors block space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-zinc-500">{b.story?.source ?? "AI news"}</p>
                {b.status === "filmed" && (
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">filmed</span>
                )}
              </div>
              <p className="text-white text-sm font-medium leading-snug line-clamp-2">{b.story?.title ?? "Untitled"}</p>
              {b.hook && <p className="text-zinc-400 text-sm italic leading-relaxed line-clamp-2">&ldquo;{b.hook}&rdquo;</p>}
              <p className="text-xs text-zinc-600">
                {new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
