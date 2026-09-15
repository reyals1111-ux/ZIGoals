import { expect, test, type Page } from "@playwright/test";

async function food(page: Page, name = "Test oats") {
  await page.getByRole("button", { name: "Foods & recipes", exact: true }).click();
  await page.getByRole("button", { name: "New food", exact: true }).click();
  const form = page.getByRole("form", { name: "Food details" });
  await form.getByLabel("Food name").fill(name);
  await form.getByLabel("Serving weight (g)").fill("40");
  await form.getByLabel("Calories (kcal)").fill("150");
  await form.getByLabel("Protein (g)").fill("5");
  await form.getByLabel("Carbs (g)").fill("27");
  await form.getByLabel("Fat (g)").fill("3");
  await form.getByRole("button", { name: "Save food", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Food saved");
}

test("food diary create, correct, reload and remove keeps snapshot nutrition", async ({ page }) => {
  await page.goto("/app/health");
  await expect(page.getByText("No calorie target set")).toBeVisible();
  await food(page);
  await page.getByRole("button", { name: "Diary", exact: true }).click();
  const form = page.getByRole("form", { name: "Log a meal" });
  await form.getByLabel("Food or recipe").selectOption({ label: "Test oats · food" });
  await form.getByLabel("Servings").fill("1.5");
  await form.getByRole("button", { name: "Log to diary" }).click();
  const breakfast = page.getByRole("region", { name: "Breakfast diary" });
  await expect(breakfast).toContainText("225 kcal");
  await breakfast.getByRole("button", { name: "Edit Test oats" }).click();
  const edit = page.getByRole("form", { name: "Edit diary entry" });
  await edit.getByLabel("Servings").fill("2");
  await edit.getByRole("button", { name: "Save entry" }).click();
  await expect(breakfast).toContainText("300 kcal");
  await page.reload();
  await expect(breakfast).toContainText("300 kcal");
  await page.getByRole("button", { name: "Foods & recipes", exact: true }).click();
  await page.getByRole("button", { name: "Remove food Test oats" }).click();
  await expect(page.getByRole("status")).toContainText("Food removed");
  await page.getByRole("button", { name: "Diary", exact: true }).click();
  await expect(breakfast).toContainText("300 kcal");
  await breakfast.getByRole("button", { name: "Remove Test oats", exact: true }).click();
  await expect(breakfast).toContainText("Nothing logged yet");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("recipe portions calculate from foods and preserve the logged result", async ({ page }, testInfo) => {
  if (testInfo.project.name === "desktop") await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/app/health");
  await food(page, "Recipe oats");
  await page.getByRole("button", { name: "New recipe", exact: true }).click();
  const recipe = page.getByRole("form", { name: "Recipe details" });
  await recipe.getByLabel("Recipe name").fill("Oat bowls");
  await recipe.getByLabel("Recipe makes (servings)").fill("2");
  await recipe.getByRole("combobox", { name: /^Ingredient 1/ }).selectOption({ label: "Recipe oats" });
  await recipe.getByLabel("Ingredient servings 1").fill("3");
  await expect(recipe).toContainText("225 kcal per serving");
  await recipe.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("status")).toContainText("Recipe saved");
  await page.getByRole("button", { name: "Diary", exact: true }).click();
  const log = page.getByRole("form", { name: "Log a meal" });
  await log.getByLabel("Food or recipe").selectOption({ label: "Oat bowls · recipe" });
  await log.getByLabel("Meal", { exact: true }).selectOption("Lunch");
  await log.getByRole("button", { name: "Log to diary" }).click();
  await expect(page.getByRole("region", { name: "Lunch diary" })).toContainText("225 kcal");
  await page.reload();
  await expect(page.getByRole("region", { name: "Lunch diary" })).toContainText("225 kcal");
  await page.screenshot({ path: `/tmp/zigoals-run7-health/recipe-diary-${testInfo.project.name}.png`, fullPage: true });
});

test("explicit targets, weight correction and manual activity persist without a wallet", async ({ page }) => {
  await page.goto("/app/health");
  await page.getByRole("button", { name: "Targets", exact: true }).click();
  const targets = page.getByRole("form", { name: "Personal targets" });
  await targets.getByLabel("Calorie target (kcal)").fill("2300");
  await targets.getByLabel("Protein target (g)").fill("100");
  await targets.getByLabel("Weight goal (kg)").fill("72");
  await targets.getByRole("button", { name: "Save targets" }).click();
  await expect(page.getByRole("status")).toContainText("Targets saved");
  await page.getByRole("button", { name: "Weight", exact: true }).click();
  const weight = page.getByRole("form", { name: "Weight entry" });
  await weight.getByLabel("Weight (kg)").fill("73.5");
  await weight.getByRole("button", { name: "Save weight" }).click();
  await expect(page.getByRole("table", { name: "Weight history" })).toContainText("73.5 kg");
  await weight.getByLabel("Weight (kg)").fill("73.25");
  await weight.getByRole("button", { name: "Save weight" }).click();
  await expect(page.getByRole("table", { name: "Weight history" }).getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  const activity = page.getByRole("form", { name: "Manual activity" });
  await activity.getByLabel("Activity name").fill("Afternoon walk");
  await activity.getByLabel("Steps").fill("2500");
  await activity.getByLabel("Minutes").fill("25");
  await activity.getByRole("button", { name: "Save activity" }).click();
  await expect(page.getByRole("status")).toContainText("Activity saved");
  await page.reload();
  await expect(page.getByText("2,300 kcal target")).toBeVisible();
  await page.getByRole("button", { name: "Weight", exact: true }).click();
  await expect(page.getByRole("table", { name: "Weight history" })).toContainText("73.25 kg");
  await expect(page.getByText("72 kg", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("damaged private data fails closed with no seeded health data", async ({ page }) => {
  await page.goto("/app/health");
  await page.evaluate(() => localStorage.setItem("zigoals:health:v1", "{damaged private health"));
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "could not be read" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("zigoals:health:v1"))).toBe("{damaged private health");
  await expect(page.getByRole("button", { name: "Log to diary" })).toHaveCount(0);
});

test("historical diary dates and food edits remain usable at 320 pixels", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/app/health");
  await food(page, "History oats");
  await page.getByRole("button", { name: "Edit food History oats" }).click();
  const editor = page.getByRole("form", { name: "Food details" });
  await editor.getByLabel("Calories (kcal)").fill("160");
  await editor.getByRole("button", { name: "Save food", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Food saved");
  await page.getByRole("button", { name: "Diary", exact: true }).click();
  await page.getByLabel("Journal date").fill("2024-02-29");
  const log = page.getByRole("form", { name: "Log a meal" });
  await log.getByLabel("Food or recipe").selectOption({ label: "History oats · food" });
  await log.getByRole("button", { name: "Log to diary" }).click();
  await expect(page.getByRole("region", { name: "Breakfast diary" })).toContainText("160 kcal");
  await page.getByRole("button", { name: "Next day" }).click();
  await expect(page.getByLabel("Journal date")).toHaveValue("2024-03-01");
  await expect(page.getByRole("region", { name: "Breakfast diary" })).toContainText("Nothing logged yet");
  await page.getByRole("button", { name: "Previous day" }).click();
  await expect(page.getByRole("region", { name: "Breakfast diary" })).toContainText("160 kcal");
  await expect(page).toHaveURL(/\/app\/health$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/zigoals-run7-health/history-320-${testInfo.project.name}.png`, fullPage: true });
});
