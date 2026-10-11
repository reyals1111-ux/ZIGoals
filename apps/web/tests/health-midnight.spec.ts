import { expect, test, type Page } from "@playwright/test";

// QA-16 (Session F, docs/qa/QA_SWEEP_2026-09-30.md): a Health page left open across midnight kept "Today" on the old
// day, and water logged at 00:02 went to yesterday. The open page now follows the journal day; a half-typed entry is
// kept and logged on the new day, and a date the reader chose stays as chosen.
test.use({ locale: "en-US", timezoneId: "Europe/Brussels" });
// 23:59:30 in Brussels on Saturday 24 October 2026 (UTC+2, the night before the clocks go back).
const BEFORE_MIDNIGHT = new Date("2026-10-24T21:59:30.000Z");

const water = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem("zigoals:health:v1") ?? "null") as { daily?: { water: { date: string; amountMilli: number }[] } } | null)?.daily?.water.map((entry) => [entry.date, entry.amountMilli]) ?? []);

test("an open Health page moves to the new day at midnight and keeps a half-typed water entry", async ({ page }) => {
  await page.clock.install({ time: BEFORE_MIDNIGHT });
  await page.goto("/app/health");
  const journal = page.getByLabel("Journal date", { exact: true });
  await expect(journal).toHaveValue("2026-10-24");
  const form = page.getByRole("form", { name: "Water entry" }), amount = form.getByLabel("Water amount", { exact: true });
  await amount.fill("250");

  await page.clock.runFor(60_000);
  await expect(journal).toHaveValue("2026-10-25");
  await expect(amount).toHaveValue("250");
  await form.getByRole("button", { name: "Log water" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Water recorded." })).toBeVisible();
  expect(await water(page)).toEqual([["2026-10-25", 250_000]]);
});

test("a date the reader chose stays as chosen across midnight", async ({ page }) => {
  await page.clock.install({ time: BEFORE_MIDNIGHT });
  await page.goto("/app/health");
  const journal = page.getByLabel("Journal date", { exact: true });
  await expect(journal).toHaveValue("2026-10-24");
  await page.getByRole("button", { name: "Previous day", exact: true }).click();
  await expect(journal).toHaveValue("2026-10-23");
  await page.clock.runFor(60_000);
  await expect(page.getByText("Today in your Health journal · 2026-10-25").first()).toBeAttached();
  await expect(journal).toHaveValue("2026-10-23");
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await expect(journal).toHaveValue("2026-10-25");
  await page.getByRole("button", { name: "Previous day", exact: true }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(journal).toHaveValue("2026-10-25");
});
