import { expect, test, type Page } from "@playwright/test";
import { createHabit, emptyHabitData, logHabitCount, HABITS_KEY } from "../lib/habits";

test.use({ timezoneId: "Europe/Brussels" });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-15T10:00:00.000Z") });
  // This browser module must work without any external service.
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});
async function addHabit(page: Page, title: string, target = "1") {
  await page.getByRole("button", { name: "+ New habit", exact: true }).click();
  await page.getByLabel("Habit title", { exact: true }).fill(title);
  await page.getByLabel("Daily count target").fill(target);
  await page.getByRole("button", { name: "Create habit", exact: true }).click();
  await expect(page.getByRole("article", { name: title, exact: true })).toBeVisible();
}

test("habit counts, edit, pause, archive, notes and reload stay local and durable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/app/habits");
  await addHabit(page, "Read a few pages", "3");
  let card = page.getByRole("article", { name: "Read a few pages", exact: true });
  await card.getByRole("button", { name: "Add one to Read a few pages" }).click();
  await expect(card.locator(".habit-count")).toHaveText("1 / 3 today");
  await card.getByRole("button", { name: "Complete Read a few pages", exact: true }).click();
  await expect(card.getByRole("button", { name: "Undo completion for Read a few pages" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(card).toBeVisible();
  await card.getByText("History & day notes", { exact: true }).click();
  await card.getByLabel("Day note (optional)").fill("A calm chapter before bed.");
  await card.getByRole("button", { name: "Save day", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText("Day saved.");
  await page.reload();
  card = page.getByRole("article", { name: "Read a few pages", exact: true });
  await expect(card.locator(".habit-count")).toHaveText("3 / 3 today");
  await card.getByText("History & day notes", { exact: true }).click();
  await expect(card.getByLabel("Day note (optional)")).toHaveValue("A calm chapter before bed.");
  await card.getByRole("button", { name: "Edit Read a few pages" }).click();
  await page.getByLabel("Habit title", { exact: true }).fill("Read a chapter");
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  card = page.getByRole("article", { name: "Read a chapter", exact: true });
  await expect(card.locator(".habit-count")).toHaveText("3 / 3 today");
  await card.getByRole("button", { name: "Pause habit" }).click();
  await expect(card.getByText("Paused", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Resume habit" }).click();
  await card.getByRole("button", { name: "Undo completion for Read a chapter" }).click();
  await expect(card.locator(".habit-count")).toHaveText("0 / 3 today");
  await card.getByRole("button", { name: "Archive habit" }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Restore habit" }).click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(card).toBeVisible();
  const data = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), HABITS_KEY))!);
  expect(data.habits).toHaveLength(1);
  expect(data.habits[0].entries[0].note).toBe("A calm chapter before bed.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("historical dates, missed days and scoped link retention remain correct", async ({ page }) => {
  const id = "bc3929b2-7077-4e68-b3cb-7070b21111d5";
  let data = createHabit(emptyHabitData(), { title: "A little daylight", category: "Movement", description: "", notes: "", schedule: { kind: "weekdays", days: [1, 2, 3, 4, 5] }, target: 1, goalLink: { chainId: "another-chain", owner: "another-owner", goalId: "1" } }, new Date("2026-09-11T10:00:00.000Z"), id);
  data = logHabitCount(data, id, "2026-09-11", 1, "", new Date("2026-09-11T10:00:00.000Z"));
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: HABITS_KEY, raw: JSON.stringify(data) });
  await page.goto("/app/habits");
  const card = page.getByRole("article", { name: "A little daylight", exact: true });
  await expect(card.getByText("Goal link retained · another scope or unavailable Goal")).toBeVisible();
  await expect(card.locator(".habit-goal-link a")).toHaveCount(0);
  await card.getByText("History & day notes", { exact: true }).click();
  await expect(card.getByRole("button", { name: "September 12, 2026: Not scheduled, 0 of 1" })).toBeVisible();
  await expect(card.getByRole("button", { name: "September 14, 2026: Missed, 0 of 1" })).toBeVisible();
  await card.getByRole("button", { name: "September 14, 2026: Missed, 0 of 1" }).click();
  await card.getByLabel("Count for this day").fill("1");
  await card.getByRole("button", { name: "Save day", exact: true }).click();
  await expect(card.getByRole("button", { name: "September 14, 2026: Complete, 1 of 1" })).toBeVisible();
  await expect(card.locator(".habit-metrics > div").first()).toContainText("2 days");
  await card.getByRole("button", { name: "Edit A little daylight" }).click();
  await expect(page.getByLabel("Linked Goal (optional)")).toHaveValue("keep");
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  await expect(card.getByText("Goal link retained · another scope or unavailable Goal")).toBeVisible();
});

test("corrupt Habit data is preserved and creation fails closed", async ({ page }) => {
  const damaged = "  { damaged private habit history\n";
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: HABITS_KEY, raw: damaged });
  await page.goto("/app/habits");
  await expect(page.getByRole("alert").filter({ hasText: /private|stored|saved|data/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "+ New habit", exact: true })).toBeDisabled();
  expect(await page.evaluate((key) => localStorage.getItem(key), HABITS_KEY)).toBe(damaged);
});

test("private habit text never enters requests or overwrites existing Goal data", async ({ page }) => {
  const sentinel = "HABIT_PRIVATE_SENTINEL_6a64";
  const requests: string[] = [];
  page.on("request", (request) => requests.push(`${request.url()} ${request.postData() ?? ""}`));
  const legacyKey = "zigoals:metadata:v1:another-chain:another-owner";
  const legacyRaw = '{"schemaVersion":1,"chainId":"another-chain","walletAddress":"another-owner","goals":{}}';
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: legacyKey, raw: legacyRaw });
  await page.goto("/app/habits");
  await addHabit(page, sentinel);
  await page.getByRole("button", { name: `Complete ${sentinel}`, exact: true }).click();
  await page.reload();
  await expect(page.getByRole("article", { name: sentinel, exact: true })).toBeVisible();
  expect(requests.filter((request) => request.includes(sentinel))).toEqual([]);
  expect(await page.evaluate((key) => localStorage.getItem(key), legacyKey)).toBe(legacyRaw);
});

test("selected weekdays and keyboard completion expose only scheduled habits", async ({ page }) => {
  await page.goto("/app/habits");
  await expect(page.getByRole("button", { name: "+ New habit", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "+ New habit", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Habit title", { exact: true })).toBeFocused();
  await page.getByLabel("Habit title", { exact: true }).fill("Tuesday ritual");
  await page.getByRole("combobox", { name: "Schedule", exact: true }).selectOption("weekdays");
  for (const day of ["Monday", "Wednesday", "Thursday", "Friday"]) await page.getByRole("checkbox", { name: day, exact: true }).uncheck();
  await page.getByRole("button", { name: "Create habit", exact: true }).click();
  const card = page.getByRole("article", { name: "Tuesday ritual", exact: true });
  await card.getByRole("button", { name: "Complete Tuesday ritual", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(card.getByRole("button", { name: "Undo completion for Tuesday ritual" })).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "Edit Tuesday ritual" }).click();
  await page.getByRole("checkbox", { name: "Tuesday", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Monday", exact: true }).check();
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  await expect(card.getByText("Not scheduled", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByText("Nothing is scheduled today.", { exact: false })).toBeVisible();
});
