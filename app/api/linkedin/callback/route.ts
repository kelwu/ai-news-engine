import { NextRequest, NextResponse } from "next/server";

// Exchanges the OAuth code for an access token and displays it once so you can paste it
// into Vercel as LINKEDIN_ACCESS_TOKEN. (LinkedIn access tokens last ~60 days; if your
// app has refresh tokens enabled, the refresh_token is shown too.)
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

function redirectUri(req: NextRequest): string {
  return process.env.LINKEDIN_OAUTH_REDIRECT || `${new URL(req.url).origin}/api/linkedin/callback`;
}

export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "No authorization code returned" }, { status: 400 });

  const client_id = process.env.LINKEDIN_CLIENT_ID;
  const client_secret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!client_id || !client_secret) {
    return NextResponse.json({ error: "Missing LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET" }, { status: 500 });
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(req),
      client_id,
      client_secret,
    }),
  });
  const data = await res.json();

  if (!res.ok || !data.access_token) {
    return NextResponse.json(
      { error: data.error_description || data.error || "Token exchange failed" },
      { status: 400 }
    );
  }

  const refreshLine = data.refresh_token
    ? `<p style="color:#a1a1aa;font-size:13px;margin-top:24px">Refresh token (store as <code style="color:#fff">LINKEDIN_REFRESH_TOKEN</code>):</p>
       <pre style="background:#18181b;border:1px solid #3f3f46;border-radius:8px;padding:16px;white-space:pre-wrap;word-break:break-all;font-size:13px">${data.refresh_token}</pre>`
    : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>LinkedIn access token</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e4e4e7;padding:40px;max-width:720px;margin:0 auto">
  <h1 style="color:#fff;font-size:20px">LinkedIn access token</h1>
  <p style="color:#a1a1aa;font-size:14px">Copy this into Vercel as <code style="color:#fff">LINKEDIN_ACCESS_TOKEN</code>, then redeploy. Expires in ~${Math.round((data.expires_in ?? 5184000) / 86400)} days.</p>
  <pre style="background:#18181b;border:1px solid #3f3f46;border-radius:8px;padding:16px;white-space:pre-wrap;word-break:break-all;font-size:13px">${data.access_token}</pre>
  ${refreshLine}
</body></html>`;

  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
