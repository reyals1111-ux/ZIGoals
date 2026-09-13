import { test, expect } from "vitest";
import {
  runTransaction,
  TransactionFailure,
  type TransactionDriver,
} from "./transaction";
const base = (): TransactionDriver => ({
  assertFresh: async () => {},
  sign: async () => new Uint8Array([1]),
  broadcast: async () => "HASH",
  confirm: async (hash) => ({ hash, height: 12, code: 0, events: [] }),
});
test("states reflect actual signing broadcast and inclusion", async () => {
  const states: string[] = [];
  const tx = await runTransaction(base(), (s) => states.push(s));
  expect(tx.height).toBe(12);
  expect(states).toEqual([
    "AWAITING_SIGNATURE",
    "BROADCASTING",
    "CONFIRMING",
    "SUCCESS",
  ]);
});
test("wallet rejection is cancellation before broadcast", async () => {
  let sent = false;
  const d = base();
  d.sign = async () => {
    throw new Error("Request rejected");
  };
  d.broadcast = async () => {
    sent = true;
    return "HASH";
  };
  try {
    await runTransaction(d, () => {});
    throw Error("Expected rejection");
  } catch (e) {
    expect(e).toBeInstanceOf(TransactionFailure);
    expect((e as TransactionFailure).state).toBe("REJECTED");
    expect((e as TransactionFailure).uncertain).toBe(false);
  }
  expect(sent).toBe(false);
});
test("account changing during approval prevents broadcast", async () => {
  let fresh = true;
  let sent = false;
  const d = base();
  d.assertFresh = async () => {
    if (!fresh) throw Error("Account changed");
  };
  d.sign = async () => {
    fresh = false;
    return new Uint8Array([1]);
  };
  d.broadcast = async () => {
    sent = true;
    return "HASH";
  };
  await expect(runTransaction(d, () => {})).rejects.toThrow("Account changed");
  expect(sent).toBe(false);
});
test("confirmation timeout must not claim no funds moved", async () => {
  const d = base();
  d.confirm = async () => {
    throw Error("RPC timeout");
  };
  try {
    await runTransaction(d, () => {});
    throw Error("Expected failure");
  } catch (e) {
    expect((e as TransactionFailure).uncertain).toBe(true);
    expect((e as TransactionFailure).hash).toBe("HASH");
  }
});
test("included failed transaction is definite execution failure", async () => {
  const d = base();
  d.confirm = async (hash) => ({ hash, height: 13, code: 5, events: [] });
  await expect(runTransaction(d, () => {})).rejects.toMatchObject({
    uncertain: false,
    state: "FAILED",
  });
});

test("a broadcast hash stays available during confirmation and in the final result", async () => {
  let finish!: () => void;
  const confirmation = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let waiting!: () => void;
  const confirming = new Promise<void>((resolve) => {
    waiting = resolve;
  });
  const updates: unknown[] = [];
  const d = base();
  d.confirm = async (hash) => {
    waiting();
    await confirmation;
    return { hash, height: 12, code: 0, events: [] };
  };
  const transaction = runTransaction(d, (state, details) =>
    updates.push({ state, ...details }),
  );
  await confirming;
  expect(updates.at(-1)).toMatchObject({ state: "CONFIRMING", hash: "HASH" });
  finish();
  await transaction;
  expect(updates.at(-1)).toMatchObject({
    state: "SUCCESS",
    hash: "HASH",
    height: 12,
  });
});

test.each(["included failure", "confirmation timeout"])(
  "%s publishes the transaction hash and certainty",
  async (scenario) => {
    const updates: unknown[] = [];
    const d = base();
    d.confirm = async (hash) => {
      if (scenario === "confirmation timeout") throw Error("RPC timeout");
      return { hash, height: 12, code: 5, events: [] };
    };
    await expect(
      runTransaction(d, (state, details) =>
        updates.push({ state, ...details }),
      ),
    ).rejects.toBeInstanceOf(TransactionFailure);
    expect(updates.at(-1)).toMatchObject({
      state: "FAILED",
      hash: "HASH",
      uncertain: scenario === "confirmation timeout",
    });
  },
);
