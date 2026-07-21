import { NextRequest, NextResponse } from "next/server";

// One-time OAuth kickoff: visit /api/youtube/auth in a browser, grant the
// youtube.upload scope, and Google redirects to /api/youtube/callback with a code.
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function redirectUri(req: NextRequest): string {
  return process.env.YOUTUBE_OAUTH_REDIRECT || `${new URL(req.url).origin}/api/youtube/callback`;
}

export async function GET(req: NextRequest) {
  const client_id = process.env.YOUTUBE_CLIENT_ID;
  if (!client_id) return NextResponse.json({ error: "Missing YOUTUBE_CLIENT_ID" }, { status: 500 });

  const params = new URLSearchParams({
    client_id,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.upload",
    access_type: "offline", // ask for a refresh token
    prompt: "consent", // force a fresh refresh token even if previously granted
  });

  return NextResponse.redirect(`${AUTH_URL}?${params.toString()}`);
}
