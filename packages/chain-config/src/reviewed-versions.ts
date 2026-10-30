/**
 * Session AJ (ADR-035 D1, P2, P3, P5; `TIER 3 (chain config)`): the one rule for which zigchaind versions the app trusts,
 * per chain, and how each reviewed version prices a transaction.
 *
 * - A version is reviewed by its MINOR line (v5.1, v6.0): once a minor's upgrade notes are read, every patch of it
 *   (`vMAJOR.MINOR.PATCH`, digits only, no suffix) is accepted (D1, owner decision of 29 Oct).
 * - A newer minor or major than the newest reviewed one fails closed with its own plain sentence, NETWORK_UPGRADED, and
 *   keeps the version the node reported for the detail line. Anything else (an older line, a suffix such as `-rc1`, a
 *   malformed or missing value) fails closed as before.
 * - zig-test-2: v5.1 (Session X, docs/research/ZIGCHAIN_V5_1.md) and v6.0 (Session AJ, docs/research/ZIGCHAIN_V6.md;
 *   live v6.0.0 since height 8,423,210 on 27 Oct 2026).
 * - zigchain-1: v5.1 and v6.0. Mainnet stays on v5.1.2 until on-chain proposal #45 ("Software Upgrade to v6", ZIGChain
 *   Core Team, binaries in ZIGChain/networks) upgrades it at height 13,466,800 (about 3 Nov 2026 09:30 UTC); P2.
 *
 * Fee models (P3): v5.1 takes the node's fixed minimum gas price (2.5 Gazig per gas). v6.0 takes an EIP-1559 base fee
 * from `x/feemarket` (floor 2.5 Gazig, rising up to 1/8 per block): the quote reads it at quote time and prices at
 * max(floor, ceil(base fee × 1.5)).
 */
export type ReviewedChainId = "zig-test-2" | "zigchain-1";
export type FeeModel = "fixed" | "base-fee";
export type ReviewedMinor = Readonly<{ major: number; minor: number; fee: FeeModel }>;

export const REVIEWED_MINORS: Readonly<Record<ReviewedChainId, readonly ReviewedMinor[]>> = Object.freeze({
  "zig-test-2": Object.freeze([
    Object.freeze({ major: 5, minor: 1, fee: "fixed" as const }),
    Object.freeze({ major: 6, minor: 0, fee: "base-fee" as const }),
  ]),
  "zigchain-1": Object.freeze([
    Object.freeze({ major: 5, minor: 1, fee: "fixed" as const }),
    Object.freeze({ major: 6, minor: 0, fee: "base-fee" as const }),
  ]),
});

/** D1's sentence for a network that moved past every reviewed version. */
export const NETWORK_UPGRADED = "The network was upgraded; checks are pending.";

/** Thrown for a newer minor or major: carries the version the node reported, for the detail line. */
export class NetworkUpgradedError extends Error {
  readonly version: string;
  constructor(version: string) {
    super(NETWORK_UPGRADED);
    this.name = "NetworkUpgradedError";
    this.version = version;
  }
}

export type VersionCheck =
  | Readonly<{ ok: true; version: string; fee: FeeModel }>
  | Readonly<{ ok: false; reason: "upgraded"; version: string }>
  | Readonly<{ ok: false; reason: "unknown" }>;

