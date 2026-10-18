import * as z from "zod";
import { isSafeReferenceUrl } from "./links";

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
/**
 * Session AF (ADR-028 H25, H94; `TIER 3 (public-safety labels)`): the verified link registry. Each official link is a
 * literal URL that ZIGoals read once on `checkedAt` (one plain GET; `httpStatus` is what it answered). A site behind a
 * bot wall answers 401/403/429 to that read and is recorded as `unreadable-by-automation`: its URL still comes from the
 * official `source` named beside it. No query string unless the entry says `allowQuery` (only Keplr's own documented
 * staking deep link has one), never a fragment, never credentials or a custom port. `verified-links.ts` is the same list
 * without this schema, for pages that only link out; registry tests keep the two equal.
 */
export const officialLinkSchema = z
  .strictObject({
    kind: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
    url,
    checkedAt: date,
    check: z.enum(["ok", "unreadable-by-automation"]),
    httpStatus: z.number().int().min(100).max(599),
    source: url,
    allowQuery: z.literal(true).optional(),
  })
  .refine((link) => {
    const parsed = new URL(link.url);
    return !parsed.hash && (link.allowQuery === true) === !!parsed.search;
  }, "A query string only with allowQuery, and never a fragment.")
  .refine(
    (link) =>
      link.check === "ok"
        ? link.httpStatus >= 200 && link.httpStatus < 300
        : [401, 403, 429].includes(link.httpStatus),
    "The check result must match the recorded answer.",
  );
export type OfficialLink = z.infer<typeof officialLinkSchema>;
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
  officialLinks: z
    .array(officialLinkSchema)
    .max(30)
    .refine(
      (links) => new Set(links.map((link) => link.kind)).size === links.length,
      "Each link kind once per provider.",
    )
    .optional(),
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

export * from "./links";
