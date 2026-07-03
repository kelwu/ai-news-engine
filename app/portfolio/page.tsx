import { getSupabaseServer } from "@/lib/supabase-server";
import SyncButton from "../components/SyncButton";
import DashboardClient from "../components/DashboardClient";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default async function PortfolioPage() {
  const supabase = getSupabaseServer();
  const { data: posts } = await supabase
    .from("content_posts")
    .select("id, platform, title, caption, thumbnail_url, permalink, published_at, likes, comments, views, synced_at")
    .order("published_at", { ascending: false })
    .limit(25);

  const all = posts ?? [];
  const youtube = all.filter((p) => p.platform === "youtube");
  const instagram = all.filter((p) => p.platform === "instagram");

  const ytViews = youtube.reduce((s, p) => s + (p.views ?? 0), 0);
  const ytLikes = youtube.reduce((s, p) => s + (p.likes ?? 0), 0);
  const igLikes = instagram.reduce((s, p) => s + (p.likes ?? 0), 0);
  const igComments = instagram.reduce((s, p) => s + (p.comments ?? 0), 0);

  const lastSynced = all[0]?.synced_at
    ? new Date(all[0].synced_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Dashboard</h1>
          {lastSynced && <p className="text-xs text-zinc-600 mt-0.5">Last synced {lastSynced}</p>}
        </div>
        <SyncButton />
      </div>

      {/* Summary stats */}
      {all.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="YT Views" value={fmt(ytViews)} sub={`${youtube.length} videos`} color="text-red-400" />
          <StatCard label="YT Likes" value={fmt(ytLikes)} sub="total" color="text-red-400" />
          <StatCard label="IG Likes" value={fmt(igLikes)} sub={`${instagram.length} posts`} color="text-pink-400" />
          <StatCard label="IG Comments" value={fmt(igComments)} sub="total" color="text-pink-400" />
        </div>
      )}

      {/* Tabbed content */}
      {all.length === 0 ? (
        <p className="text-zinc-500">No content yet — click Sync now to pull your latest posts.</p>
      ) : (
        <DashboardClient posts={all} />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className={`text-xs font-medium uppercase tracking-wider ${color}`}>{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>
    </div>
  );
}
