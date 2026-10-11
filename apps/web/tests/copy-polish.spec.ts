import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { encryptBackup } from "../lib/vault/backup";
import { emptyDashboardSettings } from "../lib/dashboard-settings";
import { emptyHabitData } from "../lib/habits";

// Session G, Part 5: copy and small UX from Session F's QA backlog (docs/qa/QA_SWEEP_2026-09-30.md): QA-21, QA-26,
// QA-27 and QA-28.
test.use({ locale: "en-US" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { error: "LOCAL_FIXTURE_ONLY" } }));
});
const today = (page: Page) => page.evaluate(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; });

test("a habit with a target of 1 reads “1 time per day”, never “1 times” (QA-28)", async ({ page }) => {
  await page.goto("/app/habits");
  await page.getByRole("button", { name: "+ New habit", exact: true }).click();
  await page.getByLabel("Habit title", { exact: true }).fill("Stretch");
  await page.getByRole("button", { name: "Create habit", exact: true }).click();
  const card = page.getByRole("article", { name: "Stretch", exact: true });
  await expect(card).toContainText("1 time per day");
  await expect(card).not.toContainText("1 times");
});

test("a Goal's next and latest contributions use one date format (QA-27)", async ({ page }) => {
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Load Showcase Demo", exact: true }).click();
  await page.waitForURL("**/app");
  const dates = page.locator(".today-contribution-dates").first();
  await expect(dates).toContainText(/Next contribution\s*\d{4}-\d{2}-\d{2}/);
  await expect(dates).toContainText(/Latest contribution\s*.* · \d{4}-\d{2}-\d{2}$/);
  await expect(dates).not.toContainText(/\d{1,2}\/\d{1,2}\/\d{4}/);
});

test("plaintext backups share one file-name pattern without spaces (QA-26)", async ({ page }) => {
  await page.goto("/app/settings");
  const names: string[] = [];
  for (const name of ["Positions and Goals", "Habits", "Health"]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: `Export ${name}`, exact: true }).click();
    const file = await download;
    names.push(file.suggestedFilename());
    expect(JSON.parse(await readFile((await file.path())!, "utf8"))).toBeTruthy();
  }
  const date = await today(page);
  expect(names).toEqual([`zigoals-positions-and-goals-backup-${date}.json`, `zigoals-habits-backup-${date}.json`, `zigoals-health-backup-${date}.json`]);
});

test("one unlock restores several modules: the preview stays, restored modules are marked, names are readable (QA-21)", async ({ page }) => {
  const habits = { ...emptyHabitData(), habits: [] };
  const backup = await encryptBackup({ habits: JSON.stringify(habits), settings: JSON.stringify(emptyDashboardSettings()) });
  await page.goto("/app/settings");
  const panel = page.locator("#private-vault");
  await panel.getByText("Restore an encrypted backup", { exact: true }).click();
  await panel.getByLabel("Encrypted backup file", { exact: true }).setInputFiles({ name: "fictional-two-modules.json", mimeType: "application/json", buffer: Buffer.from(backup.file) });
  await panel.getByLabel("Backup recovery secret", { exact: true }).fill(backup.recovery);
  await panel.getByRole("button", { name: "Unlock and preview", exact: true }).click();
  const inventory = panel.getByLabel("Protected backup inventory", { exact: true });
  await expect(inventory).toBeVisible();
  const picker = panel.getByLabel(/^Module to restore/);
  expect(await picker.locator("option").evaluateAll((options) => options.map((o) => [(o as HTMLOptionElement).value, o.textContent]))).toEqual([["habits", "Habits"], ["settings", "Today preferences"]]);
  await expect(panel).toContainText("Validated modules: Habits, Today preferences. No changes applied.");

  await picker.selectOption("habits");
  await panel.getByLabel("Replace the selected module with this validated backup.", { exact: true }).check();
  await panel.getByRole("button", { name: "Restore selected module", exact: true }).click();
  await expect(panel.getByText("Selected module restored; prior local bytes retained.", { exact: true })).toBeVisible();
  // Still unlocked: no file or secret again; the next module is selected and the restored one is marked.
  await expect(inventory).toBeVisible();
  await expect(inventory.locator("li").filter({ hasText: "Habits" })).toContainText("Restored");
  await expect(picker).toHaveValue("settings");
  await expect(picker.locator("option[value=habits]")).toHaveText("Habits · restored");
  await expect(panel.getByLabel("Backup recovery secret", { exact: true })).toHaveValue("");
  await expect(panel).toContainText("Restored so far: Habits. Choose another module, or Done.");

  await panel.getByLabel("Replace the selected module with this validated backup.", { exact: true }).check();
  await panel.getByRole("button", { name: "Restore selected module", exact: true }).click();
  await expect(panel).toContainText("Restored so far: Habits, Today preferences.");
  await panel.getByRole("button", { name: "Done", exact: true }).click();
  await expect(inventory).toHaveCount(0);
});
