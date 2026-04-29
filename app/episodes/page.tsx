import { getSupabaseServer } from "@/lib/supabase-server";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-500/20 text-emerald-400",
  rendered: "bg-blue-500/20 text-blue-400",
  error: "bg-red-500/20 text-red-400",
  pending: "bg-zinc-700/40 text-zinc-400",
};

function badge(status: string) {
  const cls = STATUS_COLORS[status] ?? "bg-yellow-500/20 text-yellow-400";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${cls}`}>
      {status}
    </span>
  );
}

export default async function EpisodesPage() {
  const supabase = getSupabaseServer();
  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, scheduled_for, status, selected_story, video_url, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Episodes</h1>

      {!episodes?.length ? (
        <p className="text-zinc-500">No episodes yet.</p>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead className="bg-zinc-900 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Headline</th>
                <th className="px-4 py-3 text-left">Video</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {episodes.map((ep) => {
                const story = ep.selected_story as { headline?: string } | null;
                return (
                  <tr key={ep.id} className="bg-zinc-950 hover:bg-zinc-900 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{ep.scheduled_for}</td>
                    <td className="px-4 py-3">{badge(ep.status)}</td>
                    <td className="px-4 py-3 text-zinc-300 max-w-xs truncate">
                      {story?.headline ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {ep.video_url ? (
                        <a href={ep.video_url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs">
                          Watch →
                        </a>
                      ) : "—"}
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
