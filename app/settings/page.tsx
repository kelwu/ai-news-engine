export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        <div className="p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Posting cadence</p>
          <p className="text-white">Every 2 days at 8am PT</p>
          <p className="text-zinc-500 text-xs mt-1">Edit <code className="text-zinc-400">vercel.json</code> to change the cron schedule.</p>
        </div>

        <div className="p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Voice</p>
          <p className="text-white font-mono text-sm">{process.env.ELEVENLABS_VOICE_ID ?? "Not set"}</p>
          <p className="text-zinc-500 text-xs mt-1">Set <code className="text-zinc-400">ELEVENLABS_VOICE_ID</code> in your environment variables.</p>
        </div>

        <div className="p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Image model</p>
          <p className="text-white">fal.ai · Flux 1.1 Pro</p>
          <p className="text-zinc-500 text-xs mt-1">Swap in <code className="text-zinc-400">app/api/generate-image/route.ts</code>.</p>
        </div>

        <div className="p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Instagram</p>
          <p className={`text-sm ${process.env.INSTAGRAM_ACCESS_TOKEN ? "text-emerald-400" : "text-yellow-400"}`}>
            {process.env.INSTAGRAM_ACCESS_TOKEN ? "Connected" : "Not connected — add credentials to .env.local"}
          </p>
        </div>
      </div>
    </div>
  );
}
