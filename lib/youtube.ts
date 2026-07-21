// YouTube Data API v3 — upload helper for reel → Short fan-out.
// Uploads require OAuth2 (youtube.upload scope), NOT the read-only API key used by
// the metrics sync. Credentials live in env, minted once via /api/youtube/auth.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

// Exchange the long-lived refresh token for a short-lived access token.
export async function getYouTubeAccessToken(): Promise<string> {
  const client_id = process.env.YOUTUBE_CLIENT_ID;
  const client_secret = process.env.YOUTUBE_CLIENT_SECRET;
  const refresh_token = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!client_id || !client_secret || !refresh_token) {
    throw new Error(
      "Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN — run /api/youtube/auth first"
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to refresh YouTube access token");
  }
  return data.access_token as string;
}

export type YouTubeUploadInput = {
  videoUrl: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: "public" | "unlisted" | "private";
  categoryId?: string;
};

// Resumable upload: init (metadata) → PUT the bytes. The reel is a short 9:16 MP4,
// so we buffer it fully in memory rather than chunking.
export async function uploadShort(input: YouTubeUploadInput): Promise<{ id: string; url: string }> {
  const accessToken = await getYouTubeAccessToken();

  // Pull the rendered MP4 from its public S3 URL (same URL Instagram ingests).
  const videoRes = await fetch(input.videoUrl);
  if (!videoRes.ok) throw new Error(`Failed to fetch rendered video (${videoRes.status})`);
  const bytes = new Uint8Array(await videoRes.arrayBuffer());

  // Step 1 — initiate the resumable session.
  const initRes = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(bytes.byteLength),
    },
    body: JSON.stringify({
      snippet: {
        title: input.title.slice(0, 100),
        description: input.description.slice(0, 4900),
        tags: input.tags,
        categoryId: input.categoryId ?? "28", // Science & Technology
      },
      status: {
        privacyStatus: input.privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    }),
  });
  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`YouTube upload init failed (${initRes.status}): ${err.slice(0, 300)}`);
  }
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL");

  // Step 2 — upload the bytes.
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.byteLength) },
    body: bytes,
  });
  const result = await putRes.json();
  if (!putRes.ok || !result.id) {
    throw new Error(result.error?.message || `YouTube upload failed (${putRes.status})`);
  }

  return { id: result.id as string, url: `https://www.youtube.com/shorts/${result.id}` };
}
