import { describe, expect, it } from "vitest";
import { createHabit, emptyHabitData, habitDataSchema, logHabitValue, type HabitInput } from "./habits";
import { sameJson, shareHabitData } from "./habit-sharing";

const input = (title: string): HabitInput => ({ title, category: "Personal", description: "", notes: "", schedule: { kind: "daily" }, measurement: { kind: "count", unit: "times" }, target: 1 });
const at = new Date("2026-09-20T10:00:00.000Z");
const reparse = <T,>(value: T): T => habitDataSchema.parse(JSON.parse(JSON.stringify(value))) as T;

describe("structural sharing of habit reads (Part 2)", () => {
  const ids = Array.from({ length: 5 }, (_, i) => `59a35604-3696-4a78-b455-40000000000${i}`);
  const base = ids.reduce((data, id, i) => createHabit(data, input(`Habit ${i}`), at, id), emptyHabitData());
  it("returns the previous object when a fresh parse is equal", () => {
    expect(shareHabitData(base, reparse(base))).toBe(base);
  });
  it("keeps every unchanged habit and replaces only the changed one", () => {
    const changed = reparse(logHabitValue(base, ids[2]!, "2026-09-20", 1, {}, at));
    const shared = shareHabitData(base, changed);
    expect(shared).not.toBe(base);
    expect(shared.habits.map((habit, i) => habit === base.habits[i])).toEqual([true, true, false, true, true]);
    expect(shared.habits[2]!.entries).toHaveLength(1);
    expect(shared).toEqual(changed);
  });
  it("handles added, removed and reordered habits without reusing a wrong record", () => {
    const added = reparse(createHabit(base, input("New"), at, "59a35604-3696-4a78-b455-400000000009"));
    const shared = shareHabitData(base, added);
    expect(shared.habits).toHaveLength(6);
    expect(shared.habits.slice(0, 5).every((habit, i) => habit === base.habits[i])).toBe(true);
    const fewer = { ...base, habits: base.habits.slice(1).map((habit) => reparse({ ...emptyHabitData(), habits: [habit] }).habits[0]!) };
    expect(shareHabitData(base, fewer).habits.every((habit, i) => habit === base.habits[i + 1])).toBe(true);
    expect(shareHabitData(base, { ...base, timeZone: "Europe/Brussels" })).not.toBe(base);
  });
  it("compares parsed JSON deeply", () => {
    expect(sameJson({ a: [1, { b: "x" }] }, { a: [1, { b: "x" }] })).toBe(true);
    expect(sameJson({ a: [1, { b: "x" }] }, { a: [1, { b: "y" }] })).toBe(false);
    expect(sameJson({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(sameJson([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });
});
