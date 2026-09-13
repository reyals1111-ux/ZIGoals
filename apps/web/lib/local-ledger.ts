import type { Goal } from "@zigoals/shared-types/contract";
import { TESTNET } from "@zigoals/chain-config";
import { z } from "zod";
export type LocalGoal = Goal;
export interface Activity {
  action: string;
  goalId: string;
  amount: string;
  timestamp: string;
  hash?: string;
  height?: number;
  local: boolean;
}
export interface LocalLedger {
  schemaVersion: 1;
  balance: string;
  nextId: string;
  goals: LocalGoal[];
  activity: Activity[];
}
export type LocalAction =
  | { kind: "create" }
  | { kind: "deposit" | "withdraw"; id: string; amount: string }
  | { kind: "close"; id: string };
export function initialLedger(): LocalLedger {
  return {
    schemaVersion: 1,
    balance: "1000000000000000000000",
    nextId: "1",
    goals: [],
    activity: [],
  };
}
export const LOCAL_CHAIN = "local-simulation";
export const LOCAL_OWNER = "local-demo-user";
export const LOCAL_LEDGER_ERROR =
  "Local demo data is damaged. Your stored data has not been changed. Export your goal plans before restoring the demo data.";
const localId = z
  .string()
  .refine(
    (value) =>
      /^[1-9]\d{0,19}$/.test(value) && BigInt(value) <= 18446744073709551615n,
  );
const localAmount = z
  .string()
  .refine(
    (value) =>
      /^(0|[1-9]\d{0,38})$/.test(value) &&
      BigInt(value) <= 340282366920938463463374607431768211455n,
  );
const localTimestamp = z.string().refine((value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
});
const localGoalSchema = z.strictObject({
  id: localId,
  owner: z.literal(LOCAL_OWNER),
  base_denom: z.literal(TESTNET.nativeAsset.baseDenom),
  strategy_id: z.literal("idle"),
  created_at: localTimestamp,
  total_deposited: localAmount,
  total_withdrawn: localAmount,
  position_units: localAmount,
  status: z.enum(["active", "closed"]),
  metadata_commitment: z.null(),
});
const localLedgerSchema = z.strictObject({
  schemaVersion: z.literal(1),
  balance: localAmount,
  nextId: localId,
  goals: z.array(localGoalSchema),
  activity: z.array(
    z.strictObject({
      action: z.enum([
        "Goal created",
        "Added funds",
        "Withdrew funds",
        "Goal closed",
      ]),
      goalId: localId,
      amount: localAmount,
      timestamp: localTimestamp,
      local: z.literal(true),
    }),
  ),
});
export function parseLocalLedger(raw: string): LocalLedger {
  try {
    const ledger = localLedgerSchema.parse(JSON.parse(raw));
    let balance = BigInt(initialLedger().balance);
    const history = new Map<
      string,
      {
        createdAt: string;
        deposited: bigint;
        withdrawn: bigint;
        position: bigint;
        status: "active" | "closed";
      }
    >();
    // Replay the complete local-only history without mutating persisted data.
    // This checks both conservation and the displayed activity against funds.
    for (let index = ledger.activity.length - 1; index >= 0; index--) {
      const event = ledger.activity[index]!;
      const amount = BigInt(event.amount);
      if (event.action === "Goal created") {
        if (event.goalId !== String(history.size + 1) || amount !== 0n)
          throw Error();
        history.set(event.goalId, {
          createdAt: event.timestamp,
          deposited: 0n,
          withdrawn: 0n,
          position: 0n,
          status: "active",
        });
        continue;
      }
      const goal = history.get(event.goalId);
      if (!goal || goal.status !== "active") throw Error();
      if (event.action === "Goal closed") {
        if (amount !== 0n || goal.position !== 0n) throw Error();
        goal.status = "closed";
      } else {
        if (amount <= 0n) throw Error();
        if (event.action === "Added funds") {
          if (amount > balance) throw Error();
          balance -= amount;
          goal.position += amount;
          goal.deposited += amount;
        } else {
          if (amount > goal.position) throw Error();
          balance += amount;
          goal.position -= amount;
          goal.withdrawn += amount;
        }
      }
    }
    if (
      ledger.balance !== balance.toString() ||
      ledger.nextId !== String(history.size + 1) ||
      ledger.goals.length !== history.size
    )
      throw Error();
    for (const goal of ledger.goals) {
      const expected = history.get(goal.id);
      if (
        !expected ||
        goal.created_at !== expected.createdAt ||
        goal.total_deposited !== expected.deposited.toString() ||
        goal.total_withdrawn !== expected.withdrawn.toString() ||
        goal.position_units !== expected.position.toString() ||
        goal.status !== expected.status
      )
        throw Error();
      history.delete(goal.id);
    }
    return ledger;
  } catch (cause) {
    throw new Error(LOCAL_LEDGER_ERROR, { cause });
  }
}
export function applyLocal(
  ledger: LocalLedger,
  action: LocalAction,
  now: string,
): LocalLedger {
  const next = structuredClone(ledger);
  let id: string;
  let amount = "0";
  if (action.kind === "create") {
    id = next.nextId;
    next.nextId = (BigInt(id) + 1n).toString();
    next.goals.push({
      id,
      owner: LOCAL_OWNER,
      base_denom: TESTNET.nativeAsset.baseDenom,
      strategy_id: "idle",
      created_at: now,
      total_deposited: "0",
      total_withdrawn: "0",
      position_units: "0",
      status: "active",
      metadata_commitment: null,
    });
  } else {
    id = action.id;
    const goal = next.goals.find((g) => g.id === id);
    if (!goal) throw new Error("Goal could not be found.");
    if (goal.status !== "active") throw new Error("This goal is closed.");
    if (action.kind === "close") {
      if (BigInt(goal.position_units) !== 0n)
        throw new Error("Withdraw the remaining position before closing.");
      goal.status = "closed";
    } else {
      amount = action.amount;
      if (!/^[1-9]\d*$/.test(amount) || amount.length > 39)
        throw new Error("Enter a positive whole base-unit amount.");
      const n = BigInt(amount);
      if (action.kind === "deposit") {
        if (n > BigInt(next.balance))
          throw new Error("Insufficient demo balance.");
        next.balance = (BigInt(next.balance) - n).toString();
        goal.position_units = (BigInt(goal.position_units) + n).toString();
        goal.total_deposited = (BigInt(goal.total_deposited) + n).toString();
      } else {
        if (n > BigInt(goal.position_units))
          throw new Error("Amount exceeds the available position.");
        goal.position_units = (BigInt(goal.position_units) - n).toString();
        goal.total_withdrawn = (BigInt(goal.total_withdrawn) + n).toString();
        next.balance = (BigInt(next.balance) + n).toString();
      }
    }
  }
  next.activity.unshift({
    action:
      action.kind === "create"
        ? "Goal created"
        : action.kind === "deposit"
          ? "Added funds"
          : action.kind === "withdraw"
            ? "Withdrew funds"
            : "Goal closed",
    goalId: id,
    amount,
    timestamp: now,
    local: true,
  });
  return next;
}
