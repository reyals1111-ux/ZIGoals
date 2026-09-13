import { z } from "zod";
import { fromBech32 } from "@cosmjs/encoding";

export const roles = [
  "DIRECT_STRATEGY",
  "VAULT",
  "LIQUID_STAKING",
  "LIQUIDITY_ROUTER",
  "DEX",
  "LENDING",
  "ORIGINATOR",
  "CURATOR",
  "DISTRIBUTOR",
  "CUSTODY",
  "SERVICING",
  "FUNDING_RAIL",
  "BRIDGE",
  "EXPLORER",
  "ECOSYSTEM_TOOL",
] as const;
export type ProviderRole = (typeof roles)[number];
export const providerStatuses = [
  "DISCOVERED",
  "RESEARCHED",
  "VERIFIED",
  "INTEGRATED",
  "DISABLED",
] as const;
const text = z.string().min(1).max(5000);
const short = z.string().min(1).max(200);
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
const url = z
  .string()
  .refine(
    isSafeReferenceUrl,
    "Expected an HTTPS URL without credentials, controls or custom ports.",
  );
export const evidenceSchema = z.strictObject({
  url,
  title: short,
  supports: text,
});
export type EvidenceReference = z.infer<typeof evidenceSchema>;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
  });
export const providerSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
  name: short,
  roles: z.array(z.enum(roles)).min(1).max(10),
  website: url,
  documentation: z.array(url).max(20),
  networks: z
    .array(
      z.strictObject({
        chainId: short,
        status: z.enum([
          "LIVE_READ_VERIFIED",
          "DOCUMENTED",
          "ANNOUNCED",
          "UNCONFIRMED",
        ]),
        note: text,
      }),
    )
    .max(10),
  contracts: z
    .array(
      z.strictObject({
        chainId: short,
        address: short,
        purpose: short,
        evidence: evidenceSchema,
        status: z.enum(["LIVE_READ_VERIFIED", "DOCUMENTED", "HISTORICAL"]),
      }),
    )
    .max(30),
  // M2 deliberately admits only informational capabilities. This is not an execution permission model.
  capabilities: z
    .array(
      z.enum([
        "RESEARCH_METADATA",
        "EXPLORER_HOME",
        "EXPLORER_TRANSACTION",
        "EXPLORER_ACCOUNT",
        "EXPLORER_BLOCK",
        "EXPLORER_CONTRACT",
        "HUB_LINKS",
      ]),
    )
    .max(10),
  status: z.enum(providerStatuses),
  verification: z.enum([
    "UNCONFIRMED",
    "PRIMARY_SOURCES_REVIEWED",
    "READ_ONLY_ROUTES_VERIFIED",
  ]),
  lastVerified: date,
  risks: z.array(text).max(20),
  audits: z.array(evidenceSchema).max(20),
  eligibility: z.strictObject({
    kyc: z.enum([
      "REQUIRED",
      "NOT_REQUIRED_DOCUMENTED",
      "PRODUCT_DEPENDENT",
      "UNKNOWN",
    ]),
    jurisdiction: text,
    note: text,
  }),
  notes: text,
  sources: z.array(evidenceSchema).max(40),
  phase: z.enum(["READ_ONLY", "RESEARCH", "FUTURE_GATED", "DISABLED"]),
});
export type EcosystemProvider = z.infer<typeof providerSchema>;
export function parseProvider(value: unknown): EcosystemProvider {
  return providerSchema.parse(value);
}
/** No research lifecycle value grants signing, routing or investment authority. */
export function canExecuteProvider(provider: EcosystemProvider): false {
  void provider;
  return false;
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
