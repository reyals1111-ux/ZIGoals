// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { foldHoldsError, habitCountingDiffers, HABIT_COUNTING_DEFAULTS, HABIT_FOLD_FIELDS } from "./habit-form-fold";
import { createHabit, emptyHabitData, type Habit, type HabitInput } from "./habits";

// Session AK D1 (FR-17): the habit form's counting fields sit under "More options".
vi.mock("../components/chain/use-chain-choice", () => ({ useChainChoice: () => ({ chosen: false }) }));
vi.mock("../components/reminders/reminder-time-field", () => ({ ReminderTimeField: () => null }));
const { HabitEditor } = await import("../components/habits/habit-editor");

describe("habitCountingDiffers", () => {
  test("a blank habit's counting is the default", () => {
    expect(habitCountingDiffers({ ...HABIT_COUNTING_DEFAULTS })).toBe(false);
  });
  test("each counting choice on its own makes a habit counted", () => {
    for (const change of [{ type: "quit" }, { type: "limit" }, { measurement: "quantity" }, { unit: "pages" }, { target: 2 }, { target: 0 }, { targetPeriod: "week" }]) {
      expect(habitCountingDiffers({ ...HABIT_COUNTING_DEFAULTS, ...change }), JSON.stringify(change)).toBe(true);
    }
  });
  test("a yes/no habit has no unit, so an empty unit is not a difference by itself", () => {
    expect(habitCountingDiffers({ ...HABIT_COUNTING_DEFAULTS, measurement: "boolean", unit: "" })).toBe(true); // the measurement differs
    expect(habitCountingDiffers({ ...HABIT_COUNTING_DEFAULTS, unit: undefined })).toBe(true); // a count with no unit differs
  });
});

describe("foldHoldsError", () => {
  test("names inside the fold open it; the others do not", () => {
    expect([...HABIT_FOLD_FIELDS].sort()).toEqual(["endCount", "goal", "target"]);
    expect(foldHoldsError(["target"])).toBe(true);
    expect(foldHoldsError(["title", "endCount"])).toBe(true);
    for (const outside of ["title", "interval", "frequency"]) expect(foldHoldsError([outside]), outside).toBe(false);
    expect(foldHoldsError([])).toBe(false);
  });
});

describe("HabitEditor's More options", () => {
  const today = "2026-09-20";
  let root: Root, container: HTMLDivElement;
  beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
  const onSave = vi.fn(async () => {});
  const render = (habit?: Habit) => act(async () => root.render(createElement(HabitEditor, { habit, goals: [], habits: [], today, onSave, onCancel: () => {} })));
  const fold = () => container.querySelector<HTMLDetailsElement>("details.habit-more-options")!;
  const labelled = (name: string) => [...container.querySelectorAll("label")].find((label) => label.firstChild?.textContent?.trim() === name)?.querySelector("input, select") as HTMLInputElement | HTMLSelectElement;
  const set = (element: HTMLInputElement | HTMLSelectElement, value: string) => act(async () => {
    const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
  const counted = (input: Partial<HabitInput>): Habit => createHabit(emptyHabitData(), { title: "Read", category: "Learning", description: "", notes: "", schedule: { kind: "daily" }, measurement: { kind: "count", unit: "times" }, target: 1, ...input }, new Date(`${today}T08:00:00.000Z`), "59a35604-3696-4a78-b455-000000000001").habits[0]!;

  test("a new habit: closed, with every counting field inside it and the first questions outside", async () => {
    await render();
    expect(fold().open).toBe(false);
    for (const name of ["Habit type", "Measurement", "Unit", "Target value", "Target period"]) expect(fold().contains(labelled(name)), name).toBe(true);
    for (const name of ["Start from template", "Habit title", "Time of day", "Schedule", "Category / area"]) expect(fold().contains(labelled(name)), name).toBe(false);
    expect(fold().querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("How it is counted");
    expect(fold().querySelector("summary")?.textContent).toBe("More options how it is counted, description, linked Goal, stack, end, notes");
  });

  test("a template fills the counting fields and opens the fold; Blank habit leaves it closed", async () => {
    await render();
    await set(labelled("Start from template"), "");
    expect(fold().open).toBe(false);
    await set(labelled("Start from template"), "walk");
    expect(fold().open).toBe(true);
    expect(labelled("Measurement").value).toBe("quantity");
    expect(labelled("Unit").value).toBe("steps");
    expect(labelled("Target value").value).toBe("8000");
  });

  test("editing a counted habit opens the fold with its counting in view", async () => {
    await render(counted({ measurement: { kind: "duration", unit: "minutes" }, target: 30 }));
    expect(fold().open).toBe(true);
    expect(labelled("Measurement").value).toBe("duration");
    expect(labelled("Target value").value).toBe("30");
  });

  test("a refusal about the target opens a closed fold and moves the focus to the target", async () => {
    await render();
    await act(async () => { fold().open = true; fold().dispatchEvent(new Event("toggle")); });
    await set(labelled("Habit title"), "Stretch");
    await set(labelled("Target value"), "abc");
    await act(async () => { fold().open = false; fold().dispatchEvent(new Event("toggle")); });
    expect(fold().open).toBe(false);
    await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(fold().open).toBe(true);
    const target = labelled("Target value");
    expect(document.activeElement).toBe(target);
    expect(target.getAttribute("aria-invalid")).toBe("true");
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/^Target value: /);
    expect(onSave).not.toHaveBeenCalled();
  });

  test("a required field inside a closed fold (a cleared unit) opens it when the browser checks the form", async () => {
    await render();
    await act(async () => { fold().open = true; fold().dispatchEvent(new Event("toggle")); });
    await set(labelled("Habit title"), "Stretch");
    await set(labelled("Unit"), "");
    await act(async () => { fold().open = false; fold().dispatchEvent(new Event("toggle")); });
    await act(async () => { container.querySelector("form")!.requestSubmit(); });
    expect(fold().open).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
  });
});
