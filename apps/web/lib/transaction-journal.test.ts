import { expect, test } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  TransactionJournal,
  newOperation,
  pendingDescription,
  recoveryCandidates,
  journalRevision,
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

test("concurrent operations cannot claim the same signed hash", async () => {
  const { factory, journal } = setup();
  const other = new TransactionJournal(factory);
  const a = newOperation(identity),
    b = newOperation(identity);
  await journal.create(a);
  await other.create(b);
  const results = await Promise.allSettled([
    journal.transition(a.operationId, {
      state: "BROADCASTING",
      hash: "B".repeat(64),
    }),
    other.transition(b.operationId, {
      state: "BROADCASTING",
      hash: "B".repeat(64),
    }),
  ]);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect(
    (await journal.load(identity.chainId, identity.wallet)).records.filter(
      (r) => r.hash,
    ),
  ).toHaveLength(1);
});
test("implausible times are retained with warnings and cannot crowd recent recovery", async () => {
  const { journal } = setup();
  const recent = newOperation(identity);
  await journal.create(recent);
  await journal.transition(recent.operationId, {
    state: "BROADCASTING",
    hash: "C".repeat(64),
  });
  for (let i = 0; i < 20; i++) {
    const future = {
      ...newOperation(identity),
      createdAt: Date.now() + 86400000,
      updatedAt: Date.now() + 86400000,
    };
    await journal.create(future);
    await journal.transition(future.operationId, {
      state: "BROADCASTING",
      hash: i.toString(16).toUpperCase().padStart(64, "0"),
    });
  }
  const loaded = await journal.load(identity.chainId, identity.wallet);
  expect(loaded.records).toHaveLength(21);
  expect(loaded.warnings.join(" ")).toMatch(/timestamp|time/i);
  expect(loaded.records[0]!.operationId).toBe(recent.operationId);
  expect(
    recoveryCandidates(loaded.records).map((record) => record.operationId),
  ).toEqual([recent.operationId]);
});

test("receipt recovery excludes reversed timestamps and terminal receipts with deterministic priority", () => {
  const now = Date.now();
  const old = {
    ...newOperation(identity),
    state: "BROADCASTING" as const,
    hash: "A".repeat(64),
    createdAt: now - 2000,
    updatedAt: now - 1000,
  };
  const recent = {
    ...old,
    operationId: crypto.randomUUID(),
    createdAt: now - 1000,
  };
  const reversed = {
    ...old,
    operationId: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now - 1,
  };
  const terminal = {
    ...old,
    operationId: crypto.randomUUID(),
    state: "CONFIRMED" as const,
    height: 10,
    code: 0,
  };
  expect(recoveryCandidates([reversed, terminal, old, recent], 1, now)).toEqual(
    [recent],
  );
});
test("scoped journal revision ignores unrelated contracts and input ordering", () => {
  const a = newOperation(identity),
    b = newOperation(identity);
  expect(journalRevision([a, b], identity.contract)).toBe(
    journalRevision(
      [b, a, newOperation({ ...identity, contract: "another" })],
      identity.contract,
    ),
  );
  expect(journalRevision([a, b], identity.contract)).not.toBe(
    journalRevision([a], identity.contract),
  );
});
test("future database version is refused and retains every stored value", async () => {
  const factory = new IDBFactory();
  const db = await new Promise<IDBDatabase>((resolve) => {
    const request = factory.open("zigoals:transaction-journal", 2);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("future", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
  });
  const original = { id: "new", payload: "retained future format" };
  await new Promise<void>((resolve) => {
    const tx = db.transaction("future", "readwrite");
    tx.objectStore("future").add(original);
    tx.oncomplete = () => resolve();
  });
  const journal = new TransactionJournal(factory);
  await expect(journal.create(newOperation(identity))).rejects.toThrow(
    /preserved/i,
  );
  expect(
    await new Promise((resolve) => {
      const request = db.transaction("future").objectStore("future").get("new");
      request.onsuccess = () => resolve(request.result);
    }),
  ).toEqual(original);
  db.close();
});
test("operation ID collision refuses before replacing an existing record", async () => {
  const { journal } = setup();
  const record = newOperation(identity);
  await journal.create(record);
  await expect(journal.create({ ...record, amount: "999" })).rejects.toThrow(
    /not saved/i,
  );
  expect(
    (await journal.load(identity.chainId, identity.wallet)).records,
  ).toEqual([record]);
});
test("a future row's lowercase signed hash claim is retained and blocks a duplicate", async () => {
  const { factory, journal } = setup();
  const record = newOperation(identity);
  await journal.create(record);
  const db = await new Promise<IDBDatabase>((resolve) => {
    const request = factory.open("zigoals:transaction-journal", 1);
    request.onsuccess = () => resolve(request.result);
  });
  const future = {
    operationId: "future-hash",
    version: 2,
    chainId: identity.chainId,
    hash: "a".repeat(64),
    payload: "untouched",
  };
  await new Promise<void>((resolve) => {
    const tx = db.transaction("operations", "readwrite");
    tx.objectStore("operations").put(future);
    tx.oncomplete = () => resolve();
  });
  await expect(
    journal.transition(record.operationId, {
      state: "BROADCASTING",
      hash: "A".repeat(64),
    }),
  ).rejects.toThrow(/already belongs/i);
  const retained = await new Promise((resolve) => {
    const request = db
      .transaction("operations")
      .objectStore("operations")
      .get("future-hash");
    request.onsuccess = () => resolve(request.result);
  });
  expect(retained).toEqual(future);
  expect(
    (await journal.load(identity.chainId, identity.wallet)).records,
  ).toEqual([record]);
  db.close();
});
