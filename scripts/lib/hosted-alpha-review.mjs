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

/**
 * The Connection diagnostics REST row naming one of the reviewed zigchaind versions (Session X Part 1). Session Z-Cloud
 * Part 1: the row is read from the panel's textContent, where the version runs straight into the next row's words
 * ("… · v5.1.2Goal Manager"), so `\b` found no boundary between "2" and "G" and the owner's run on #34 (2026-10-10)
 * failed although the page showed the row. The end is now "no further digit or dot": "v5.1.2" never matches "v5.1.20"
 * or "v5.1.2.1", and any following word is fine.
 * @param {readonly string[]} versions
 */
export function reviewedRestPattern(versions) {
  // Session AJ (ADR-035 D1): a string is already a pattern fragment (reviewedVersionPattern: any patch of a reviewed line).
  const alternatives = typeof versions === "string" ? versions : versions.map(version => version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`Verified zig-test-2 · azig · 18 decimals · (?:${alternatives})(?![\\d.-])`);
}

/**
 * Session AJ (ADR-035 A3): stage 4 reads zig-test-2's application version and, on a base-fee line (v6.0), its x/feemarket
 * base fee — read-only GETs from the verifier itself, never the page — and returns a line for the report. A v6 node that
 * cannot give its base fee is a stage-4 finding (it throws), since the staking quote prices from it.
 * @param {typeof fetch} fetcher
 * @param {{restUrl: string, chainId: string, checkVersion: (chainId: unknown, version: unknown) => {ok: boolean, fee?: string, reason?: string}, parseBaseFee: (raw: unknown, form: string) => bigint, formatGazig: (n: bigint) => string, basePath: string}} chain
 */
export async function readLiveBaseFee(fetcher, chain) {
  const get = async path => {
    const response = await fetcher(chain.restUrl + path, { method: "GET", redirect: "error", signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw Error(`stage 4: ${chain.chainId} answered ${response.status} for ${path}`);
    return response.json();
  };
  const node = await get("/cosmos/base/tendermint/v1beta1/node_info");
  const version = node?.application_version?.version;
  if (node?.default_node_info?.network !== chain.chainId) throw Error(`stage 4: the REST node is not ${chain.chainId}`);
  const check = chain.checkVersion(chain.chainId, version);
  if (!check.ok) throw Error(`stage 4: ${chain.chainId} reports ${String(version)}, outside the reviewed lines (${check.reason})`);
  if (check.fee !== "base-fee") return { version, fee: check.fee, line: `${chain.chainId} ${version}: fixed fee model (no base fee on this line)` };
  let raw;
  try { raw = (await get(chain.basePath))?.base_fee; } catch { raw = undefined; }
  let value;
  try { value = chain.parseBaseFee(raw, "decimal"); } catch { throw Error(`stage 4: ${chain.chainId} is on ${version} but its base fee could not be read (finding)`); }
  return { version, fee: check.fee, baseFee: value.toString(), line: `${chain.chainId} ${version}: base fee ${chain.formatGazig(value)} per gas` };
}
