// Instagram API (Instagram Login) — token storage + auto-refresh, and durable thumbnails.
// Long-lived tokens expire after 60 days unless refreshed. The live token lives in the
// app_secrets table (RLS on, no policies → service role only) so the daily sync can
// rotate it without touching Vercel env. INSTAGRAM_ACCESS_TOKEN in env is only the seed:
// pasting a new one there (e.g. after a manual re-auth) takes over automatically.

import { createHash } from "node:crypto";
import { supabase } from "@/lib/supabase";

export const IG_API = "https://graph.instagram.com/v25.0";
const REFRESH_URL = "https://graph.instagram.com/refresh_access_token";
const TOKEN_KEY = "instagram_access_token";
// Refreshing resets the 60-day clock; weekly leaves plenty of slack for failed runs.
const REFRESH_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

type StoredToken = { value: string; updated_at: string; seed_hash: string | null };

// Resolve the current token: the stored (rotated) one, unless env holds a token the
// stored row wasn't seeded from — then env wins, because a human just re-authed.
async function resolveToken(): Promise<{ token: string; stored: StoredToken | null; envIsNewer: boolean }> {
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const { data: stored } = await supabase
    .from("app_secrets")
    .select("value, updated_at, seed_hash")
    .eq("key", TOKEN_KEY)
    .maybeSingle<StoredToken>();

  const envIsNewer = !!envToken && (!stored || stored.seed_hash !== sha256(envToken));
  const token = envIsNewer ? envToken : stored?.value;
  if (!token) throw new Error("Missing INSTAGRAM_ACCESS_TOKEN");
  return { token, stored, envIsNewer };
}

export async function getInstagramToken(): Promise<string> {
  return (await resolveToken()).token;
}

// Called from the daily sync cron. Swaps the token for a fresh 60-day one about once a
// week. Meta rejects refreshes of tokens younger than 24h, which only matters right
// after a manual re-auth — the next day's run picks it up.
export async function refreshInstagramToken(): Promise<{ refreshed: boolean; expires_at?: string; reason?: string }> {
  const { token, stored, envIsNewer } = await resolveToken();

  if (!envIsNewer && stored && Date.now() - new Date(stored.updated_at).getTime() < REFRESH_EVERY_MS) {
    return { refreshed: false, reason: "refreshed recently" };
  }

  const res = await fetch(`${REFRESH_URL}?grant_type=ig_refresh_token&access_token=${token}`);
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Instagram token refresh failed: ${data.error?.message ?? res.status}`);
  }

  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const expires_at = new Date(Date.now() + (data.expires_in as number) * 1000).toISOString();
  const { error } = await supabase.from("app_secrets").upsert({
    key: TOKEN_KEY,
    value: data.access_token as string,
    // Remember which env token this lineage came from, so a later env change is detected.
    seed_hash: envIsNewer ? sha256(envToken!) : stored?.seed_hash ?? null,
    expires_at,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to store refreshed Instagram token: ${error.message}`);

  return { refreshed: true, expires_at };
}

// Instagram CDN URLs are signed and die within days, so copy each thumbnail into the
// public `thumbnails` bucket and serve it from there. Returns null if the copy fails;
// callers fall back to the CDN URL so the next sync can retry.
export async function storeInstagramThumbnail(mediaId: string, cdnUrl: string): Promise<string | null> {
  try {
    const res = await fetch(cdnUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const bytes = new Uint8Array(await res.arrayBuffer());

    const path = `instagram/${mediaId}.jpg`;
    const { error } = await supabase.storage
      .from("thumbnails")
      .upload(path, bytes, { contentType, upsert: true });
    if (error) return null;

    return supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
