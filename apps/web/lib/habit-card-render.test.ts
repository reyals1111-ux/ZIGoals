// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createHabit, emptyHabitData, habitDataSchema, logHabitValue, type HabitData, type HabitInput } from "./habits";
import { shareHabitData } from "./habit-sharing";

// Session G, Part 2 guard: with 45 habits, one check-in re-renders one habit card, not all of them. Each card renders
// one PinToToday, so counting those renders (by habit title) counts card renders.
const renders = vi.hoisted(() => new Map<string, number>());
vi.mock("../components/pin-to-today", () => ({ PinToToday: ({ label }: { label: string }) => { renders.set(label, (renders.get(label) ?? 0) + 1); return null; } }));
vi.mock("../components/habits/habit-timer", () => ({ HabitTimer: () => null }));
const { HabitCard } = await import("../components/habits/habit-card");
import type { HabitCardStore } from "../components/habits/use-habits";

const today = "2026-09-20", at = new Date(`${today}T10:00:00.000Z`);
const input = (title: string): HabitInput => ({ title, category: "Personal", description: "", notes: "", schedule: { kind: "daily" }, measurement: { kind: "count", unit: "times" }, target: 1 });
const ids = Array.from({ length: 45 }, (_, i) => `59a35604-3696-4a78-b455-${String(i).padStart(12, "0")}`);
const reparse = (data: HabitData) => habitDataSchema.parse(JSON.parse(JSON.stringify(data)));
const noop = async () => {};
const store: HabitCardStore = { today, update: noop, setValue: noop, addValue: noop, smartDone: noop, adjustCount: noop, setCount: noop, markDay: noop, setState: noop, planSkip: noop, unplanSkip: noop, data: {} };
const scope = { chainId: "private", owner: "local" }, onEdit = () => {}, onViewStack = () => {};
function Cards({ data }: { data: HabitData }) {
  return createElement("div", null, data.habits.map((habit) => createElement(HabitCard, { key: habit.id, habit, store, scope, onEdit, onViewStack })));
}
let root: Root, container: HTMLDivElement;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); renders.clear(); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test("one check-in among 45 habits re-renders exactly one card", async () => {
  const first = reparse(ids.reduce((data, id, i) => createHabit(data, input(`Habit ${i + 1}`), at, id), emptyHabitData()));
  await act(async () => root.render(createElement(Cards, { data: first })));
  expect(renders.size).toBe(45);
  renders.clear();

  // A save is parsed again in full, as the store does; sharing keeps the 44 unchanged habit objects.
  const next = shareHabitData(first, reparse(logHabitValue(first, ids[7]!, today, 1, {}, at)));
  await act(async () => root.render(createElement(Cards, { data: next })));
  expect([...renders]).toEqual([["Habit 8", 1]]);
  expect(container.querySelector(`#habit-${ids[7]} .habit-count`)?.textContent).toContain("1 / 1");
});
