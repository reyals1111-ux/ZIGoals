import { describe, expect, it } from "vitest";
import { HABITS_KEY } from "./habits";
import { HEALTH_STORAGE_KEY } from "./health";
import { PLATFORM_KEY } from "./positions";
import { buildShowcase } from "./showcase-data";
import { exportFileName, isShowcaseBackup } from "./showcase-detect";

describe("Showcase demo backups are recognised without a format change (QA-17)", () => {
  const records = buildShowcase("2026-10-01").records;
  const parsed = (key: string) => JSON.parse(records[key]!);
  it("recognises each Showcase module", () => {
    expect(isShowcaseBackup("platform", parsed(PLATFORM_KEY))).toBe(true);
    expect(isShowcaseBackup("habits", parsed(HABITS_KEY))).toBe(true);
    expect(isShowcaseBackup("health", parsed(HEALTH_STORAGE_KEY))).toBe(true);
  });
  it("does not flag ordinary records, empty stores or other shapes", () => {
    const platform = parsed(PLATFORM_KEY), habits = parsed(HABITS_KEY), health = parsed(HEALTH_STORAGE_KEY);
    expect(isShowcaseBackup("platform", { ...platform, positions: platform.positions.map((p: { id: string }, i: number) => ({ ...p, id: `position-${i}`, account: "manual" })) })).toBe(false);
    expect(isShowcaseBackup("habits", { ...habits, habits: habits.habits.map((h: { id: string }, i: number) => ({ ...h, id: `11111111-0000-4000-8000-${String(i).padStart(12, "0")}`, notes: "" })) })).toBe(false);
    expect(isShowcaseBackup("health", { ...health, foods: [], activity: [] })).toBe(false);
    for (const value of [null, undefined, "x", 1, [], {}, { positions: "no" }]) for (const kind of ["platform", "habits", "health"] as const) expect(isShowcaseBackup(kind, value)).toBe(false);
  });
  it("names Showcase exports showcase-demo and leaves other exports as they are", () => {
    expect(exportFileName("zigoals-habits-backup.json", true)).toBe("zigoals-showcase-demo-habits-backup.json");
    expect(exportFileName("zigoals-health-2026-09-01-to-2026-09-30.csv", true)).toBe("zigoals-showcase-demo-health-2026-09-01-to-2026-09-30.csv");
    expect(exportFileName("zigoals-habits-backup.json", false)).toBe("zigoals-habits-backup.json");
  });
});
