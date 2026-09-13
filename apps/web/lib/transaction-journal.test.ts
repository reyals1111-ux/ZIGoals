import { expect, test } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  TransactionJournal,
  newOperation,
  pendingDescription,
} from "./transaction-journal";
const identity = {
  chainId: "zig-test-2",
  wallet: "zig1alice",
  contract: "zig1contract",
  action: "deposit" as const,
  goalId: "7",
  amount: "123",
  denom: "azig",
};
function setup() {
  const factory = new IDBFactory();
  return { factory, journal: new TransactionJournal(factory) };
}
test("restart restores original scope without replay and uses unique operation IDs", async () => {
  const { factory, journal } = setup();
  const first = newOperation(identity);
  const second = newOperation({ ...identity, wallet: "zig1bob" });
  expect(first.operationId).not.toBe(second.operationId);
  await journal.create(first);
  await journal.create(second);
  await journal.transition(first.operationId, {
    state: "BROADCASTING",
    hash: "A".repeat(64),
  });
  const reopened = new TransactionJournal(factory);
  expect(
    (await reopened.load(identity.chainId, identity.wallet)).records,
  ).toMatchObject([{ operationId: first.operationId, state: "BROADCASTING" }]);
  expect(
    (await reopened.load(identity.chainId, "zig1bob")).records,
  ).toHaveLength(1);
  expect(
    (await reopened.load("another-chain", identity.wallet)).records,
  ).toHaveLength(0);
});
test("atomic concurrent records and terminal receipts resist stale updates", async () => {
  const { factory, journal } = setup();
  const other = new TransactionJournal(factory);
  const a = newOperation(identity);
  const b = newOperation(identity);
  await Promise.all([journal.create(a), other.create(b)]);
  await journal.transition(a.operationId, {
    state: "BROADCASTING",
    hash: "A".repeat(64),
  });
  await journal.transition(a.operationId, {
    state: "CONFIRMED",
    height: 12,
    code: 0,
  });
  await Promise.all([
    other.transition(a.operationId, { state: "UNKNOWN_AFTER_BROADCAST" }),
    other.transition(b.operationId, { state: "REJECTED" }),
  ]);
  const records = (await journal.load(identity.chainId, identity.wallet))
    .records;
  expect(records.find((r) => r.operationId === a.operationId)?.state).toBe(
    "CONFIRMED",
  );
  expect(records.find((r) => r.operationId === b.operationId)?.state).toBe(
    "REJECTED",
  );
});
test("corrupt and future-schema records remain stored alongside valid history and visible warnings", async () => {
  const { factory, journal } = setup();
  await journal.create(newOperation(identity));
  const db = await new Promise<IDBDatabase>((resolve) => {
    const r = factory.open("zigoals:transaction-journal", 1);
    r.onsuccess = () => resolve(r.result);
  });
  await new Promise<void>((resolve) => {
    const tx = db.transaction("operations", "readwrite");
    tx.objectStore("operations").put({ operationId: "corrupt", version: 99 });
    tx.oncomplete = () => resolve();
  });
  const restored = await journal.load(identity.chainId, identity.wallet);
  expect(restored.records).toHaveLength(1);
  expect(restored.warnings.join(" ")).toMatch(/unreadable|unsupported/i);
  const count = await new Promise<number>((resolve) => {
    const r = db.transaction("operations").objectStore("operations").count();
    r.onsuccess = () => resolve(r.result);
  });
  expect(count).toBe(2);
  db.close();
});
test("stale signature and broadcast entries do not guess rejection or failure", () => {
  expect(pendingDescription(newOperation(identity))).toMatch(
    /another tab|wallet/i,
  );
  expect(
    pendingDescription({ ...newOperation(identity), state: "BROADCASTING" }),
  ).toMatch(/may have|uncertain/i);
});
test("private fields and oversized data fail validation before storing", async () => {
  const { journal } = setup();
  await expect(
    journal.create({ ...newOperation(identity), notes: "private" } as never),
  ).rejects.toThrow();
  await expect(
    journal.create({ ...newOperation(identity), amount: "1".repeat(2000) }),
  ).rejects.toThrow();
});

test("transitions cannot mutate original account or operation identity", async () => {
  const { journal } = setup();
  const record = newOperation(identity);
  await journal.create(record);
  await expect(
    journal.transition(record.operationId, {
      state: "BROADCASTING",
      hash: "A".repeat(64),
      wallet: "zig1bob",
    } as never),
  ).rejects.toThrow();
  expect(
    (await journal.load(identity.chainId, identity.wallet)).records,
  ).toHaveLength(1);
});
