import { NextRequest, NextResponse } from "next/server";

// One-time OAuth kickoff: visit /api/linkedin/auth, authorize, LinkedIn redirects to
// /api/linkedin/callback with a code. openid/profile resolve the author URN;
// w_member_social grants posting. Add w_organization_social to post as a Company Page.
const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const SCOPES = process.env.LINKEDIN_SCOPES || "openid profile w_member_social";

function redirectUri(req: NextRequest): string {
  return process.env.LINKEDIN_OAUTH_REDIRECT || `${new URL(req.url).origin}/api/linkedin/callback`;
}

export async function GET(req: NextRequest) {
  const client_id = process.env.LINKEDIN_CLIENT_ID;
  if (!client_id) return NextResponse.json({ error: "Missing LINKEDIN_CLIENT_ID" }, { status: 500 });

  const params = new URLSearchParams({
    response_type: "code",
    client_id,
    redirect_uri: redirectUri(req),
    scope: SCOPES,
    state: "ai-news-engine",
  });

  return NextResponse.redirect(`${AUTH_URL}?${params.toString()}`);
}
