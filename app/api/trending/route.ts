import { NextResponse } from "next/server";
import { fetchNewsAPI, fetchTLDR, rankStories } from "@/lib/news";

export const maxDuration = 300;

// Ephemeral trending feed for the home cockpit's idea starters. Fetches both
// sources live, ranks them, returns the top 6. Nothing is persisted — acting on
// an idea is what creates an episode (see /api/ideas/start).
export async function GET() {
  const results = await Promise.allSettled([fetchNewsAPI(), fetchTLDR()]);

  const newsStories = results[0].status === "fulfilled" ? results[0].value : [];
  const tldrStories = results[1].status === "fulfilled" ? results[1].value : [];
  const all = [...newsStories, ...tldrStories];

  if (all.length === 0) {
    const reason = results
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason?.message)
      .join("; ");
    return NextResponse.json({ error: reason || "No trending stories found" }, { status: 502 });
  }

  const stories = rankStories(all).slice(0, 6);
  return NextResponse.json({ stories });
}
