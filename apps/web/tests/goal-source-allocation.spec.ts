import { expect, test, type Page } from "@playwright/test";
import { manualSourcePosition } from "../lib/manual-source";
import { allocate, emptyPlatform, privateGoalSchema, type Platform } from "../lib/positions";
import { setup } from "./run9-1-fixture";

// QA-15 (Session F, docs/qa/QA_SWEEP_2026-09-30.md): a source already fully allocated to another Goal could be
// "included" with 0 units, and was then dropped silently on Create. Include is now disabled for such a source, with
// the reason, and Create refuses a listed source with 0 units by name instead of dropping it.
test.use({ locale: "en-US" });

function fixture(allocated: boolean): Platform {
  const cash = manualSourcePosition({ category: "Cash", name: "Euro savings", quantity: "1000", currency: "EUR", symbol: "", metal: "", unit: "", value: "", notes: "" });
  const goal = privateGoalSchema.parse({ id: "7001", name: "Rainy day", type: "VALUE", status: "active", asset: "EUR", denom: "EUR", decimals: 2, target: "100000", notes: "Fictional fixture", createdAt: "2026-09-01T00:00:00.000Z", milestones: [] });
  const data: Platform = { ...emptyPlatform(), positions: [cash], goals: [goal] };
  return allocated ? allocate(data, goal.id, cash.id, cash.quantity) : data;
}

async function startValueGoal(page: Page) {
  await page.goto("/app/goals/new");
  await page.getByLabel("Goal name", { exact: true }).fill("Second chapter");
  await page.getByRole("radio", { name: "Value", exact: true }).check();
  await page.getByLabel("Target amount", { exact: true }).fill("5000");
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page.locator(".picker-existing").getByRole("button").filter({ hasText: "Euro savings" }).click();
}

test("a source fully allocated to another Goal cannot be included, and says why", async ({ page }) => {
  await setup(page, fixture(true));
  await startValueGoal(page);
  await expect(page.getByRole("button", { name: "Include selected source", exact: true })).toBeDisabled();
  await expect(page.getByText("This source is fully allocated to other Goals. Free some of its units there to include it here.", { exact: true })).toBeVisible();
});

test("a listed source with 0 units is refused by name before the Goal is created, never dropped silently", async ({ page }) => {
  await setup(page, fixture(false));
  await startValueGoal(page);
  await page.getByRole("button", { name: "Include selected source", exact: true }).click();
  await page.getByLabel("Units to allocate: Euro savings", { exact: true }).fill("0");
  // Continue checks the allocation exactly as Create does.
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Euro savings: enter units to allocate, or remove this source." })).toBeVisible();
  const goals = await page.evaluate(() => (JSON.parse(localStorage.getItem("zigoals:platform:v1")!) as Platform).goals.map((goal) => goal.name));
  expect(goals).toEqual(["Rainy day"]);
});
