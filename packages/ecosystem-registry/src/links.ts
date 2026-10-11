// Session X Part 5a: the explorer catalogue and the Hub links, without zod, so pages that only link out (the Ecosystem
// page, the explorer links, Connection diagnostics) do not load the provider schemas. index.ts re-exports all of it.
import { fromBech32 } from "@cosmjs/encoding";

export function isSafeReferenceUrl(value: string): boolean {
  if (value.length > 2000 || /[\s\\\u0000-\u001f\u007f]/u.test(value))
    return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !!url.hostname
    );
  } catch {
    return false;
  }
}
export type ExplorerKind =
  | "transaction"
  | "account"
  | "block"
  | "contract"
  | "asset";
export interface ExplorerProvider {
  readonly id: "range" | "zigscan";
  readonly name: string;
  readonly chainId: string;
  readonly homepage: string;
  readonly routes: Readonly<
    Partial<
      Record<
        ExplorerKind,
        { readonly prefix: string; readonly evidence: string }
      >
    >
  >;
  readonly lastVerified: string;
}
const docs = "https://docs.zigchain.com/users/tools/block-explorers";
const source =
  "https://testnet.zigscan.org/_next/static/chunks/edf176db6934a663.js?dpl=dpl_ABC8wapwCuVtS9gTEE9Jadgzn7Qj";
// Routes are compiled, evidence-backed constants. Caller metadata cannot override them.
const catalogue: readonly ExplorerProvider[] = [
  {
    id: "range",
    name: "Range",
    chainId: "zig-test-2",
    homepage: "https://app.range.org/zigchain-testnet/general",
    routes: {},
    lastVerified: "2026-09-13",
  },
  {
    id: "zigscan",
    name: "ZIGScan",
    chainId: "zig-test-2",
    homepage: "https://testnet.zigscan.org/",
    routes: {
      transaction: {
        prefix: "https://testnet.zigscan.org/tx/",
        evidence: source,
      },
      account: {
        prefix: "https://testnet.zigscan.org/address/",
        evidence: source,
      },
      block: {
        prefix: "https://testnet.zigscan.org/block/",
        evidence: "https://testnet.zigscan.org/",
      },
      contract: {
        prefix: "https://testnet.zigscan.org/smart-contracts/contract/",
        evidence: source,
      },
    },
    lastVerified: "2026-09-13",
  },
];
for (const p of catalogue) {
  for (const route of Object.values(p.routes)) Object.freeze(route);
  Object.freeze(p.routes);
  Object.freeze(p);
}
export const explorers = Object.freeze(catalogue);
export const explorerEvidence = docs;
export function explorerHome(
  providerId: string,
  chainId: string,
): string | null {
  return (
    explorers.find((p) => p.id === providerId && p.chainId === chainId)
      ?.homepage ?? null
  );
}
function validAddress(value: string, kind: ExplorerKind): boolean {
  if (value !== value.toLowerCase()) return false;
  try {
    const { prefix, data } = fromBech32(value, 90);
    return (
      prefix === "zig" &&
      (kind === "contract"
        ? data.length === 32
        : data.length === 20 || data.length === 32)
    );
  } catch {
    return false;
  }
}
export function buildExplorerUrl(
  providerId: string,
  chainId: string,
  kind: ExplorerKind,
  identifier: string,
): string | null {
  const route = explorers.find(
    (p) => p.id === providerId && p.chainId === chainId,
  )?.routes[kind];
  if (!route || typeof identifier !== "string" || identifier.length > 100)
    return null;
  let normalized = identifier;
  if (kind === "transaction") {
    if (!/^[0-9a-fA-F]{64}$/.test(identifier)) return null;
    normalized = identifier.toUpperCase();
  } else if (kind === "block") {
    if (
      !/^[1-9]\d{0,15}$/.test(identifier) ||
      BigInt(identifier) > BigInt(Number.MAX_SAFE_INTEGER)
    )
      return null;
  } else if (kind === "account" || kind === "contract") {
    if (!validAddress(identifier, kind)) return null;
  } else return null;
  return route.prefix + encodeURIComponent(normalized);
}
export const hubLinks = Object.freeze(
  [
    {
      id: "overview",
      label: "Network overview",
      url: "https://hub.zigchain.com/",
      purpose: "Explore the official Hub",
      evidence: docs,
    },
    {
      id: "validators",
      label: "Validator information",
      url: "https://hub.zigchain.com/validators/",
      purpose: "Compare validators",
      evidence: "https://testnet.zigscan.org/",
    },
    {
      id: "governance",
      label: "Governance proposals",
      url: "https://hub.zigchain.com/proposals/",
      purpose: "Read network proposals",
      evidence: docs,
    },
    {
      id: "staking",
      label: "Staking information",
      url: "https://hub.zigchain.com/staking",
      purpose: "Review staking and unbonding information",
      evidence: docs,
    },
    {
      id: "bridge",
      label: "Bridge information",
      url: "https://hub.zigchain.com/bridge/",
      purpose: "Review supported transfer options",
      evidence: docs,
    },
  ].map((p) => Object.freeze(p)),
);
