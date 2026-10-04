// Session U Part 2d: when the shared market coordinator's MARKET_POLICY period ends, as GET /api/market-status reports
// it. Information only: it never fails a smoke, a deployment or the owner's verifier. Below 7 days it says to prepare
// the next period's policy (docs/run11/ALPHA_PRICES_ROLLOUT.md, "Next policy period").
export const POLICY_STATUS_PATH = "/api/market-status";
export const POLICY_WARN_DAYS = 7;
const HOUR = 3600000, DAY = 24 * HOUR;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/** `{ text, warn }` for a reported end (ISO string) or null ("not reported") at `now`. */
export function policyWindowNote(end, now = Date.now()) {
  if (typeof end !== "string" || !ISO.test(end) || !Number.isFinite(Date.parse(end))) {
    return { text: "Market policy period end: not reported (an older coordinator, or none bound).", warn: false };
  }
  const left = Date.parse(end) - now;
  if (left <= 0) return { text: `Market policy period ENDED at ${end}: every price is refused, cached ones too, until the next period's policy is set (docs/run11/ALPHA_PRICES_ROLLOUT.md, "Next policy period").`, warn: true };
  const span = left < DAY ? `${Math.floor(left / HOUR)} h` : `${Math.floor(left / DAY)} days`;
  if (left < POLICY_WARN_DAYS * DAY) return { text: `Market policy period ends ${end} (${span} left): fewer than ${POLICY_WARN_DAYS} days, prepare the next period's policy (docs/run11/ALPHA_PRICES_ROLLOUT.md, "Next policy period").`, warn: true };
  return { text: `Market policy period ends ${end} (${span} left).`, warn: false };
}

/** One GET of /api/market-status. Returns `{ httpStatus, policyWindowEnd }`; anything unexpected is null. Never throws
 * and never echoes the answer. */
export async function readPolicyWindow({ origin, fetcher = fetch, timeoutMs = 10000 }) {
  try {
    const response = await fetcher(`${origin}${POLICY_STATUS_PATH}`, {
      method: "GET", redirect: "manual", signal: AbortSignal.timeout(timeoutMs),
      headers: { "Cache-Control": "no-cache", "User-Agent": "ZIGoals-Alpha-Smoke" },
    });
    let body;
    try { const text = await response.text(); body = text.length <= 1024 ? JSON.parse(text) : undefined; } catch { body = undefined; }
    const valid = response.status === 200 && body !== null && typeof body === "object" && !Array.isArray(body) &&
      Object.keys(body).sort().join(",") === "policyWindowEnd,version" && body.version === 1 &&
      typeof body.policyWindowEnd === "string" && ISO.test(body.policyWindowEnd);
    return { httpStatus: response.status, policyWindowEnd: valid ? body.policyWindowEnd : null };
  } catch {
    return { httpStatus: null, policyWindowEnd: null };
  }
}