const VERSION = /^v(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/;

/** Checks a node's application version against the chain's reviewed minors (fails closed). */
export function checkVersion(chainId: unknown, version: unknown): VersionCheck {
  const minors = typeof chainId === "string" ? REVIEWED_MINORS[chainId as ReviewedChainId] : undefined;
  const m = typeof version === "string" ? VERSION.exec(version) : null;
  if (!minors || !m || typeof version !== "string") return { ok: false, reason: "unknown" };
  const major = Number(m[1]), minor = Number(m[2]);
  const hit = minors.find((r) => r.major === major && r.minor === minor);
  if (hit) return { ok: true, version, fee: hit.fee };
  const newest = minors.reduce((a, b) => (b.major > a.major || (b.major === a.major && b.minor > a.minor) ? b : a));
  if (major > newest.major || (major === newest.major && minor > newest.minor)) return { ok: false, reason: "upgraded", version };
  return { ok: false, reason: "unknown" };
}

/** True when a version is one of the chain's reviewed patches. */
export function isReviewedVersion(chainId: unknown, version: unknown): boolean {
  return checkVersion(chainId, version).ok;
}

/**
 * The reviewed version, or throws: NetworkUpgradedError for a newer line, otherwise `changed` (each caller's existing
 * fail-closed words). Returns the version and its fee model.
 */
export function requireReviewedVersion(chainId: unknown, version: unknown, changed: string): Readonly<{ version: string; fee: FeeModel }> {
  const check = checkVersion(chainId, version);
  if (check.ok) return { version: check.version, fee: check.fee };
  if (check.reason === "upgraded") throw new NetworkUpgradedError(check.version);
  throw new Error(changed);
}

/** A regular-expression fragment matching any reviewed patch of the chain (for the hosted verifier's page check). */
export function reviewedVersionPattern(chainId: ReviewedChainId): string {
  return REVIEWED_MINORS[chainId].map((r) => `v${r.major}\\.${r.minor}\\.\\d+`).join("|");
}

/** The fixed floor every reviewed model keeps: the node minimum of v5.1 and the feemarket floor of v6.0, in azig per gas. */
export const GAS_PRICE_FLOOR = 2_500_000_000n;
/** The headroom over the current base fee (×1.5: about three full blocks of rise at 1/8 per block). */
export const BASE_FEE_HEADROOM = Object.freeze({ numerator: 3n, denominator: 2n });
/** A base fee above this (1,000 × the floor) is refused rather than quoted: no ordinary state of the chain reaches it. */
export const BASE_FEE_CEILING = GAS_PRICE_FLOOR * 1000n;
export const BASE_FEE_UNREADABLE = "The network fee could not be read just now. Nothing was signed. Try again in a minute.";
export const BASE_FEE_TOO_HIGH = "The network fee is unusually high right now. Nothing was signed. Try again later.";

/**
 * The base fee, in whole azig per gas (rounded up), from either form the chain gives it: the REST/JSON decimal
 * ("2500000000.000000000000000000") or the protobuf LegacyDec integer scaled by 10^18 ("2500000000000000000000000000").
 * Anything else, zero, or a value above BASE_FEE_CEILING throws.
 */
export function parseBaseFee(raw: unknown, form: "decimal" | "scaled"): bigint {
  if (typeof raw !== "string" || raw.length > 80) throw new Error(BASE_FEE_UNREADABLE);
  let value: bigint;
  if (form === "decimal") {
    const m = /^(\d{1,40})(?:\.(\d{1,18}))?$/.exec(raw);
    if (!m) throw new Error(BASE_FEE_UNREADABLE);
    const whole = BigInt(m[1]!), fraction = m[2] ?? "";
    value = whole + (/[1-9]/.test(fraction) ? 1n : 0n);
  } else {
    if (!/^\d{1,60}$/.test(raw)) throw new Error(BASE_FEE_UNREADABLE);
    const scaled = BigInt(raw), unit = 10n ** 18n;
    value = scaled / unit + (scaled % unit ? 1n : 0n);
  }
  if (value <= 0n) throw new Error(BASE_FEE_UNREADABLE);
  if (value > BASE_FEE_CEILING) throw new Error(BASE_FEE_TOO_HIGH);
  return value;
}

/** The gas price a quote uses, in azig per gas: the floor for a fixed model; max(floor, ceil(base fee × 1.5)) on v6. */
export function quotedGasPrice(fee: FeeModel, baseFee?: bigint): bigint {
  if (fee === "fixed") return GAS_PRICE_FLOOR;
  if (typeof baseFee !== "bigint" || baseFee <= 0n) throw new Error(BASE_FEE_UNREADABLE);
  const { numerator, denominator } = BASE_FEE_HEADROOM;
  const raised = (baseFee * numerator + denominator - 1n) / denominator;
  return raised > GAS_PRICE_FLOOR ? raised : GAS_PRICE_FLOOR;
}

/**
 * The base fee message from RPC `abci_query /cosmos.evm.feemarket.v1.Query/BaseFee`: QueryBaseFeeResponse has one field,
 * `base_fee` (field 1, a string). Decoded by hand (one length-delimited field), so no generated types are needed.
 */
export function decodeBaseFeeResponse(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array) || bytes.length < 2 || bytes.length > 200 || bytes[0] !== 0x0a) throw new Error(BASE_FEE_UNREADABLE);
  let length = 0, shift = 0, i = 1;
  for (; i < bytes.length && i < 6; i++) {
    const b = bytes[i]!;
    length |= (b & 0x7f) << shift;
    shift += 7;
    if ((b & 0x80) === 0) { i++; break; }
  }
  if (length <= 0 || i + length !== bytes.length) throw new Error(BASE_FEE_UNREADABLE);
  return new TextDecoder().decode(bytes.subarray(i, i + length));
}

/** A gas price in azig per gas as Gazig for people ("2.5 Gazig", "3.75 Gazig"; at most three decimals, rounded up). */
export function formatGazig(azigPerGas: bigint): string {
  const milli = (azigPerGas + 999_999n) / 1_000_000n;
  const whole = milli / 1000n, part = (milli % 1000n).toString().padStart(3, "0").replace(/0+$/, "");
  return `${whole}${part ? `.${part}` : ""} Gazig`;
}
/** The REST path of the v6 base fee (read-only; zig-test-2 and, after its upgrade, zigchain-1). */
export const BASE_FEE_REST_PATH = "/cosmos/evm/feemarket/v1/base_fee";
/** The RPC abci_query path of the same value (the browser's signing path reads it through the RPC it signs through). */
export const BASE_FEE_ABCI_PATH = "/cosmos.evm.feemarket.v1.Query/BaseFee";
