import { getSupabaseServer } from "@/lib/supabase-server";
import Image from "next/image";

export const dynamic = "force-dynamic";

const PLATFORM_BADGE: Record<string, string> = {
  youtube:   "bg-red-500/20 text-red-400",
  instagram: "bg-pink-500/20 text-pink-400",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PortfolioPage() {
  const supabase = getSupabaseServer();
  const { data: posts } = await supabase
    .from("content_posts")
    .select("id, platform, title, caption, thumbnail_url, permalink, published_at, likes, comments, views")
    .order("published_at", { ascending: false })
    .limit(50);

  const youtube = posts?.filter((p) => p.platform === "youtube") ?? [];
  const instagram = posts?.filter((p) => p.platform === "instagram") ?? [];

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <span className="text-xs text-zinc-600">Syncs daily at 10am UTC</span>
      </div>

      {!posts?.length && (
        <p className="text-zinc-500">No content synced yet. Trigger <code className="text-zinc-400">/api/sync-content</code> to populate.</p>
      )}

      {youtube.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">YouTube</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {youtube.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {instagram.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Instagram</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {instagram.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
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
};

function PostCard({ post }: { post: Post }) {
  const badgeCls = PLATFORM_BADGE[post.platform] ?? "bg-zinc-700/40 text-zinc-400";
  const displayTitle = post.title ?? post.caption?.split("\n")[0] ?? "Untitled";
  const snippet = post.caption?.slice(0, 120);

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-600 transition-colors"
    >
      {post.thumbnail_url ? (
        <div className="relative w-full aspect-video bg-zinc-800">
          <Image
            src={post.thumbnail_url}
            alt={displayTitle}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        </div>
      ) : (
        <div className="w-full aspect-video bg-zinc-800 flex items-center justify-center">
          <span className="text-zinc-600 text-xs">No thumbnail</span>
        </div>
      )}

      <div className="p-4 space-y-2 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${badgeCls}`}>
            {post.platform}
          </span>
          <span className="text-xs text-zinc-600">{formatDate(post.published_at)}</span>
        </div>

        <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-2">
          {displayTitle}
        </p>

        {snippet && (
          <p className="text-xs text-zinc-500 line-clamp-2">{snippet}</p>
        )}

        {(post.likes != null || post.comments != null || post.views != null) && (
          <div className="flex gap-3 pt-1 text-xs text-zinc-500">
            {post.views != null && <span>{post.views.toLocaleString()} views</span>}
            {post.likes != null && <span>{post.likes.toLocaleString()} likes</span>}
            {post.comments != null && <span>{post.comments.toLocaleString()} comments</span>}
          </div>
        )}
      </div>
    </a>
  );
}
