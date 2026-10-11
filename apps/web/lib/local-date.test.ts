import { expect, test } from "vitest";
import { localDate, addLocalDays, localWeekday } from "./local-date";
test("calendar formatting reads local calendar fields rather than UTC", () => {
  const date = new Date(2026, 8, 15, 0, 5);
  expect(localDate(date)).toBe("2026-09-15");
});
test.each([["2026-03-28", 1, "2026-03-29"], ["2026-03-29", 1, "2026-03-30"], ["2026-10-25", 1, "2026-10-26"], ["2024-02-28", 1, "2024-02-29"], ["2026-01-01", -1, "2025-12-31"]] as const)("calendar addition crosses DST/leap/year boundaries %s", (d, n, expected) => expect(addLocalDays(d, n)).toBe(expected));
test("weekdays are Sunday zero and invalid dates are rejected", () => {
  expect(localWeekday("2026-09-13")).toBe(0);
  expect(localWeekday("2026-09-14")).toBe(1);
  expect(() => addLocalDays("2026-02-30", 1)).toThrow();
  expect(() => localWeekday("private arbitrary text")).toThrow();
});
