import { expect, test } from "vitest";
import { createEmptyHealth, saveFood, logHealthItem, saveRecipe, healthSchema, dailyHealthSummary, type HealthData } from "./health";
import * as daily from "./health-daily";
const at = "2026-09-23T12:00:00.000Z";
const id = (n: number) => `health_00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const food = { id: id(1), name: "Oats", brand: "", servingGrams: 40, nutrients: { kcal: 150, proteinMg: 5000, carbsMg: 27000, fatMg: 3000 }, createdAt: at, updatedAt: at };
function journal(): HealthData {
  let data = saveFood(createEmptyHealth(), food);
  data = logHealthItem(data, { id: id(2), sourceId: food.id, sourceKind: "food", date: "2026-09-23", meal: "Breakfast", quantityMilli: 1500 }, at);
  return data;
}
test("older health envelopes round trip without rewriting recorded values", () => {
  const old = journal();
  expect(healthSchema.parse(old)).toEqual(old);
  const updated = daily.setFavorite(old, "food", id(1), true);
  expect(updated.diary).toEqual(old.diary);
  expect(daily.quickPicks(updated, "favorites", "oa").map(p => p.name)).toEqual(["Oats"]);
  expect(daily.quickPicks(daily.setFavorite(updated, "food", id(1), false), "favorites")).toEqual([]);
});
test("recent and frequent rank actual diary usage deterministically and exclude removed library entries", () => {
  let data = saveFood(journal(), { ...food, id: id(3), name: "Apple" });
  data = logHealthItem(data, { id: id(4), sourceId: id(3), sourceKind: "food", date: "2026-09-24", meal: "Lunch", quantityMilli: 2000 }, "2026-09-24T12:00:00.000Z");
  data = logHealthItem(data, { id: id(5), sourceId: id(1), sourceKind: "food", date: "2026-09-23", meal: "Lunch", quantityMilli: 1000 }, at);
  expect(daily.quickPicks(data, "recent").map(p => p.name)).toEqual(["Apple", "Oats"]);
  expect(daily.quickPicks(data, "frequent").map(p => p.name)).toEqual(["Oats", "Apple"]);
  expect(daily.quickPicks({ ...data, foods: [food] }, "recent").map(p => p.name)).toEqual(["Oats"]);
});
test("saved meals and copy preserve original snapshots even after recipe changes; retries cannot duplicate or resurrect", () => {
  const original = journal();
  let data = daily.saveMealFromDiary(original, id(10), "Morning bowl", "2026-09-23", "Breakfast", at);
  const saved = data.daily!.savedMeals[0]!;
  data = saveFood(data, { ...food, nutrients: { ...food.nutrients, kcal: 999 } });
  const preview = daily.previewMealCopy(saved.items, ["2026-09-24", "2026-09-25"], "Lunch", id(20), at);
  expect(preview.map(p => p.snapshot.nutrients.kcal)).toEqual([150, 150]);
  data = daily.commitMealCopy(data, preview, id(20));
  expect(dailyHealthSummary(data, "2026-09-24").nutrients.kcal).toBe(225);
  expect(daily.commitMealCopy(data, preview, id(20)).diary).toHaveLength(3);
  const removed = { ...data, diary: original.diary };
  expect(daily.commitMealCopy(removed, preview, id(20)).diary).toHaveLength(1);
  expect(() => daily.previewMealCopy(saved.items, Array(8).fill("2026-09-24"), "Lunch", id(21), at)).toThrow();
  expect(() => daily.previewMealCopy(saved.items, ["2026-02-30"], "Lunch", id(21), at)).toThrow();
});
test("planning does not log consumption and grocery aggregation only combines compatible ingredient snapshots", () => {
  let data = saveRecipe(journal(), { id: id(3), name: "Bowl", portionsMilli: 2000, items: [{ foodId: id(1), quantityMilli: 3000 }] }, at);
  data = daily.saveMealFromRecipe(data, id(10), id(3), 2000, at);
  data = daily.saveMealPlan(data, { id: id(11), savedMealId: id(10), date: "2026-09-25", meal: "Dinner" }, at);
  data = daily.saveMealPlan(data, { id: id(12), savedMealId: id(10), date: "2026-09-26", meal: "Dinner" }, at);
  expect(data.diary).toHaveLength(1);
  expect(daily.groceryList(data, "2026-09-25", "2026-09-26").map(g => ({ name: g.name, grams: g.grams }))).toEqual([{ name: "Oats", grams: 240 }]);
  data = daily.logMealPlan(data, id(11), at);
  expect(dailyHealthSummary(data, "2026-09-25").nutrients.kcal).toBe(450);
  expect(daily.logMealPlan(data, id(11), at).diary).toHaveLength(2);
  expect(daily.groceryList(data, "2026-09-25", "2026-09-26")[0]!.grams).toBe(120);
});
test("water retains original units, corrects/removes explicitly, and rejects duplicate IDs with different amounts", () => {
  const entry = { id: id(10), date: "2026-09-23", amountMilli: 8000, unit: "fl-oz-us" as const };
  let data = daily.addWater(createEmptyHealth(), entry, at);
  expect(daily.waterSummary(data, "2026-09-23")).toMatchObject({ entries: 1, millilitres: 236.588 });
  expect(daily.addWater(data, entry, at).daily!.water).toHaveLength(1);
  expect(() => daily.addWater(data, { ...entry, amountMilli: 9000 }, at)).toThrow();
  data = daily.editWater(data, id(10), { amountMilli: 250000, unit: "ml", date: "2026-09-24" }, at);
  expect(daily.waterSummary(data, "2026-09-23").entries).toBe(0);
  expect(daily.waterSummary(data, "2026-09-24").millilitres).toBe(250);
  data = daily.removeWater(data, id(10));
  expect(daily.addWater(data, entry, at).daily!.water).toHaveLength(0);
});
test("domain timezone chooses today across midnight/DST and conversions preserve meaningful precision", () => {
  expect(daily.healthDay("Europe/Brussels", new Date("2026-03-28T23:30:00Z"))).toBe("2026-03-29");
  expect(daily.healthDay("America/New_York", new Date("2026-03-28T23:30:00Z"))).toBe("2026-03-28");
  expect(daily.healthDay("Europe/Brussels", new Date("2024-02-28T23:30:00Z"))).toBe("2024-02-29");
  expect(() => daily.healthDay("invalid-zone", new Date(at))).toThrow();
  expect(daily.bodyWeightGrams("150", "lb")).toBe(68039);
  expect(daily.bodyWeightGrams("72.125", "kg")).toBe(72125);
  expect(daily.servingsFromGrams("60", 40)).toBe(1500);
});
test("private CSV filters ranges, neutralizes formulas and labels sources/units without changing snapshots", () => {
  const data = saveFood(createEmptyHealth(), { ...food, name: '=HYPERLINK("https://example.invalid")' });
  const logged = logHealthItem(data, { id: id(2), sourceId: id(1), sourceKind: "food", date: "2026-09-23", meal: "Lunch", quantityMilli: 1000 }, at);
  const csv = daily.exportHealthCsv(logged, "2026-09-23", "2026-09-23");
  expect(csv).toContain("manual food snapshot");
  expect(csv).toContain("' =HYPERLINK".replace("' ", "'"));
  expect(csv).toContain("2026-09-23");
  expect(daily.exportHealthCsv(logged, "2026-09-24", "2026-09-24")).not.toContain("HYPERLINK");
  expect(() => daily.exportHealthCsv(logged, "2026-09-24", "2026-09-23")).toThrow();
});
test("extension strict validation rejects invalid dates and cross-collection identifiers", () => {
  const data = daily.addWater(journal(), { id: id(10), date: "2026-09-23", amountMilli: 250000, unit: "ml" }, at);
  expect(healthSchema.safeParse({ ...data, daily: { ...data.daily, water: [{ ...data.daily!.water[0], id: id(1) }] } }).success).toBe(false);
  expect(healthSchema.safeParse({ ...data, daily: { ...data.daily, unsupported: true } }).success).toBe(false);
});

test("saved-meal and plan retries retain accepted timestamps and reject changed intent", () => {
  const data = daily.saveMealFromDiary(journal(), id(10), "Breakfast", "2026-09-23", "Breakfast", at);
  expect(daily.saveMealFromDiary(data, id(10), "Breakfast", "2026-09-23", "Breakfast", "2026-09-23T13:00:00.000Z")).toEqual(data);
  expect(() => daily.saveMealFromDiary(data, id(10), "Changed", "2026-09-23", "Breakfast", at)).toThrow();
  const draft = { id: id(20), savedMealId: id(10), date: "2026-09-25", meal: "Dinner" as const };
  const planned = daily.saveMealPlan(data, draft, at);
  expect(daily.saveMealPlan(planned, draft, "2026-09-23T13:00:00.000Z")).toEqual(planned);
  expect(() => daily.saveMealPlan(planned, { ...draft, date: "2026-09-26" }, at)).toThrow();
});
test("grocery evidence from a diary recipe stays unresolved instead of using an edited recipe", () => {
  let data = saveRecipe(journal(), { id: id(3), name: "Bowl", portionsMilli: 1000, items: [{ foodId: id(1), quantityMilli: 1000 }] }, at);
  data = logHealthItem(data, { id: id(4), sourceId: id(3), sourceKind: "recipe", date: "2026-09-23", meal: "Lunch", quantityMilli: 1000 }, at);
  data = daily.saveMealFromDiary(data, id(10), "Old bowl", "2026-09-23", "Lunch", at);
  data = daily.saveMealPlan(data, { id: id(11), savedMealId: id(10), date: "2026-09-25", meal: "Lunch" }, at);
  expect(daily.groceryList(data, "2026-09-25", "2026-09-25")[0]!.grams).toBeNull();
});

test("CSV includes recorded serving weight so calorie basis and grams can be reconstructed", () => {
  const csv = daily.exportHealthCsv(journal(), "2026-09-23", "2026-09-23");
  const [header, entry] = csv.split("\r\n");
  expect(header).toContain('"serving_weight_g"');
  expect(entry).toContain('"1.5","servings","40","150"');
});
test("daily extension backup round trip keeps operation receipts, plans and original snapshots", () => {
  let data = daily.saveMealFromDiary(journal(), id(10), "Morning", "2026-09-23", "Breakfast", at);
  data = daily.saveMealPlan(data, { id: id(11), savedMealId: id(10), date: "2026-09-24", meal: "Lunch" }, at);
  data = daily.addWater(data, { id: id(12), date: "2026-09-23", amountMilli: 8000, unit: "fl-oz-us" }, at);
  data = daily.logMealPlan(data, id(11), at);
  const restored = healthSchema.parse(JSON.parse(JSON.stringify(data)));
  expect(restored).toEqual(data);
  expect(daily.logMealPlan(restored, id(11), at).diary).toHaveLength(2);
  expect(dailyHealthSummary(restored, "2026-09-24").nutrients.kcal).toBe(225);
});
