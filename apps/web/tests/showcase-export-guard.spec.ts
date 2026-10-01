import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

// QA-17 (Session F, docs/qa/QA_SWEEP_2026-09-30.md): in Showcase, plaintext exports downloaded the fictional demo data
// under the normal backup file names, and such a file could later be restored over real data after the usual
// confirmation only. Showcase exports are now named "showcase-demo", and restoring a file that is detectably Showcase
// data into real data needs an extra confirmation that explains it. The backup format is unchanged.
test.use({ locale: "en-US" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { error: "LOCAL_FIXTURE_ONLY" } }));
});

async function exportHabits(page: Page) {
  const section = page.getByRole("region", { name: "Habits backup", exact: true });
  const download = page.waitForEvent("download");
  await section.getByRole("button", { name: "Export Habits", exact: true }).click();
  const file = await download;
  return { name: file.suggestedFilename(), text: await readFile((await file.path())!, "utf8") };
}

const today = (page: Page) => page.evaluate(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; });

test("a Showcase export is named showcase-demo, and restoring it into real data needs an explicit demo confirmation", async ({ page }) => {
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Load Showcase Demo", exact: true }).click();
  await page.waitForURL("**/app");
  await page.goto("/app/settings");
  const demo = await exportHabits(page);
  // Export names carry the local date (QA-26).
  expect(demo.name).toBe(`zigoals-showcase-demo-habits-backup-${await today(page)}.json`);
  expect(JSON.parse(demo.text).habits).toHaveLength(6);

  await page.getByRole("button", { name: "Return to my data", exact: true }).click();
  await expect(page.getByRole("button", { name: "Load Showcase Demo", exact: true })).toBeVisible();
  const section = page.getByRole("region", { name: "Habits backup", exact: true });
  await section.getByText("Restore Habits from a file", { exact: true }).click();
  await section.getByLabel("Choose Habits backup").setInputFiles({ name: demo.name, mimeType: "application/json", buffer: Buffer.from(demo.text) });
  await expect(section.getByText("This file is Showcase demo data: fictional examples, not your own records.", { exact: false })).toBeVisible();
  await section.getByLabel("Replace my habits with this backup.").check();
  const restore = section.getByRole("button", { name: "Restore Habits", exact: true });
  await expect(restore).toBeDisabled();
  await section.getByLabel("I understand this is Showcase demo data, not my records.").check();
  await expect(restore).toBeEnabled();
});

test("an ordinary export keeps its name and restores without the demo confirmation", async ({ page }) => {
  await page.goto("/app/habits");
  await page.getByRole("button", { name: "+ New habit", exact: true }).click();
  await page.getByLabel("Habit title", { exact: true }).fill("Evening walk");
  await page.getByRole("button", { name: "Create habit", exact: true }).click();
  await expect(page.getByRole("article", { name: "Evening walk", exact: true })).toBeVisible();
  await page.goto("/app/settings");
  const own = await exportHabits(page);
  expect(own.name).toBe(`zigoals-habits-backup-${await today(page)}.json`);
  const section = page.getByRole("region", { name: "Habits backup", exact: true });
  await section.getByText("Restore Habits from a file", { exact: true }).click();
  await section.getByLabel("Choose Habits backup").setInputFiles({ name: own.name, mimeType: "application/json", buffer: Buffer.from(own.text) });
  await expect(section.getByText("Valid supported backup", { exact: false })).toBeVisible();
  await expect(section.getByText("This file is Showcase demo data", { exact: false })).toHaveCount(0);
  await section.getByLabel("Replace my habits with this backup.").check();
  await expect(section.getByRole("button", { name: "Restore Habits", exact: true })).toBeEnabled();
});
