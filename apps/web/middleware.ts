import { NextRequest, NextResponse } from "next/server";
import { securityPolicy, trustedTypesTrialHeader } from "./lib/security-policy";
// Legacy edge middleware is intentional: OpenNext cannot run Node proxy yet.
/** Routes that send their own Content-Security-Policy and Cache-Control (Session X Part 4); exact paths only. */
const OWN_RESPONSE_HEADERS: ReadonlySet<string> = new Set(["/api/market-logo"]);
export function middleware(request: NextRequest) {
  const https = request.nextUrl.protocol === "https:";
  const {nonce, csp} = securityPolicy(process.env.NODE_ENV === "development", https, request.nextUrl.pathname);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("x-zigoals-origin", request.nextUrl.origin);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({request:{headers}});
  // Session X Part 4 ([TIER 3] (security headers)): the market logo route answers images with its own stricter policy
  // (`default-src 'none'; sandbox`) and its own cache lifetime (a day for a logo, a minute for a miss, no-store for a
  // refusal), so middleware leaves those two response headers to it. Only this exact path: the request headers above are
  // still overwritten for it, and every other path, every other /api/* route included, keeps the page policy and no-store.
  if (!OWN_RESPONSE_HEADERS.has(request.nextUrl.pathname)) {
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  // Session W Part 1d ([TIER 3] (deploy workflow)): the build's exact source commit, the same 40 characters Settings and
  // Help already show, so the post-upload smoke can tell the new version's answers from the previous one's before it
  // checks any security header (scripts/lib/alpha-smoke.mjs). Not sent when the build has no exact commit.
  const commit = process.env.NEXT_PUBLIC_APP_COMMIT;
  if (commit && /^[a-f0-9]{40}$/.test(commit)) response.headers.set("X-ZIGoals-Build", commit);
  // Session U Part 6 (FIX_PLAN D4): the Trusted Types trial, report-only, on a local run only (security-policy.ts).
  const trial = trustedTypesTrialHeader(process.env.ZIGOALS_TRUSTED_TYPES_TRIAL, request.nextUrl.hostname);
  if (trial) response.headers.set("Content-Security-Policy-Report-Only", trial);
  return response;
}
export const config = {
  // Public files and reserved Next asset endpoints only. Missing favicon.ico
  // is HTML (404), so it deliberately retains the nonce policy. The web app manifest is a public file since Session X
  // Part 5a (one Worker call less on every page load).
  matcher: ["/((?!_next/static(?:/|$)|_next/image$|(?:icon\\.svg|apple-touch-icon\\.png|robots\\.txt|social-card\\.svg|social-card\\.png|manifest\\.webmanifest)$).*)"],
};
