// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createHabit, emptyHabitData, habitDataSchema, habitRuleOn, setHabitState, type HabitData, type HabitInput } from "./habits";

// B-201: an archived habit's card shows no Edit (it is restored, or deleted for good, from Archived); an active one does.
vi.mock("../components/pin-to-today", () => ({ PinToToday: () => null }));
vi.mock("../components/habits/habit-timer", () => ({ HabitTimer: () => null }));
const { HabitCard } = await import("../components/habits/habit-card-full");
import type { HabitCardStore } from "../components/habits/use-habits";

const today = "2026-09-20", at = new Date(`${today}T10:00:00.000Z`);
const input = (title: string): HabitInput => ({ title, category: "Personal", description: "", notes: "", schedule: { kind: "daily" }, measurement: { kind: "count", unit: "times" }, target: 1 });
const noop = async () => {};
const store: HabitCardStore = { today, update: noop, setValue: noop, addValue: noop, smartDone: noop, adjustCount: noop, setCount: noop, markDay: noop, setState: noop, planSkip: noop, unplanSkip: noop, data: {} };
const scope = { chainId: "private", owner: "local" };
const reparse = (data: HabitData) => habitDataSchema.parse(JSON.parse(JSON.stringify(data)));
let root: Root, container: HTMLDivElement;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

test("Edit shows on an active habit's card and not on an archived one", async () => {
  const id = "59a35604-3696-4a78-b455-000000000001";
  const active = reparse(createHabit(emptyHabitData(), input("Read"), at, id));
  const archived = reparse(setHabitState(active, id, "archived", at));
  expect(habitRuleOn(archived.habits[0]!, today)?.state).toBe("archived");
  await act(async () => root.render(createElement(HabitCard, { habit: active.habits[0]!, store, scope, onEdit: () => {} })));
  expect(container.querySelector('button[aria-label="Edit Read"]')).not.toBeNull();
  await act(async () => root.render(createElement(HabitCard, { habit: archived.habits[0]!, store, scope, onEdit: () => {}, onDeleteForGood: noop })));
  expect(container.querySelector('button[aria-label="Edit Read"]')).toBeNull();
  expect([...container.querySelectorAll("button")].some(b => b.textContent === "Restore habit")).toBe(true);
});
