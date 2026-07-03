"use client";
import { useState } from "react";
import Image from "next/image";

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
};

type Tab = "all" | "youtube" | "instagram";
type Sort = "date" | "performance";

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function engagementRate(post: Post): string | null {
  if (post.platform !== "youtube") return null;
  if (!post.views || !post.likes) return null;
  return `${(post.likes / post.views * 100).toFixed(1)}%`;
}

function performanceScore(post: Post): number {
  if (post.platform === "youtube") return post.views ?? 0;
  return (post.likes ?? 0) + (post.comments ?? 0) * 2;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardClient({ posts }: { posts: Post[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("date");

  const filtered = posts.filter((p) => tab === "all" || p.platform === tab);
  const sorted = [...filtered].sort((a, b) =>
    sort === "date"
      ? new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      : performanceScore(b) - performanceScore(a)
  );

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: posts.length },
    { key: "youtube", label: "YouTube", count: posts.filter((p) => p.platform === "youtube").length },
    { key: "instagram", label: "Instagram", count: posts.filter((p) => p.platform === "instagram").length },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs + Sort */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs ${tab === t.key ? "text-zinc-400" : "text-zinc-600"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(["date", "performance"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                sort === s ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s === "date" ? "Newest" : "Top performing"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <p className="text-zinc-500 text-sm">No posts found.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const isYouTube = post.platform === "youtube";
  const displayTitle = post.title ?? post.caption?.split("\n")[0] ?? "Untitled";
  const er = engagementRate(post);

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
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-zinc-600 text-xs">No thumbnail</span>
          </div>
        )}
        {/* Platform pill overlaid on thumbnail */}
        <span className={`absolute top-2 left-2 text-xs font-medium px-1.5 py-0.5 rounded-md ${
          isYouTube ? "bg-red-500/80 text-white" : "bg-pink-500/80 text-white"
        }`}>
          {isYouTube ? "YT" : "IG"}
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          {isYouTube && post.views != null && (
            <Metric label="Views" value={fmt(post.views)} />
          )}
          {post.likes != null && (
            <Metric label="Likes" value={fmt(post.likes)} />
          )}
          {post.comments != null && (
            <Metric label="Comments" value={fmt(post.comments)} />
          )}
          {er && (
            <Metric label="Eng. rate" value={er} highlight />
          )}
          {post.views == null && post.likes == null && (
            <span className="text-xs text-zinc-600">No metrics yet</span>
          )}
        </div>

        {/* Title */}
        <p className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors line-clamp-2 leading-snug">
          {displayTitle}
        </p>

        {/* Date */}
        <p className="text-xs text-zinc-600">{formatDate(post.published_at)}</p>
      </div>
    </a>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`text-sm font-semibold leading-none ${highlight ? "text-emerald-400" : "text-white"}`}>
        {value}
      </span>
      <span className="text-xs text-zinc-500 mt-0.5">{label}</span>
    </div>
  );
}
