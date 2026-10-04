// Session U Part 2b: the owner's scripts/verify-hosted-alpha.mjs never crashes on an answer it did not expect. Anything
// it cannot check becomes an explicit NEEDS_OWNER_REVIEW reason, and the live price check always runs.
//
// The crash it replaces: the nonce sample read `'nonce-…'` from every response with a CSP, the apex landing's CSP has
// no nonce, and `match(...)[1]` threw "Cannot read properties of null (reading '1')" before prices were checked.

const NONCE = /'nonce-([^']+)'/;

/** The CSP nonces of the Alpha's `/app` samples only (the apex landing serves a static CSP without one). Never throws. */
export function appNonceFindings(responses) {
  const samples = responses.filter(response => {
    try { return new URL(response.url).pathname === "/app"; } catch { return false; }
  });
  const nonces = [], findings = [];
  for (const response of samples) {
    const csp = response.headers?.["content-security-policy"];
    const nonce = typeof csp === "string" ? NONCE.exec(csp)?.[1] : undefined;
    if (nonce) nonces.push(nonce);
    else findings.push(`${response.url} sample ${response.sample}: no CSP script nonce`);
  }
  if (new Set(nonces).size !== nonces.length) findings.push("a CSP script nonce repeated across /app samples");
  return { nonces, findings };
}

/** Why the live price needs the owner's review, or undefined when it is VERIFIED. Closed-vocabulary fields only. */
export function priceFinding(probe) {
  if (!probe?.wellFormed) return `live prices: the market route did not answer a well-formed price envelope (${probe?.reason ?? "no answer"})`;
  if (probe.result !== "VERIFIED") return `live prices: ${probe.result} (${probe.pair}, ${probe.failure}); see docs/run11/ALPHA_PRICES_ROLLOUT.md`;
  return undefined;
}

/** One line for a check that threw, whatever it threw. At most 300 characters. */
export function reviewReason(where, error) {
  const message = error instanceof Error ? error.message : String(error);
  return `${where}: ${message.replace(/\s+/g, " ").trim().slice(0, 300 - where.length - 2)}`;
}

/** PASS only when nothing needs review and nothing was found; review reasons outrank findings. */
export function hostedStatus({ review, consoleErrors, failedRequests, layouts }) {
  if (review.length) return "NEEDS_OWNER_REVIEW";
  return consoleErrors.length || failedRequests.length || layouts.some(layout => !layout.pass) ? "COMPLETED_WITH_FINDINGS" : "PASS";
}
