import { NextResponse, type NextRequest } from "next/server";

/*
 * Splits the app across two domains when NEXT_PUBLIC_PORTAL_URL is set (see lib/config.ts):
 * - Portal domain: the portal pages live under /portal in the app but are served from the root
 *   (/ → /portal, /register → /portal/register, ...). Admin, card verification and payments live here too.
 * - Main domain: the public site. Portal, admin and verify addresses redirect to the portal domain.
 * Any other host (uenr-tein.vercel.app, preview deployments, localhost) serves everything as before, so QR
 * codes printed before the split keep working.
 */

const PORTAL = process.env.NEXT_PUBLIC_PORTAL_URL ? new URL(process.env.NEXT_PUBLIC_PORTAL_URL) : null;
const MAIN = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : null;

// Portal pages that are served from the root of the portal domain.
const PORTAL_ROOT_PAGES = /^\/(register|receipt\/[^/]+|payment\/callback)\/?$/;
// Everything on the main domain that belongs to the portal domain instead.
const PORTAL_SECTIONS = /^\/(portal|admin|verify|pay|payment|register|receipt)(\/|$)/;
// Main-site pages, sent back to the main domain if opened on the portal domain.
const MAIN_PAGES = /^\/(about|activities|executives|contact)(\/|$)/;

/** Permanent redirect that keeps the query string (Paystack's ?reference=..., filters, ...). */
function moveTo(req: NextRequest, origin: URL, pathname: string) {
  const url = new URL(pathname, origin);
  url.search = req.nextUrl.search;
  return NextResponse.redirect(url, 308);
}

function rewriteTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(url);
}

/** "/portal/register" → "/register", "/portal" → "/". */
const withoutPortal = (pathname: string) => pathname.replace(/^\/portal(?=\/|$)/, "") || "/";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host");

  if (PORTAL && host === PORTAL.host) {
    if (/^\/portal(\/|$)/.test(pathname)) return moveTo(req, PORTAL, withoutPortal(pathname));
    if (pathname === "/") return rewriteTo(req, "/portal");
    if (PORTAL_ROOT_PAGES.test(pathname)) return rewriteTo(req, `/portal${pathname}`);
    if (MAIN && MAIN_PAGES.test(pathname)) return moveTo(req, MAIN, pathname);
    return NextResponse.next();
  }

  if (PORTAL && MAIN && (host === MAIN.host || host === `www.${MAIN.host}`)) {
    if (PORTAL_SECTIONS.test(pathname)) return moveTo(req, PORTAL, withoutPortal(pathname));
    return NextResponse.next();
  }

  // Single-domain hosts: old links from before the portal moved under /portal.
  if (pathname === "/register" || pathname === "/payment/callback") return moveTo(req, new URL(req.url), `/portal${pathname}`);
  return NextResponse.next();
}

export const config = {
  // Pages only: not API routes (the Paystack webhook must never be redirected), build files or public assets.
  matcher: ["/((?!api/|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
