import { expect, test } from "vitest";
import {
  initialLedger,
  applyLocal,
  parseLocalLedger,
  type LocalLedger,
} from "./local-ledger";
const now = "2026-09-13T01:00:00.000Z";
test("local lifecycle conserves wallet plus position and preserves closed history", () => {
  const initial = initialLedger();
  let s = applyLocal(initial, { kind: "create" }, now);
  expect(s.goals[0]?.id).toBe("1");
  s = applyLocal(s, { kind: "deposit", id: "1", amount: "100" }, now);
  expect(s.balance).toBe((BigInt(initial.balance) - 100n).toString());
  expect(s.goals[0]?.position_units).toBe("100");
  expect(() => applyLocal(s, { kind: "close", id: "1" }, now)).toThrow();
  s = applyLocal(s, { kind: "withdraw", id: "1", amount: "40" }, now);
  expect(s.goals[0]?.position_units).toBe("60");
  s = applyLocal(s, { kind: "withdraw", id: "1", amount: "60" }, now);
  s = applyLocal(s, { kind: "close", id: "1" }, now);
  expect(s.goals[0]?.status).toBe("closed");
  expect(s.balance).toBe(initial.balance);
  expect(s.activity).toHaveLength(5);
  expect(() =>
    applyLocal(s, { kind: "deposit", id: "1", amount: "1" }, now),
  ).toThrow();
});
test.each(["0", "-1", "1.2", "NaN", "1000000000000000000001"])(
  "invalid deposits reject without mutating input %s",
  (amount) => {
    const s = applyLocal(initialLedger(), { kind: "create" }, now);
    const before = JSON.stringify(s);
    expect(() =>
      applyLocal(s, { kind: "deposit", id: "1", amount }, now),
    ).toThrow();
    expect(JSON.stringify(s)).toBe(before);
  },
);
test("rejects nonexisting and excessive withdrawal", () => {
  const s = applyLocal(initialLedger(), { kind: "create" }, now);
  expect(() =>
    applyLocal(s, { kind: "withdraw", id: "1", amount: "1" }, now),
  ).toThrow();
  expect(() =>
    applyLocal(s, { kind: "withdraw", id: "2", amount: "1" }, now),
  ).toThrow();
});

function fundedLedger() {
  return applyLocal(
    applyLocal(initialLedger(), { kind: "create" }, now),
    { kind: "deposit", id: "1", amount: "100" },
    now,
  );
}
test("persisted local ledger round-trips every lifecycle state", () => {
  let ledger = initialLedger();
  expect(parseLocalLedger(JSON.stringify(ledger))).toEqual(ledger);
  for (const action of [
    { kind: "create" },
    { kind: "deposit", id: "1", amount: "100" },
    { kind: "withdraw", id: "1", amount: "100" },
    { kind: "close", id: "1" },
    { kind: "create" },
  ] as const) {
    ledger = applyLocal(ledger, action, now);
    expect(parseLocalLedger(JSON.stringify(ledger))).toEqual(ledger);
  }
});

test.each([
  "not JSON",
  "null",
  "{}",
  JSON.stringify({ ...initialLedger(), schemaVersion: 2 }),
  JSON.stringify({ ...initialLedger(), activity: null }),
  JSON.stringify({ ...initialLedger(), extra: true }),
])(
  "damaged local envelope fails clearly without creating demo funds: %s",
  (raw) => {
    expect(() => parseLocalLedger(raw)).toThrow(/local demo data is damaged/i);
  },
);
test.each([
  "-1",
  "NaN",
  "1.2",
  "01",
  "",
  100,
  "340282366920938463463374607431768211456",
])("rejects invalid persisted balance %s", (balance) => {
  expect(() =>
    parseLocalLedger(JSON.stringify({ ...fundedLedger(), balance })),
  ).toThrow(/local demo data is damaged/i);
});
test.each([
  { owner: "another-wallet" },
  { base_denom: "wrong-denom" },
  { strategy_id: "yield" },
  { id: "0" },
  { id: "1.5" },
  { id: "01" },
  { id: "18446744073709551616" },
  { created_at: "not-a-date" },
  { created_at: "2026-02-31T00:00:00.000Z" },
  { total_deposited: "-100" },
  { total_withdrawn: {} },
  { position_units: "broken" },
  { status: "unknown" },
  { metadata_commitment: "unexpected-commitment" },
  { extra: "field" },
])("rejects invalid nested local goal %j", (change) => {
  const ledger = fundedLedger();
  expect(() =>
    parseLocalLedger(
      JSON.stringify({ ...ledger, goals: [{ ...ledger.goals[0], ...change }] }),
    ),
  ).toThrow(/local demo data is damaged/i);
});
test.each([
  { action: "Free money" },
  { goalId: "unknown" },
  { amount: "-1" },
  { amount: {} },
  { timestamp: "yesterday" },
  { local: false },
  { hash: "testnet-hash" },
  { height: 1 },
])("rejects invalid persisted local activity %j", (change) => {
  const ledger = fundedLedger();
  expect(() =>
    parseLocalLedger(
      JSON.stringify({
        ...ledger,
        activity: [
          { ...ledger.activity[0], ...change },
          ...ledger.activity.slice(1),
        ],
      }),
    ),
  ).toThrow(/local demo data is damaged/i);
});
test.each<[string, (ledger: LocalLedger) => void]>([
  [
    "wallet-plus-position inflation",
    (s) => {
      s.balance = "1000000000000000000000";
    },
  ],
  [
    "deposited total does not match position",
    (s) => {
      s.goals[0]!.total_deposited = "101";
    },
  ],
  [
    "withdrawn total exceeds deposits",
    (s) => {
      s.goals[0]!.total_withdrawn = "101";
    },
  ],
  [
    "closed goal retains funds",
    (s) => {
      s.goals[0]!.status = "closed";
    },
  ],
  [
    "next ID would collide",
    (s) => {
      s.nextId = "1";
    },
  ],
  [
    "next ID skips history",
    (s) => {
      s.nextId = "3";
    },
  ],
  [
    "duplicate goal IDs",
    (s) => {
      s.goals.push(structuredClone(s.goals[0]!));
    },
  ],
  [
    "missing activity",
    (s) => {
      s.activity = [];
    },
  ],
  [
    "activity amount contradicts funds",
    (s) => {
      s.activity[0]!.amount = "99";
    },
  ],
  [
    "creation carries funds",
    (s) => {
      s.activity[1]!.amount = "1";
    },
  ],
  [
    "creation timestamp differs",
    (s) => {
      s.goals[0]!.created_at = "2026-09-14T01:00:00.000Z";
    },
  ],
  [
    "nonpositive deposit",
    (s) => {
      s.activity[0]!.amount = "0";
    },
  ],
  [
    "activity before creation",
    (s) => {
      s.activity.reverse();
    },
  ],
])("rejects financial or history corruption: %s", (_, mutate) => {
  const ledger = fundedLedger();
  mutate(ledger);
  const raw = JSON.stringify(ledger);
  expect(() => parseLocalLedger(raw)).toThrow(/local demo data is damaged/i);
  expect(JSON.stringify(ledger)).toBe(raw);
});
