/**
 * Session U Part 6 (FIX_PLAN D2, FINDINGS Q-WEB-03): the origin the root layout writes into canonical and social-card
 * URLs. Middleware sets `x-zigoals-origin` from the URL being served, but the paths it skips (static assets and five
 * public files) reach the layout with whatever header the client sent. So the layout uses only these origins: the
 * public Alpha's, the acceptance app's (FINAL_ACCTEST_REDEPLOY), and loopback ones for local development and previews.
 * Any other (a workers.dev fallback, a value a client made up) gets no canonical or social-card URL, which costs a link
 * preview at most.
 */
const PUBLIC_ORIGINS = new Set(["https://alpha.zigoals.app", "https://accounts-test.zigoals.app"]);
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);
export function trustedOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.origin !== value) return null;
  if (PUBLIC_ORIGINS.has(url.origin)) return url.origin;
  return LOOPBACK.has(url.hostname) && (url.protocol === "http:" || url.protocol === "https:") ? url.origin : null;
}
