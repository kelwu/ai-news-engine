import { getSupabaseServer } from "@/lib/supabase-server";
import Image from "next/image";
import SyncButton from "../components/SyncButton";

export const dynamic = "force-dynamic";

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Post = {
  id: string;
  platform: string;
  title: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  permalink: string;
  published_at: string;
  likes: number | null;
  comments: number | null;
  views: number | null;
  synced_at: string | null;
};

export default async function PortfolioPage() {
  const supabase = getSupabaseServer();
  const { data: posts } = await supabase
    .from("content_posts")
    .select("id, platform, title, caption, thumbnail_url, permalink, published_at, likes, comments, views, synced_at")
    .order("published_at", { ascending: false })
    .limit(50);

  const youtube = posts?.filter((p) => p.platform === "youtube") ?? [];
  const instagram = posts?.filter((p) => p.platform === "instagram") ?? [];

  const ytViews = youtube.reduce((s, p) => s + (p.views ?? 0), 0);
  const ytLikes = youtube.reduce((s, p) => s + (p.likes ?? 0), 0);
  const igLikes = instagram.reduce((s, p) => s + (p.likes ?? 0), 0);
  const igComments = instagram.reduce((s, p) => s + (p.comments ?? 0), 0);

  const lastSynced = posts?.[0]?.synced_at
    ? new Date(posts[0].synced_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Dashboard</h1>
          {lastSynced && <p className="text-xs text-zinc-600 mt-0.5">Last synced {lastSynced}</p>}
        </div>
        <SyncButton />
      </div>

      {!posts?.length && (
        <p className="text-zinc-500">No content yet — click Sync now to pull your latest posts.</p>
      )}

      {/* YouTube section */}
      {youtube.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">YouTube</h2>
            <div className="flex gap-4 text-xs text-zinc-500">
              <span><span className="text-zinc-300 font-medium">{fmt(ytViews)}</span> views</span>
              <span><span className="text-zinc-300 font-medium">{fmt(ytLikes)}</span> likes</span>
              <span><span className="text-zinc-300 font-medium">{youtube.length}</span> videos</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {youtube.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </section>
      )}

      {/* Instagram section */}
      {instagram.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Instagram</h2>
            <div className="flex gap-4 text-xs text-zinc-500">
              <span><span className="text-zinc-300 font-medium">{fmt(igLikes)}</span> likes</span>
              <span><span className="text-zinc-300 font-medium">{fmt(igComments)}</span> comments</span>
              <span><span className="text-zinc-300 font-medium">{instagram.length}</span> posts</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {instagram.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const isYouTube = post.platform === "youtube";
  const displayTitle = post.title ?? post.caption?.split("\n")[0] ?? "Untitled";

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-700 transition-colors"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-zinc-800">
        {post.thumbnail_url ? (
          <Image
            src={post.thumbnail_url}
            alt={displayTitle}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-zinc-600 text-xs">No thumbnail</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Metrics row — leading visual element */}
        <div className="flex gap-4">
          {isYouTube && post.views != null && (
            <Metric label="Views" value={fmt(post.views)} />
          )}
          {post.likes != null && (
            <Metric label="Likes" value={fmt(post.likes)} />
          )}
          {post.comments != null && (
            <Metric label="Comments" value={fmt(post.comments)} />
          )}
          {post.views == null && post.likes == null && post.comments == null && (
            <span className="text-xs text-zinc-600">No metrics yet — sync to refresh</span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">
          {displayTitle}
        </p>

        {/* Platform + date */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${isYouTube ? "bg-red-500/20 text-red-400" : "bg-pink-500/20 text-pink-400"}`}>
            {post.platform}
          </span>
          <span className="text-xs text-zinc-600">{formatDate(post.published_at)}</span>
        </div>
      </div>
    </a>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-base font-semibold text-white leading-none">{value}</span>
      <span className="text-xs text-zinc-500 mt-0.5">{label}</span>
    </div>
  );
}
