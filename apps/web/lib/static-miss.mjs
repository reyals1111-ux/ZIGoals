/**
 * Session W Part 23 (Session Q D2, [TIER 3] (deploy config)): the public Alpha's answer to a /_next/static/ file that
 * does not exist. Every static file that exists is served by the asset layer before the Worker runs
 * (wrangler.alpha.jsonc `run_worker_first: false`) and middleware skips these paths (middleware.ts matcher), so a
 * request that gets here is a miss, which Next would answer with its HTML 404 page and no Content-Security-Policy. It
 * gets a plain-text 404 instead: no HTML, nothing from the request in it, a policy that allows nothing, and the static
 * assets' own headers. Pure apart from `Response`, so the unit test and the Worker entry (alpha/worker.mjs) share it.
 */
import { staticMissHeaders } from "./csp-compose.mjs";

/** Exactly the paths the middleware matcher leaves out as static: `_next/static(?:/|$)`. */
export function isStaticPath(pathname) { return pathname === "/_next/static" || pathname.startsWith("/_next/static/"); }

/** The plain 404 for a static path, or null for every other request (OpenNext answers those as before). */
export function staticMiss(request, egress) {
  if (!isStaticPath(new URL(request.url).pathname)) return null;
  return new Response(request.method === "HEAD" ? null : "Not found\n", { status: 404, headers: staticMissHeaders(egress) });
}
