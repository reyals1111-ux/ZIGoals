import { expect, test, type Page } from "@playwright/test";
import { HABITS_KEY } from "../lib/habits";

// The QA-01 twin (Session F, docs/qa/QA_SWEEP_2026-09-30.md, "Deferred" in the Session E entry): Habits value fields were
// <input type="number">, so an English Chrome dropped a typed decimal comma and "1,5" liters became 15 liters. They are
// now text fields with a decimal keypad, read with Health's unambiguous-comma rule: "1,5" is 1.5, "1,234" is refused.
test.use({ locale: "en-US", timezoneId: "Europe/Brussels" });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-15T10:00:00.000Z") });
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});

type Stored = { habits: { title: string; rules: { target: number }[]; entries: { date: string; count: number }[] }[] } | null;
const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null") as Stored, HABITS_KEY);
const habit = async (page: Page, title: string) => (await stored(page))?.habits.find((item) => item.title === title);

async function createWater(page: Page, target: string) {
  await page.goto("/app/habits");
  await page.getByRole("button", { name: "+ New habit", exact: true }).click();
  await page.getByLabel("Habit title", { exact: true }).fill("Drink water");
  await page.getByRole("combobox", { name: "Measurement", exact: true }).selectOption("quantity");
  await page.getByLabel("Unit", { exact: true }).fill("liters");
  const field = page.getByLabel("Target value");
  await field.fill("");
  await field.pressSequentially(target);
  // The comma reaches the app: nothing in the browser drops it on the way.
  await expect(field).toHaveValue(target);
  await page.getByRole("button", { name: "Create habit", exact: true }).click();
}

test('a "1,5" liter target is saved as 1.5, never 15, and a "0,5" check-in as 0.5', async ({ page }) => {
  await createWater(page, "1,5");
  const card = page.getByRole("article", { name: "Drink water", exact: true });
  await expect(card.locator(".habit-count")).toHaveText("0 / 1.5 liters per day");
  await expect.poll(async () => (await habit(page, "Drink water"))?.rules[0]?.target).toBe(1.5);

  await card.getByText("Set or add a value", { exact: true }).click();
  const value = card.getByLabel("Value for Drink water", { exact: true });
  await value.fill("");
  await value.pressSequentially("0,5");
  await expect(value).toHaveValue("0,5");
  await card.getByRole("button", { name: "Set value", exact: true }).click();
  await expect(card.locator(".habit-count")).toHaveText("0.5 / 1.5 liters per day");
  await expect.poll(async () => (await habit(page, "Drink water"))?.entries.map((entry) => entry.count)).toEqual([0.5]);

  await card.getByText("History & reflection", { exact: true }).click();
  const day = card.getByLabel("Count for this day");
  await day.fill("");
  await day.pressSequentially("1,25");
  await card.getByRole("button", { name: "Save day", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText("Day saved.");
  await expect.poll(async () => (await habit(page, "Drink water"))?.entries.map((entry) => entry.count)).toEqual([1.25]);
});

test('an ambiguous "1,234" is refused with a reason and nothing is saved', async ({ page }) => {
  await createWater(page, "1,234");
  await expect(page.getByRole("alert").filter({ hasText: "“1,234” could mean 1234 or 1.234" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Drink water", exact: true })).toHaveCount(0);
  expect(await habit(page, "Drink water")).toBeUndefined();
  // The typed text stays for correction.
  await expect(page.getByLabel("Target value")).toHaveValue("1,234");

  await page.getByLabel("Target value").fill("2");
  await page.getByRole("button", { name: "Create habit", exact: true }).click();
  const card = page.getByRole("article", { name: "Drink water", exact: true });
  await card.getByText("Set or add a value", { exact: true }).click();
  const value = card.getByLabel("Value for Drink water", { exact: true });
  await value.fill("1,234");
  await card.getByRole("button", { name: "Add value", exact: true }).click();
  await expect(card.getByRole("alert")).toContainText("“1,234” could mean 1234 or 1.234");
  expect((await habit(page, "Drink water"))?.entries).toEqual([]);
});

test("no Habits field is a number field: every value is a text field with a numeric or decimal keypad", async ({ page }) => {
  await createWater(page, "2");
  const card = page.getByRole("article", { name: "Drink water", exact: true });
  await card.getByText("Set or add a value", { exact: true }).click();
  await card.getByText("History & reflection", { exact: true }).click();
  await page.getByRole("button", { name: "+ New habit", exact: true }).click();
  for (const schedule of ["interval", "frequency"]) {
    await page.getByRole("combobox", { name: "Schedule", exact: true }).selectOption(schedule);
    await expect(page.locator('main input[type="number"]'), schedule).toHaveCount(0);
  }
  await page.getByRole("combobox", { name: "End condition", exact: true }).selectOption("completions");
  await expect(page.locator('main input[type="number"]')).toHaveCount(0);
  for (const label of ["Target value", "Times per period", "Completion count"]) await expect(page.getByLabel(label, { exact: true }), label).toHaveAttribute("inputmode", /^(decimal|numeric)$/);
});
