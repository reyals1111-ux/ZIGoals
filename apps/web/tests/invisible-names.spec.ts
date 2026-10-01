import { expect, test, type Page } from "@playwright/test";
import { HABITS_KEY } from "../lib/habits";

// QA-32 (Session F, docs/qa/QA_SWEEP_2026-09-30.md): a title made only of zero-width characters passed trim(), so it
// created an invisible habit (and an invisible Goal, asset or food). Every create/edit form now refuses such a name
// with a clear message; nothing is saved. Stored-data schemas are unchanged.
test.use({ locale: "en-US" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }));
});

// Zero width space, zero width joiner and word joiner: nothing a reader can see.
const INVISIBLE = String.fromCharCode(0x200b, 0x200d, 0x2060);
const stored = (page: Page, key: string) => page.evaluate((name) => JSON.parse(localStorage.getItem(name) ?? "null"), key);

test("a habit titled only with zero-width characters is refused, and nothing is saved", async ({ page }) => {
  await page.goto("/app/habits");
  await page.getByRole("button", { name: "+ New habit", exact: true }).click();
  await page.getByLabel("Habit title", { exact: true }).fill(INVISIBLE);
  await page.getByRole("button", { name: "Create habit", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Habit title: Enter a name with at least one visible character." })).toBeVisible();
  expect((await stored(page, HABITS_KEY))?.habits ?? []).toEqual([]);
});

test("a Goal named only with zero-width characters is refused, and nothing is saved", async ({ page }) => {
  await page.goto("/app/goals/new");
  await page.getByLabel("Goal name", { exact: true }).fill(INVISIBLE);
  await page.getByRole("radio", { name: "Value", exact: true }).check();
  await page.getByLabel("Target amount", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Give your Goal a name with at least one visible character." })).toBeVisible();
  expect((await stored(page, "zigoals:platform:v1"))?.goals ?? []).toEqual([]);
});

test("an asset named only with zero-width characters is refused, and nothing is saved", async ({ page }) => {
  await page.goto("/app/wealth");
  await page.getByRole("button", { name: "+ Add asset" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Add to your wealth" });
  await sheet.getByRole("button", { name: "Cash", exact: true }).click();
  await sheet.getByLabel("Asset name", { exact: true }).fill(INVISIBLE);
  await sheet.getByLabel("Cash amount", { exact: true }).fill("100");
  await sheet.getByRole("button", { name: "Save asset", exact: true }).click();
  await expect(sheet.getByRole("alert").filter({ hasText: "Name the asset with at least one visible character." })).toBeVisible();
  expect((await stored(page, "zigoals:platform:v1"))?.positions ?? []).toEqual([]);
});

test("a food named only with zero-width characters is refused with the name message, and nothing is saved", async ({ page }) => {
  await page.goto("/app/health");
  await page.getByRole("button", { name: "Foods & recipes", exact: true }).click();
  await page.getByRole("button", { name: "New food", exact: true }).click();
  const food = page.getByRole("form", { name: "Food details" });
  for (const [label, value] of [["Food name", INVISIBLE], ["Serving weight (g)", "40"], ["Calories (kcal)", "150"]]) await food.getByLabel(label!).fill(value!);
  await food.getByRole("button", { name: "Save food", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Enter a name with at least one visible character." })).toBeVisible();
  expect((await stored(page, "zigoals:health:v1"))?.foods ?? []).toEqual([]);
});
