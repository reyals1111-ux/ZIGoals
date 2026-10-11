import { describe, expect, it } from "vitest";
import { createEmptyHealth, logHealthItem, saveFood } from "./health";
import { createHabit, emptyHabitData, logHabitCount, setHabitState } from "./habits";
import { habitConsistency, nutritionDashboard, activityPresentation, activityDateHeading } from "./life-intelligence";

const today = "2026-09-21";
const at = new Date(`${today}T12:00:00`);
const id = "59a35604-3696-4a78-b455-4015acb66885";
describe("Life dashboard evidence", () => {
  it("scales saved meal snapshots and keeps missing days separate from zero calories", () => {
    let data = saveFood(createEmptyHealth(), { id: "health_food-00001", name: "Breakfast", brand: "", servingGrams: 100, nutrients: { kcal: 200, proteinMg: 10000, carbsMg: 20000, fatMg: 5000 }, createdAt: at.toISOString(), updatedAt: at.toISOString() });
    data = logHealthItem(data, { id: "health_diary-00001", sourceId: "health_food-00001", sourceKind: "food", date: today, meal: "Breakfast", quantityMilli: 1500 }, at.toISOString());
    data.targets.kcal = 250;
    const result = nutritionDashboard(data, today);
    expect(result.meals[0]).toMatchObject({ meal: "Breakfast", kcal: 300, entries: 1, share: 100 });
    expect(result.nutrients.proteinMg).toBe(15000);
    expect(result.remaining).toBe(-50);
    expect(result.loggedDays).toBe(1);
    expect(result.averageKcal).toBe(300);
    expect(result.history).toHaveLength(30);
    expect(result.history[0]!.entries).toBe(0);
    expect(result.mealCount).toBe(1);
  });
  it("does not invent targets, meals, averages or movement for empty data", () => {
    expect(nutritionDashboard(createEmptyHealth(), today)).toMatchObject({ remaining: null, averageKcal: null, mealCount: 0, loggedDays: 0, steps: 0, minutes: 0 });
  });
  it("uses local scheduled outcomes, excluding pre-start and paused days", () => {
    let data = createHabit(emptyHabitData(), { title: "Read", category: "Learning", description: "", notes: "", schedule: { kind: "daily" }, target: 1 }, new Date("2026-09-19T12:00:00"), id);
    data = logHabitCount(data, id, "2026-09-19", 1, "", at);
    data = setHabitState(data, id, "paused", new Date("2026-09-20T12:00:00"));
    const result = habitConsistency(data.habits, today);
    expect(result.days).toHaveLength(30);
    expect(result.days.find(d => d.date === "2026-09-19")).toMatchObject({ completed: 1, scheduled: 1 });
    expect(result.days.at(-1)).toMatchObject({ completed: 0, scheduled: 0 });
    expect(result.checkins).toBe(1);
    expect(result.activeDays).toBe(1);
    expect(result.week).toHaveLength(7);
  });
  it("does not count future or unlogged records as check-ins", () => {
    const data = createHabit(emptyHabitData(), { title: "Read", category: "Learning", description: "", notes: "", schedule: { kind: "daily" }, target: 1 }, at, id);
    expect(habitConsistency(data.habits, today)).toMatchObject({ checkins: 0, activeDays: 0 });
    expect(habitConsistency(data.habits, today).days.at(-1)).toMatchObject({ scheduled: 1, completed: 0 });
  });
  it.each([["Crypto", "Crypto"], ["Stocks", "Stock"], ["ETFs", "ETF"], ["Precious Metals", "Metal"], ["Cash", "Cash"]])("identifies %s assets without classifying all wealth as crypto", (detail, label) => {
    expect(activityPresentation({ category: "WEALTH", title: "Asset added", detail }).label).toBe(label);
  });
  it("identifies an ETF from existing RWA metadata within the Stocks class", () => {
    expect(activityPresentation({ category: "WEALTH", title: "ETF added", detail: "Stocks", assetType: "etf" }).label).toBe("ETF");
  });
  it("distinguishes corrections, contributions and saved favourite dates", () => {
    expect(activityPresentation({ category: "GOAL", title: "Contribution correction", detail: "" }).label).toBe("Correction");
    expect(activityPresentation({ category: "GOAL", title: "Contribution", detail: "" }).label).toBe("Contribution");
    expect(activityPresentation({ category: "FAVOURITE", title: "Bitcoin followed", detail: "" }).icon).toBe("star");
  });
  it("groups calendar days using local date rather than UTC substrings", () => {
    expect(activityDateHeading(at.toISOString(), today)).toBe("Today");
    expect(activityDateHeading(new Date("2026-09-20T12:00:00").toISOString(), today)).toBe("Yesterday");
  });
});
