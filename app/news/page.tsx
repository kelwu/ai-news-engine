import NewsFeed from "../components/NewsFeed";

export const dynamic = "force-dynamic";

export default function NewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Latest in AI</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Ranked by what&apos;s actually trending. Make a carousel or reel, or grab a brief and film your own.
        </p>
      </div>
      <NewsFeed autoLoad />
    </div>
  );
}
