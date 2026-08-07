import { getSupabaseServer } from "@/lib/supabase-server";
import RunPipeline from "./components/RunPipeline";
import StorySelector from "./components/StorySelector";
import NewsFeed from "./components/NewsFeed";
import { getPerformanceInsights } from "@/lib/insights";

export const dynamic = 'force-dynamic';

// Days of silence before the cockpit nudges you with trending idea starters.
const IDLE_DAYS = 3;

type Candidate = { story_index: number; reason: string };
type RawStory = { title: string; summary: string; url: string; source: string; published_at: string };

const PIPELINE_STEPS = ["ingested", "story_selection", "scripted", "imaged", "voiced", "rendered", "published"];
const STEP_LABELS: Record<string, string> = { story_selection: "select stories" };

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function StatusStep({ step, current, error }: { step: string; current: string; error?: string | null }) {
  const effectiveCurrent = current === "rendering" ? "rendered" : current;
  const ci = PIPELINE_STEPS.indexOf(effectiveCurrent);
  const si = PIPELINE_STEPS.indexOf(step);
  const done = ci > si;
  const active = effectiveCurrent === step;
  const isError = error && active;
  const isInProgress = current === "rendering" && step === "rendered";
  const label = STEP_LABELS[step] ?? step;

  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        isError ? "bg-red-500 text-white" : done ? "bg-emerald-500 text-white" : active ? "bg-blue-500 text-white" : "bg-zinc-800 text-zinc-500"
      }`}>
        {isError ? "!" : done ? "✓" : isInProgress ? "…" : si + 1}
      </div>
      <span className={`text-sm capitalize ${done || active ? "text-white" : "text-zinc-500"}`}>{label}</span>
    </div>
  );
}

export default async function Home() {
  const supabase = getSupabaseServer();

  const { data: episode } = await supabase
    .from("episodes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: recentPosts }, insights] = await Promise.all([
    supabase
      .from("content_posts")
      .select("platform, likes, comments, views, published_at")
      .order("published_at", { ascending: false })
      .limit(50),
    getPerformanceInsights(supabase),
  ]);

  const posts = recentPosts ?? [];

  // Last time we did anything real: latest published post, or an episode we just posted.
  const lastPostAt = posts[0]?.published_at ? new Date(posts[0].published_at).getTime() : 0;
  const postedAt = episode?.posted_at ? new Date(episode.posted_at).getTime() : 0;
  const lastActivity = Math.max(lastPostAt, postedAt);
  const daysSince = lastActivity ? (Date.now() - lastActivity) / 86_400_000 : Infinity;

  const status = episode?.status ?? null;
  const story = episode?.selected_story as { headline?: string; source?: string } | null;

  const needsCuration = status === "story_selection";
  const readyToReview = ["voiced", "rendered"].includes(status ?? "");
  const isRendering = status === "rendering";
  const canContinue = !!episode && !["story_selection", "voiced", "rendering", "rendered", "published"].includes(status ?? "");
  const hasActiveWork = !!episode && status !== "published";
  const isIdle = !hasActiveWork && daysSince > IDLE_DAYS;

  const rawStories = (episode?.raw_stories ?? []) as RawStory[];
  const candidates = (episode?.carousel_candidates ?? []) as Candidate[];
  const defaultSelected = candidates.slice(0, 3).map((c) => c.story_index);

  const isToday = episode?.scheduled_for === new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

  // Pulse totals (engagement = likes + comments, comparable across platforms).
  const totalEngagement = posts.reduce((s, p) => s + (p.likes ?? 0) + (p.comments ?? 0), 0);
  const totalViews = posts.reduce((s, p) => s + (p.views ?? 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-zinc-500 text-sm mt-1">Your content flywheel — from trending news to published, in one place.</p>
        </div>
        <RunPipeline forceNew />
      </div>

      {/* ── What to do now ── */}
      <section className="space-y-3">
        {needsCuration ? (
          <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-5 space-y-4">
            <div>
              <p className="text-white font-medium">Curate today&apos;s content</p>
              <p className="text-zinc-400 text-sm mt-0.5">
                Claude pre-selected stories and a format — override anything before confirming.
              </p>
            </div>
            <StorySelector
              episodeId={episode!.id}
              stories={rawStories}
              candidates={candidates}
              defaultSelected={defaultSelected}
              recommendedFormat={episode!.recommended_format ?? "carousel"}
            />
          </div>
        ) : readyToReview || isRendering ? (
          <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-5 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{isRendering ? "Rendering…" : "Ready to review"}</p>
              <p className="text-zinc-400 text-sm">
                {isRendering ? "Your video is rendering. Review it when it's done." : "Preview and publish your content."}
              </p>
            </div>
            <a href="/review" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Review →
            </a>
          </div>
        ) : canContinue ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
            <div>
              <p className="text-white font-medium">Pick up where you left off</p>
              <p className="text-zinc-400 text-sm mt-0.5">This episode is mid-pipeline. Continue to the next step.</p>
            </div>
            <RunPipeline currentStatus={status ?? undefined} recommendedFormat={episode?.recommended_format ?? undefined} />
          </div>
        ) : isIdle ? (
          <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-medium">
                  {lastActivity ? `It's been ${Math.floor(daysSince)} days since your last post.` : "Let's get your first post out."}
                </p>
                <p className="text-zinc-400 text-sm mt-0.5">Here&apos;s what&apos;s trending in AI right now — make it, or film your own.</p>
              </div>
              <a href="/news" className="text-xs text-zinc-400 hover:text-white transition-colors whitespace-nowrap shrink-0">Browse all news →</a>
            </div>
            <NewsFeed autoLoad />
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/15 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-white font-medium">You&apos;re up to date ✓</p>
                <p className="text-zinc-400 text-sm mt-0.5">Nothing pending. Want to get ahead? See what&apos;s trending.</p>
              </div>
              <a href="/news" className="text-xs text-zinc-400 hover:text-white transition-colors whitespace-nowrap shrink-0">Browse all news →</a>
            </div>
            <NewsFeed />
          </div>
        )}
      </section>

      {/* ── Current episode ── */}
      {episode && (
        <section className="space-y-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            {isToday ? "Today's episode" : "Latest episode"} · {episode.scheduled_for ?? "—"}
          </p>

          {story?.headline && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Reel story</p>
              <p className="text-white font-medium">{story.headline}</p>
              {story.source && <p className="text-zinc-500 text-sm mt-1">via {story.source}</p>}
            </div>
          )}

          {episode.script && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Script preview</p>
              <p className="text-zinc-300 text-sm leading-relaxed line-clamp-4">{episode.script}</p>
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Pipeline</p>
            {PIPELINE_STEPS.map((step) => (
              <StatusStep key={step} step={step} current={episode.status} error={episode.error} />
            ))}
            {episode.error && (
              <p className="text-red-400 text-sm bg-red-950/40 rounded-lg px-3 py-2">{episode.error}</p>
            )}
          </div>
        </section>
      )}

      {/* ── Performance pulse ── */}
      {posts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Performance pulse</p>
            <a href="/portfolio" className="text-xs text-zinc-400 hover:text-white transition-colors">Full dashboard →</a>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xl font-bold text-white">{fmt(posts.length)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">posts tracked</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{fmt(totalEngagement)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">likes + comments</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{fmt(totalViews)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">views</p>
              </div>
            </div>
            {insights.summary ? (
              <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/50 rounded-lg px-3 py-2 border border-zinc-800">
                <span className="text-emerald-400 font-medium">What&apos;s working: </span>
                {insights.summary}
              </p>
            ) : (
              <p className="text-xs text-zinc-600">Publish a few more posts to unlock what&apos;s working insights.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
