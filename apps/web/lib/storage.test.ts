import { expect, test, vi } from "vitest";
import {
  metadataKey,
  type GoalBackup,
  type GoalMetadata,
} from "@zigoals/shared-types";
import {
  importMetadata,
  loadMetadata,
  saveMetadata,
  withStorageLock,
} from "./storage";

class MemoryStorage implements Storage {
  readonly data = new Map<string, string>();
  failWrites?: (key: string) => boolean;
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.failWrites?.(key)) throw new Error("Storage quota exceeded.");
    this.data.set(key, value);
  }
}
const chain = "local-simulation";
const owner = "local-demo-user";
const key = metadataKey(chain, owner);
const plan: GoalMetadata = {
  name: "A private plan",
  category: "Travel",
  targetValue: "1200",
  currency: "ZIG",
  targetDate: "2027-01-01",
  startingAmount: "0",
  monthlyContribution: "10",
  riskPreference: "Conservative",
  liquidityPreference: "Anytime",
  deadlineFlexible: false,
  notes: "Keep me",
};
function backup(goals: GoalBackup["goals"] = { "1": plan }): GoalBackup {
  return { schemaVersion: 1, chainId: chain, walletAddress: owner, goals };
}
const writers = {
  import: (storage: Storage) =>
    importMetadata(storage, JSON.stringify(backup()), chain, owner),
  recreate: (storage: Storage) =>
    saveMetadata(storage, chain, owner, "1", plan),
};

for (const [name, write] of Object.entries(writers)) {
  test.each([
    ["malformed JSON", "  { damaged\n"],
    ["empty stored value", ""],
    [
      "invalid nested metadata",
      JSON.stringify(backup({ "2": { ...plan, name: "" } })),
    ],
    [
      "different network",
      JSON.stringify({ ...backup(), chainId: "other-chain" }),
    ],
    [
      "different wallet",
      JSON.stringify({ ...backup(), walletAddress: "other-owner" }),
    ],
  ])(
    `${name} preserves exact %s before accepting validated plans`,
    (_, raw) => {
      const storage = new MemoryStorage();
      storage.setItem(key, raw);
      const result = write(storage);
      expect(result.record).toEqual(backup());
      expect(result.recovery?.quarantineKey).toMatch(
        new RegExp(`^${key}:quarantine:`),
      );
      expect(storage.getItem(result.recovery!.quarantineKey)).toBe(raw);
      expect(loadMetadata(storage, chain, owner)).toEqual(backup());
    },
  );
  test(`${name} leaves active damaged bytes unchanged when quarantine storage fails`, () => {
    const storage = new MemoryStorage();
    storage.setItem(key, "{damaged");
    storage.failWrites = (candidate) => candidate !== key;
    expect(() => write(storage)).toThrow(/quota/i);
    expect([...storage.data]).toEqual([[key, "{damaged"]]);
  });
  test(`${name} preserves original bytes if active replacement fails`, () => {
    const storage = new MemoryStorage();
    storage.setItem(key, "{damaged");
    storage.failWrites = (candidate) => candidate === key;
    expect(() => write(storage)).toThrow(/quota/i);
    expect(storage.getItem(key)).toBe("{damaged");
    expect([...storage.data.values()]).toEqual(["{damaged", "{damaged"]);
  });
  test(`${name} preserves healthy plans on storage failure`, () => {
    const storage = new MemoryStorage();
    const original = JSON.stringify(backup({ "2": plan }));
    storage.setItem(key, original);
    storage.failWrites = () => true;
    expect(() => write(storage)).toThrow(/quota/i);
    expect([...storage.data]).toEqual([[key, original]]);
  });
}

test("repeated recovery retains earlier quarantines and isolates other scopes", () => {
  const storage = new MemoryStorage();
  const otherKey = metadataKey("other-chain", owner);
  storage.setItem(otherKey, "other-scope");
  storage.setItem(key, "first damaged bytes");
  const first = writers.import(storage);
  storage.setItem(key, "second damaged bytes");
  const second = writers.recreate(storage);
  expect(first.recovery!.quarantineKey).not.toBe(
    second.recovery!.quarantineKey,
  );
  expect(storage.getItem(first.recovery!.quarantineKey)).toBe(
    "first damaged bytes",
  );
  expect(storage.getItem(second.recovery!.quarantineKey)).toBe(
    "second damaged bytes",
  );
  expect(storage.getItem(otherKey)).toBe("other-scope");
});

test("healthy import replaces matching plans and preserves other valid plans", () => {
  const storage = new MemoryStorage();
  const previousPlan = { ...plan, name: "Keep this goal" };
  storage.setItem(
    key,
    JSON.stringify(
      backup({ "1": { ...plan, name: "Replace me" }, "2": previousPlan }),
    ),
  );
  const result = writers.import(storage);
  expect(result.record.goals).toEqual({ "1": plan, "2": previousPlan });
  expect(result.recovery).toBeUndefined();
  expect(storage.length).toBe(1);
});

test("healthy save preserves other plans and does not create quarantine", () => {
  const storage = new MemoryStorage();
  storage.setItem(key, JSON.stringify(backup({ "2": plan })));
  expect(writers.recreate(storage).record.goals).toEqual({
    "1": plan,
    "2": plan,
  });
  expect(storage.length).toBe(1);
});

