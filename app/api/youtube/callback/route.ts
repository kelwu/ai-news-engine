import { NextRequest, NextResponse } from "next/server";

// Exchanges the OAuth code for a refresh token and displays it once so you can
// paste it into Vercel as YOUTUBE_REFRESH_TOKEN.
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function redirectUri(req: NextRequest): string {
  return process.env.YOUTUBE_OAUTH_REDIRECT || `${new URL(req.url).origin}/api/youtube/callback`;
}

export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "No authorization code returned" }, { status: 400 });

  const client_id = process.env.YOUTUBE_CLIENT_ID;
  const client_secret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!client_id || !client_secret) {
    return NextResponse.json({ error: "Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET" }, { status: 500 });
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri: redirectUri(req),
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();

  if (!res.ok || !data.refresh_token) {
    // Google only returns a refresh_token when access_type=offline AND the grant is
    // fresh. If missing, revoke prior access at myaccount.google.com/permissions and retry.
    return NextResponse.json(
      {
        error:
          data.error_description ||
          data.error ||
          "No refresh_token returned. Revoke prior access at myaccount.google.com/permissions and retry /api/youtube/auth.",
      },
      { status: 400 }
    );
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>YouTube refresh token</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e4e4e7;padding:40px;max-width:720px;margin:0 auto">
  <h1 style="color:#fff;font-size:20px">YouTube refresh token</h1>
  <p style="color:#a1a1aa;font-size:14px">Copy this into Vercel as <code style="color:#fff">YOUTUBE_REFRESH_TOKEN</code>, then redeploy. It is shown only once.</p>
  <pre style="background:#18181b;border:1px solid #3f3f46;border-radius:8px;padding:16px;white-space:pre-wrap;word-break:break-all;font-size:13px">${data.refresh_token}</pre>
</body></html>`;

  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
