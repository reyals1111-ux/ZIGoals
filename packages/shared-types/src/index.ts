import { z } from "zod";
export const CATEGORIES = [
  "Emergency Fund",
  "First Home",
  "Travel",
  "Education",
  "Financial Freedom",
  "Custom",
] as const;
export const moneySchema = z
  .string()
  .max(60)
  .regex(
    /^(0|[1-9]\d{0,35})(\.\d{1,18})?$/,
    "Enter a positive decimal amount without separators.",
  );
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(d.getTime()) &&
      d.toISOString().slice(0, 10) === value &&
      value >= "1900-01-01" &&
      value <= "9999-12-31"
    );
  }, "Choose a valid date.");
export const metadataSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  category: z.enum(CATEGORIES),
  targetValue: moneySchema.refine(
    (v) => /[1-9]/.test(v),
    "Target must be greater than zero.",
  ),
  currency: z.enum(["ZIG", "EUR", "USD"]),
  targetDate: dateSchema,
  startingAmount: moneySchema,
  monthlyContribution: moneySchema,
  riskPreference: z.enum(["Conservative", "Balanced", "Growth"]),
  liquidityPreference: z.enum(["Anytime", "Within a month", "Flexible"]),
  deadlineFlexible: z.boolean(),
  notes: z.string().max(500),
});
export type GoalMetadata = z.infer<typeof metadataSchema>;
export const backupSchema = z.strictObject({
  schemaVersion: z.literal(1),
  chainId: z.string().min(1).max(80),
  walletAddress: z.string().min(1).max(100),
  goals: z.record(z.string().regex(/^[1-9]\d{0,19}$/), metadataSchema),
});
export type GoalBackup = z.infer<typeof backupSchema>;
export function validateMetadata(input: unknown): GoalMetadata {
  return metadataSchema.parse(input);
}
export function parseBackup(
  input: string,
  chain: string,
  owner: string,
): GoalBackup {
  if (
    input.length > 1000000 ||
    new TextEncoder().encode(input).length > 1000000
  )
    throw new Error("Backup exceeds 1 MB.");
  const raw: unknown = JSON.parse(input);
  // Check raw keys before schema parsing, which may omit prototype keys.
  if (
    raw &&
    typeof raw === "object" &&
    "goals" in raw &&
    raw.goals &&
    typeof raw.goals === "object"
  ) {
    for (const id of Object.keys(raw.goals)) {
      if (!/^[1-9]\d{0,19}$/.test(id))
        throw new Error("Invalid goal ID in backup.");
    }
  }
  const data = backupSchema.parse(raw);
  if (data.chainId !== chain || data.walletAddress !== owner)
    throw new Error("This backup belongs to a different network or wallet.");
  if (Object.keys(data.goals).length > 1000)
    throw new Error("Backup contains too many goals.");
  return data;
}
export function metadataKey(chain: string, owner: string): string {
  return `zigoals:metadata:v1:${encodeURIComponent(chain)}:${encodeURIComponent(owner)}`;
}
export type TransactionState =
  | "IDLE"
  | "AWAITING_SIGNATURE"
  | "BROADCASTING"
  | "CONFIRMING"
  | "SUCCESS"
  | "FAILED"
  | "REJECTED";
export type WalletState =
  | "UNAVAILABLE"
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "REJECTED"
  | "WRONG_NETWORK"
  | "ADDING_TESTNET"
  | "ACCOUNT_CHANGED"
  | "RECONNECT_REQUIRED"
  | "RPC_UNAVAILABLE";
