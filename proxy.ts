import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Password-gate the whole app — pages AND /api routes, since the API is what spends
// money and posts to Instagram. The production *.vercel.app alias isn't covered by
// Vercel Deployment Protection, so this is the lock.
//
// Browsers prompt once for HTTP Basic auth and then resend it on every same-origin
// request (page loads, fetches from buttons, OAuth callbacks). Vercel cron requests
// carry `Authorization: Bearer $CRON_SECRET` instead, so those routes accept either.

const CRON_ROUTES = ["/api/ingest", "/api/publish-scheduled", "/api/sync-content"];

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function hasValidPassword(auth: string | null, password: string): boolean {
  if (!auth?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(auth.slice(6));
    // Username is ignored; only the password matters.
    return safeEqual(decoded.slice(decoded.indexOf(":") + 1), password);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  // Fail closed: no password configured means nobody gets in.
  if (!password) {
    return new NextResponse("DASHBOARD_PASSWORD is not set", { status: 503 });
  }

  if (cronSecret && CRON_ROUTES.includes(request.nextUrl.pathname) && auth && safeEqual(auth, `Bearer ${cronSecret}`)) {
    return NextResponse.next();
  }

  if (hasValidPassword(auth, password)) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="AI News Engine", charset="UTF-8"' },
  });
}

export const config = {
  // Everything except static build assets and the image optimizer.
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