test.each(["healthy", "damaged"])(
  "invalid incoming import leaves all %s storage untouched",
  (state) => {
    const storage = new MemoryStorage();
    storage.setItem(
      key,
      state === "healthy" ? JSON.stringify(backup()) : "{damaged",
    );
    const before = [...storage.data];
    for (const invalid of [
      "not JSON",
      JSON.stringify({ ...backup(), schemaVersion: 2 }),
      JSON.stringify({ ...backup(), walletAddress: "other-owner" }),
    ]) {
      expect(() => importMetadata(storage, invalid, chain, owner)).toThrow();
      expect([...storage.data]).toEqual(before);
    }
  },
);

test.each(["0", "__proto__", "100000000000000000000"])(
  "invalid recreate ID %s cannot mutate even damaged storage",
  (id) => {
    const storage = new MemoryStorage();
    storage.setItem(key, "{damaged");
    expect(() => saveMetadata(storage, chain, owner, id, plan)).toThrow();
    expect([...storage.data]).toEqual([[key, "{damaged"]]);
  },
);

test("invalid recreated metadata cannot mutate damaged storage", () => {
  const storage = new MemoryStorage();
  storage.setItem(key, "{damaged");
  expect(() =>
    saveMetadata(storage, chain, owner, "1", { ...plan, name: "" }),
  ).toThrow();
  expect([...storage.data]).toEqual([[key, "{damaged"]]);
});

function manyPlans(start: number, count: number, value = plan) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, i) => [String(start + i), value]),
  );
}
test("import validates the merged goal count before writing", () => {
  const storage = new MemoryStorage();
  const original = JSON.stringify(backup(manyPlans(1, 501)));
  storage.setItem(key, original);
  expect(() =>
    importMetadata(
      storage,
      JSON.stringify(backup(manyPlans(502, 501))),
      chain,
      owner,
    ),
  ).toThrow(/too many goals/i);
  expect([...storage.data]).toEqual([[key, original]]);
});
test("save validates the resulting goal count before writing", () => {
  const storage = new MemoryStorage();
  const original = JSON.stringify(backup(manyPlans(1, 1000)));
  storage.setItem(key, original);
  expect(() => saveMetadata(storage, chain, owner, "1001", plan)).toThrow(
    /too many goals/i,
  );
  expect([...storage.data]).toEqual([[key, original]]);
});
test("import validates the serialized merged size before writing", () => {
  const storage = new MemoryStorage();
  const longPlan = { ...plan, notes: "\n".repeat(500) };
  const original = JSON.stringify(backup(manyPlans(1, 400, longPlan)));
  storage.setItem(key, original);
  expect(() =>
    importMetadata(
      storage,
      JSON.stringify(backup(manyPlans(401, 400, longPlan))),
      chain,
      owner,
    ),
  ).toThrow(/1 MB/i);
  expect([...storage.data]).toEqual([[key, original]]);
});
test("import validates merged UTF-8 bytes before changing active plans", () => {
  const storage = new MemoryStorage();
  const unicodePlan = { ...plan, notes: "旅".repeat(500) };
  const original = JSON.stringify(backup(manyPlans(1, 300, unicodePlan)));
  storage.setItem(key, original);
  expect(() =>
    importMetadata(
      storage,
      JSON.stringify(backup(manyPlans(301, 300, unicodePlan))),
      chain,
      owner,
    ),
  ).toThrow(/1 MB/i);
  expect([...storage.data]).toEqual([[key, original]]);
});

for (const [name, write] of Object.entries(writers)) {
  test(`${name} refuses future metadata without touching any key`, () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ ...backup(), schemaVersion: 2 });
    storage.setItem(key, raw);
    expect(() => write(storage)).toThrow(/unsupported|newer/i);
    expect([...storage.data]).toEqual([[key, raw]]);
  });
}
test("stale metadata save refuses to overwrite another tab's plan", () => {
  const storage = new MemoryStorage();
  saveMetadata(storage, chain, owner, "1", plan);
  const before = [...storage.data];
  expect(() =>
    saveMetadata(storage, chain, owner, "1", { ...plan, name: "Stale" }, null),
  ).toThrow(/changed|review/i);
  expect([...storage.data]).toEqual(before);
});

test("stale import refuses to overwrite newer plans without touching bytes", () => {
  const storage = new MemoryStorage();
  const initial = JSON.stringify(backup());
  storage.setItem(key, initial);
  const newer = JSON.stringify(
    backup({ "1": { ...plan, name: "Changed elsewhere" } }),
  );
  storage.setItem(key, newer);
  expect(() => importMetadata(storage, initial, chain, owner, initial)).toThrow(
    /changed|review/i,
  );
  expect([...storage.data]).toEqual([[key, newer]]);
});
test("unavailable Web Locks refuses an application write", async () => {
  vi.stubGlobal("navigator", {});
  let written = false;
  try {
    await expect(
      withStorageLock(key, () => {
        written = true;
      }),
    ).rejects.toThrow(/cross-tab storage.*unavailable/i);
    expect(written).toBe(false);
  } finally {
    vi.unstubAllGlobals();
  }
});
