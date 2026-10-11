import { expect, test } from "vitest";
import { validateMetadata, parseBackup, metadataKey } from "./index";
const metadata = {
  name: "First home",
  category: "First Home",
  targetValue: "25000",
  currency: "EUR",
  targetDate: "2028-02-29",
  startingAmount: "20",
  monthlyContribution: "100",
  riskPreference: "Conservative",
  liquidityPreference: "Anytime",
  deadlineFlexible: false,
  notes: "",
};
const backup = {
  schemaVersion: 1,
  chainId: "zig-test-2",
  walletAddress: "zig1owner",
  goals: { "1": metadata },
};
test("valid private plan is preserved", () =>
  expect(validateMetadata(metadata)).toEqual(metadata));
test.each([
  { targetValue: "0" },
  { targetValue: "NaN" },
  { targetDate: "2027-02-29" },
  { monthlyContribution: "-1" },
  { name: "" },
  { currency: "BTC" },
])("rejects invalid financial plan %j", (change) =>
  expect(() => validateMetadata({ ...metadata, ...change })).toThrow(),
);
test("import validates network and owner before returning any records", () => {
  expect(
    parseBackup(JSON.stringify(backup), "zig-test-2", "zig1owner"),
  ).toEqual(backup);
  expect(() =>
    parseBackup(JSON.stringify(backup), "zigchain-1", "zig1owner"),
  ).toThrow();
  expect(() =>
    parseBackup(JSON.stringify(backup), "zig-test-2", "zig1other"),
  ).toThrow();
});
test("unsupported version and partial invalid backups are rejected atomically", () => {
  expect(() =>
    parseBackup(
      JSON.stringify({ ...backup, schemaVersion: 2 }),
      "zig-test-2",
      "zig1owner",
    ),
  ).toThrow();
  expect(() =>
    parseBackup(
      JSON.stringify({
        ...backup,
        goals: { "1": metadata, "2": { ...metadata, targetValue: "bad" } },
      }),
      "zig-test-2",
      "zig1owner",
    ),
  ).toThrow();
});
test("keys isolate network and owner", () => {
  expect(metadataKey("zig-test-2", "a")).not.toBe(
    metadataKey("zig-test-2", "b"),
  );
  expect(metadataKey("zig-test-2", "a")).not.toBe(
    metadataKey("local-simulation", "a"),
  );
});
test.each([
  "__proto__",
  "constructor",
  "prototype",
  "0",
  "01",
  "1.5",
  "184467440737095516160",
])(
  "invalid raw goal key %s is rejected instead of silently discarded",
  (id) => {
    const raw = JSON.stringify({
      ...backup,
      goals: { "1": metadata, [id]: metadata },
    });
    expect(Object.keys(JSON.parse(raw).goals)).toContain(id);
    expect(() => parseBackup(raw, "zig-test-2", "zig1owner")).toThrow();
  },
);
test("backup limit counts UTF-8 bytes so accepted exports remain importable", () => {
  const goals = Object.fromEntries(
    Array.from({ length: 600 }, (_, index) => [
      String(index + 1),
      { ...metadata, notes: "旅".repeat(500) },
    ]),
  );
  const raw = JSON.stringify({ ...backup, goals });
  expect(raw.length).toBeLessThan(1000000);
  expect(new TextEncoder().encode(raw).length).toBeGreaterThan(1000000);
  expect(() => parseBackup(raw, "zig-test-2", "zig1owner")).toThrow(/1 MB/i);
});
