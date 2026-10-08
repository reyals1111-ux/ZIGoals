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

export * from "./links";
