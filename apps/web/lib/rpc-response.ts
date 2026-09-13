import type { Goal } from "@zigoals/shared-types/contract";
import { TESTNET } from "@zigoals/chain-config";
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function uint(value: unknown, bits: number): value is string {
  return (
    typeof value === "string" &&
    value.length <= Math.ceil(bits * Math.LOG10E * Math.LN2) &&
    /^(0|[1-9][0-9]*)$/.test(value) &&
    BigInt(value) < (1n << BigInt(bits))
  );
}
export function parseBalance(value: unknown): string {
  if (
    !record(value) || !record(value.balance) ||
    value.balance.denom !== TESTNET.nativeAsset.baseDenom ||
    !uint(value.balance.amount, 256)
  ) throw Error("Testnet returned an invalid balance.");
  return value.balance.amount;
}
/** Contract Uint64 cursors are ordered numerically, not lexicographically. */
export function parseGoalPage(
  value: unknown, owner: string, after?: string,
): Goal[] {
  const fail = () => { throw Error("Invalid Goal Manager response."); };
  if (!record(value) || !Array.isArray(value.goals) || value.goals.length > 100)
    return fail();
  let previous = after === undefined ? -1n : BigInt(after);
  return value.goals.map((g: unknown) => {
    if (
      !record(g) || g.owner !== owner ||
      g.base_denom !== TESTNET.nativeAsset.baseDenom ||
      g.strategy_id !== "idle" || !uint(g.id, 64) ||
      BigInt(g.id) <= previous || !uint(g.created_at, 64) ||
      !uint(g.position_units, 128) || !uint(g.total_deposited, 128) ||
      !uint(g.total_withdrawn, 128) ||
      (g.status !== "active" && g.status !== "closed") ||
      (g.metadata_commitment != null && (
        typeof g.metadata_commitment !== "string" ||
        !/^[a-fA-F0-9]{64}$/.test(g.metadata_commitment)
      ))
    ) return fail();
    previous = BigInt(g.id);
    // Copy only the generated contract fields; discard unrelated RPC properties.
    return {
      id: g.id, owner: g.owner, base_denom: g.base_denom,
      strategy_id: g.strategy_id, created_at: g.created_at,
      position_units: g.position_units, total_deposited: g.total_deposited,
      total_withdrawn: g.total_withdrawn, status: g.status,
      metadata_commitment: g.metadata_commitment as string | null | undefined,
    };
  });
}
