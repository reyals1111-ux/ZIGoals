import { describe, expect, test } from "vitest";
import {
  createEmptyHealth, healthSchema, foodSchema, targetsSchema, scaleNutrition,
  recipeNutrition, saveFood, saveRecipe, logHealthItem, editDiaryEntry,
  removeHealthItem, dailyHealthSummary, healthHistory, saveWeight, weightTrend,
  searchFoods, setHealthTargets, saveActivity, getHealthActivities, parseHealthNumber,
  type HealthFood,
} from "./health";

const at = "2026-09-15T12:00:00.000Z";
const id = (n: number) => `health_00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const food: HealthFood = { id: id(1), name: "Plain oats", brand: "Pantry", servingGrams: 40,
  nutrients: { kcal: 150, proteinMg: 5000, carbsMg: 27000, fatMg: 3000 }, createdAt: at, updatedAt: at };
const withFood = () => saveFood(createEmptyHealth(), food);

test("empty health contains no invented personal targets or logs", () => {
  const empty = createEmptyHealth();
  expect(healthSchema.parse(empty)).toEqual(empty);
  expect(empty.targets).toEqual({ kcal: null, proteinMg: null, carbsMg: null, fatMg: null, weightGrams: null, steps: null });
  expect(dailyHealthSummary(empty, "2026-09-15")).toEqual({ nutrients: { kcal: 0, proteinMg: 0, carbsMg: 0, fatMg: 0 }, entries: 0, steps: 0, minutes: 0 });
  expect(getHealthActivities(empty)).toEqual([]);
});

test("scales thousandths of servings with integer half-up rounding", () => {
  expect(scaleNutrition(food.nutrients, 1500)).toEqual({ kcal: 225, proteinMg: 7500, carbsMg: 40500, fatMg: 4500 });
  expect(scaleNutrition({ kcal: 1, proteinMg: 1, carbsMg: 1, fatMg: 1 }, 500)).toEqual({ kcal: 1, proteinMg: 1, carbsMg: 1, fatMg: 1 });
  for (const invalid of [NaN, Infinity, -1, 0, 0.5, 1000001]) expect(() => scaleNutrition(food.nutrients, invalid)).toThrow();
});

test("decimal input converts exactly to integers and rejects silent rounding or nonfinite values", () => {
  expect(parseHealthNumber("1.025", 1000, 1, 10000)).toBe(1025);
  expect(parseHealthNumber(" 0.1 ", 1000, 0, 10000)).toBe(100);
  for (const bad of ["", "NaN", "Infinity", "1e3", "-1", "1.0001", "0x10"])
    expect(() => parseHealthNumber(bad, 1000, 0, 10000)).toThrow();
});

test("recipes sum constituents before dividing, and retain ingredient snapshots", () => {
  let data = withFood();
  data = saveRecipe(data, { id: id(2), name: "Two bowls", portionsMilli: 2000, items: [{ foodId: id(1), quantityMilli: 3000 }] }, at);
  expect(recipeNutrition(data.recipes[0]!)).toEqual({ kcal: 225, proteinMg: 7500, carbsMg: 40500, fatMg: 4500 });
  data = saveFood(data, { ...food, nutrients: { ...food.nutrients, kcal: 900 } });
  data = removeHealthItem(data, "foods", id(1));
  expect(recipeNutrition(data.recipes[0]!)).toEqual({ kcal: 225, proteinMg: 7500, carbsMg: 40500, fatMg: 4500 });
  expect(() => saveRecipe(data, { id: id(3), name: "Missing", portionsMilli: 1000, items: [{ foodId: id(1), quantityMilli: 1000 }] }, at)).toThrow();
});

test("recipe constituent fractions are summed before rounding each nutrient", () => {
  const tiny = { ...food, nutrients: { kcal: 1, proteinMg: 1, carbsMg: 1, fatMg: 1 } };
  let data = saveFood(createEmptyHealth(), tiny);
  data = saveFood(data, { ...tiny, id: id(2) });
  data = saveRecipe(data, { id: id(3), name: "Combined fractions", portionsMilli: 1000, items: [{ foodId: id(1), quantityMilli: 500 }, { foodId: id(2), quantityMilli: 500 }] }, at);
  expect(recipeNutrition(data.recipes[0]!)).toEqual({ kcal: 1, proteinMg: 1, carbsMg: 1, fatMg: 1 });
});

test("diary snapshots survive food edits and deletion, and quantity corrections use the original snapshot", () => {
  let data = logHealthItem(withFood(), { id: id(2), sourceId: id(1), sourceKind: "food", date: "2026-09-15", meal: "Breakfast", quantityMilli: 1500 }, at);
  data = saveFood(data, { ...food, name: "Changed food", nutrients: { ...food.nutrients, kcal: 900 } });
  data = removeHealthItem(data, "foods", id(1));
  expect(data.diary[0]!.snapshot.name).toBe("Plain oats");
  expect(dailyHealthSummary(data, "2026-09-15").nutrients.kcal).toBe(225);
  data = editDiaryEntry(data, id(2), { date: "2026-09-14", meal: "Snacks", quantityMilli: 2000 }, at);
  expect(dailyHealthSummary(data, "2026-09-15").entries).toBe(0);
  expect(dailyHealthSummary(data, "2026-09-14").nutrients.kcal).toBe(300);
  data = removeHealthItem(data, "diary", id(2));
  expect(data.diary).toEqual([]);
});

test("recipe diary snapshots survive a rebuilt recipe and deletion", () => {
  let data = saveRecipe(withFood(), { id: id(2), name: "Oat bowl", portionsMilli: 2000, items: [{ foodId: id(1), quantityMilli: 3000 }] }, at);
  data = logHealthItem(data, { id: id(3), sourceId: id(2), sourceKind: "recipe", date: "2026-09-15", meal: "Lunch", quantityMilli: 1000 }, at);
  data = saveRecipe(data, { id: id(2), name: "Oat bowl edited", portionsMilli: 1000, items: [{ foodId: id(1), quantityMilli: 1000 }] }, at);
  data = removeHealthItem(data, "recipes", id(2));
  expect(dailyHealthSummary(data, "2026-09-15").nutrients.kcal).toBe(225);
  expect(data.diary[0]!.snapshot.name).toBe("Oat bowl");
});

test("targets are explicit and can be cleared independently", () => {
  const initial = createEmptyHealth();
  const data = setHealthTargets(initial, { ...initial.targets, kcal: 2300, proteinMg: 110000, weightGrams: 72000 });
  expect(data.targets.kcal).toBe(2300);
  expect(setHealthTargets(data, { ...data.targets, kcal: null }).targets.proteinMg).toBe(110000);
  for (const bad of [0, -1, Infinity, 0.5]) expect(targetsSchema.safeParse({ ...initial.targets, kcal: bad }).success).toBe(false);
});

test("weight is one correctable reading per local date and trend excludes dates after the selected day", () => {
  let data = saveWeight(createEmptyHealth(), { id: id(1), date: "2026-09-13", grams: 72500 }, at);
  data = saveWeight(data, { id: id(2), date: "2026-09-15", grams: 72100 }, at);
  data = saveWeight(data, { id: id(3), date: "2026-09-15", grams: 72000 }, at);
  data = saveWeight(data, { id: id(4), date: "2026-09-16", grams: 71000 }, at);
  expect(data.weights).toHaveLength(3);
  expect(data.weights.find(w => w.date === "2026-09-15")!.id).toBe(id(2));
  expect(weightTrend(data, "2026-09-15")).toMatchObject({ latestGrams: 72000, changeGrams: -500, averageGrams: 72250, count: 2 });
  expect(weightTrend(createEmptyHealth(), "2026-09-15").latestGrams).toBeNull();
  expect(() => saveWeight(data, { id: id(5), date: "2026-09-15", grams: 0 }, at)).toThrow();
});

test("daily history uses valid calendar days over leap, DST and year boundaries and distinguishes absent entries", () => {
  expect(healthHistory(createEmptyHealth(), "2024-03-01", 3).map(d => d.date)).toEqual(["2024-02-28", "2024-02-29", "2024-03-01"]);
  expect(healthHistory(createEmptyHealth(), "2026-01-01", 2).map(d => d.date)).toEqual(["2025-12-31", "2026-01-01"]);
  expect(healthHistory(createEmptyHealth(), "2026-03-30", 3).map(d => d.date)).toEqual(["2026-03-28", "2026-03-29", "2026-03-30"]);
  expect(healthHistory(createEmptyHealth(), "2026-09-15", 1)[0]).toMatchObject({ entries: 0, weightGrams: null });
  expect(() => healthHistory(createEmptyHealth(), "2026-02-30", 7)).toThrow();
});

test("history at the earliest supported day does not query unsupported preceding dates", () => {
  expect(healthHistory(createEmptyHealth(), "1900-01-01", 7).map(d => d.date)).toEqual(["1900-01-01"]);
});

test("manual activity adds steps and minutes without changing food nutrition", () => {
  let data = saveActivity(withFood(), { id: id(2), date: "2026-09-15", name: "Walk", steps: 2500, minutes: 25 }, at);
  data = saveActivity(data, { id: id(3), date: "2026-09-15", name: "Evening walk", steps: 500, minutes: 10 }, at);
  expect(dailyHealthSummary(data, "2026-09-15")).toMatchObject({ steps: 3000, minutes: 35, nutrients: { kcal: 0 } });
  expect(getHealthActivities(data)).toHaveLength(2);
  expect(getHealthActivities(data)[0]).toMatchObject({ category: "HEALTH", href: "/app/health", at });
  expect(searchFoods(data.foods, "PAN oat").map(f => f.name)).toEqual(["Plain oats"]);
});

describe("strict import boundary", () => {
  test.each([
    { schemaVersion: 2 }, { kind: "other" }, { extra: "unknown" }, { foods: [food, food] },
    { foods: [{ ...food, name: "x".repeat(121) }] },
    { foods: [{ ...food, nutrients: { ...food.nutrients, proteinMg: NaN } }] },
    { foods: [{ ...food, servingGrams: 0 }] },
    { weights: [{ id: id(4), date: "2026-02-30", grams: 72000, createdAt: at, updatedAt: at }] },
  ])("rejects malformed or future data %#", patch => {
    expect(healthSchema.safeParse({ ...createEmptyHealth(), ...patch }).success).toBe(false);
  });
  test("rejects unsafe nutrition, oversized arrays and duplicate dates", () => {
    expect(foodSchema.safeParse({ ...food, nutrients: { ...food.nutrients, kcal: 0.1 } }).success).toBe(false);
    expect(healthSchema.safeParse({ ...createEmptyHealth(), foods: Array.from({ length: 1001 }, (_, i) => ({ ...food, id: id(i) })) }).success).toBe(false);
    const weight = { id: id(4), date: "2026-09-15", grams: 72000, createdAt: at, updatedAt: at };
    expect(healthSchema.safeParse({ ...createEmptyHealth(), weights: [weight, { ...weight, id: id(5) }] }).success).toBe(false);
  });
  test("rejects oversized calculated diary quantities even when the individual fields fit", () => {
    const data = saveFood(createEmptyHealth(), { ...food, nutrients: { ...food.nutrients, kcal: 1_000_000 } });
    expect(() => logHealthItem(data, { id: id(2), sourceId: id(1), sourceKind: "food", date: "2026-09-15", meal: "Dinner", quantityMilli: 2000 }, at)).toThrow();
  });
});
