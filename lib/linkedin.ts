// LinkedIn Posts API — text-post fan-out for the reel's story.
// Auth is OAuth2 (mint a token via /api/linkedin/auth). Posting as a member uses the
// w_member_social scope; to post as the @productbykel Company Page instead, set
// LINKEDIN_AUTHOR_URN to the org URN (urn:li:organization:<id>) — that path needs the
// w_organization_social scope and LinkedIn app review.

const POSTS_URL = "https://api.linkedin.com/rest/posts";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const API_VERSION = process.env.LINKEDIN_API_VERSION || "202409";

export function getLinkedInToken(): string {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) throw new Error("Missing LINKEDIN_ACCESS_TOKEN — run /api/linkedin/auth first");
  return token;
}

// The author of the post. Env override wins (use it for an org page); otherwise resolve
// the authenticated member's URN from the OpenID userinfo endpoint.
export async function getAuthorUrn(token: string): Promise<string> {
  if (process.env.LINKEDIN_AUTHOR_URN) return process.env.LINKEDIN_AUTHOR_URN;

  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok || !data.sub) {
    throw new Error(data.message || "Failed to resolve LinkedIn author URN (needs openid/profile scope)");
  }
  return `urn:li:person:${data.sub}`;
}

export async function createTextPost(commentary: string): Promise<{ id: string; url: string }> {
  const token = getLinkedInToken();
  const author = await getAuthorUrn(token);

  const res = await fetch(POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": API_VERSION,
    },
    body: JSON.stringify({
      author,
      commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  // The Posts API returns the created URN in the x-restli-id header (body is often empty).
  const id = res.headers.get("x-restli-id");
  if (!res.ok || !id) {
    const err = await res.text();
    throw new Error(`LinkedIn post failed (${res.status}): ${err.slice(0, 300)}`);
  }

  return { id, url: `https://www.linkedin.com/feed/update/${id}` };
}
