import { expect, test } from "@playwright/test";
import { HEALTH_STORAGE_KEY, healthSchema } from "../lib/health";
import { dailyData } from "../lib/health-daily";
import { buildShowcase } from "../lib/showcase-data";

// QA-24 (Session F, docs/qa/QA_SWEEP_2026-09-30.md): Today's Health card used the device's day while the Health page
// uses the journal's timezone, so the two could disagree for a few hours a day. The card now uses the journal day.
test.use({ locale: "en-US", timezoneId: "America/New_York" });

test("Today's Health card shows the journal day's meals when the journal zone is ahead of the device", async ({ page }) => {
  // 22:00 on 1 October in New York is 04:00 on 2 October in Brussels, the journal's zone.
  await page.clock.install({ time: new Date("2026-10-02T02:00:00.000Z") });
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { error: "LOCAL_FIXTURE_ONLY" } }));
  const health = JSON.parse(buildShowcase("2026-10-02").records[HEALTH_STORAGE_KEY]!);
  health.diary = health.diary.filter((entry: { date: string }) => entry.date === "2026-10-02");
  health.activity = []; health.weights = [];
  const daily = dailyData(health);
  health.daily = { ...daily, preferences: { ...daily.preferences, timezone: "Europe/Brussels" } };
  const stored = JSON.stringify(healthSchema.parse(health));
  await page.addInitScript(([key, value]) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, value); }, [HEALTH_STORAGE_KEY, stored] as const);
  await page.goto("/app");
  const card = page.getByRole("region", { name: "Today's health", exact: true });
  await expect(card).toContainText("kcal logged");
  await expect(card).not.toContainText("Add your first meal");
});
