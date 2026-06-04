import { getSupabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import MetricsRefreshButton from "../components/MetricsRefreshButton";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-500/20 text-emerald-400",
  rendered:  "bg-blue-500/20 text-blue-400",
  rendering: "bg-blue-500/20 text-blue-400",
  error:     "bg-red-500/20 text-red-400",
  pending:   "bg-zinc-700/40 text-zinc-400",
};

function humanizeDate(dateStr: string): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const [, month, day] = dateStr.split("-");
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function badge(status: string) {
  const cls = STATUS_COLORS[status] ?? "bg-yellow-500/20 text-yellow-400";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${cls}`}>
      {status}
    </span>
  );
}

function MetricCell({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-zinc-600">—</span>;
  return <span className="text-zinc-300">{value.toLocaleString()}</span>;
}

export default async function EpisodesPage() {
  const supabase = getSupabaseServer();
  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, scheduled_for, status, selected_story, video_url, created_at, instagram_reel_id, instagram_carousel_id, instagram_reel_url, instagram_carousel_url, ig_metrics, ig_metrics_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Episodes</h1>

      {!episodes?.length ? (
        <p className="text-zinc-500">No episodes yet.</p>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-zinc-900 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Headline</th>
                <th className="px-4 py-3 text-right">Reach</th>
                <th className="px-4 py-3 text-right">Impressions</th>
                <th className="px-4 py-3 text-right">Saves</th>
                <th className="px-4 py-3 text-right">Plays</th>
                <th className="px-4 py-3 text-left">Metrics</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {episodes.map((ep) => {
                const story = ep.selected_story as { headline?: string } | null;
                const metrics = ep.ig_metrics as Record<string, Record<string, number>> | null;
                const m = metrics?.reel ?? metrics?.carousel;
                const hasPostId = !!(ep.instagram_reel_id || ep.instagram_carousel_id);
                const igUrl = (ep as { instagram_reel_url?: string; instagram_carousel_url?: string }).instagram_reel_url
                  ?? (ep as { instagram_carousel_url?: string }).instagram_carousel_url
                  ?? null;
                const lastFetched = ep.ig_metrics_at
                  ? new Date(ep.ig_metrics_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  : null;

                return (
                  <tr key={ep.id} className="bg-zinc-950 hover:bg-zinc-900 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{ep.scheduled_for ? humanizeDate(ep.scheduled_for) : "—"}</td>
                    <td className="px-4 py-3">{badge(ep.status)}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Link href={`/episodes/${ep.id}`} className="hover:text-white transition-colors">
                          {story?.headline ?? "—"}
                        </Link>
                        {igUrl && (
                          <a href={igUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-pink-400 transition-colors shrink-0" title="View on Instagram">
                            ↗
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right"><MetricCell value={m?.reach} /></td>
                    <td className="px-4 py-3 text-right"><MetricCell value={m?.impressions} /></td>
                    <td className="px-4 py-3 text-right"><MetricCell value={m?.saved} /></td>
                    <td className="px-4 py-3 text-right"><MetricCell value={m?.plays} /></td>
                    <td className="px-4 py-3">
                      {hasPostId ? (
                        <div className="flex items-center gap-2">
                          <MetricsRefreshButton episodeId={ep.id} />
                          {lastFetched && (
                            <span className="text-zinc-600 text-xs">{lastFetched}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/episodes/${ep.id}`} className="text-zinc-600 hover:text-zinc-300 text-sm transition-colors">
                        →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
