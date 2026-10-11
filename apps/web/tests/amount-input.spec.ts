import { expect, test, type Page } from "@playwright/test";

// QA-14 (Session F, docs/qa/QA_SWEEP_2026-09-30.md): money and quantity fields refused a decimal comma and surrounding
// spaces ("1200,50", " 1000 ") with "Enter a non-negative decimal amount.", while the Goal preview showed "1200,50 EUR"
// as if it were valid. Private amount fields now read Health's unambiguous-comma rule and ignore surrounding spaces, and
// the preview shows exactly what saving reads, or why saving would refuse it. Chain amounts keep parseUnits untouched.
test.use({ locale: "en-US" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }));
});

const goals = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem("zigoals:platform:v1") ?? "null") as { goals: { name: string; target: string; decimals: number }[] } | null)?.goals ?? []);

async function valueGoal(page: Page, name: string, target: string) {
  await page.goto("/app/goals/new");
  await page.getByLabel("Goal name", { exact: true }).fill(name);
  await page.getByRole("radio", { name: "Value", exact: true }).check();
  await page.getByLabel("Target amount", { exact: true }).fill(target);
}

for (const [typed, shown, units] of [["1200,50", "1200.50 USD", "120050"], [" 1000 ", "1000 USD", "100000"]] as const) {
  test(`a Goal target typed as "${typed}" is previewed and saved as ${shown}`, async ({ page }) => {
    await valueGoal(page, "Typed target", typed);
    await expect(page.getByRole("region", { name: "Goal preview" }).locator("strong")).toHaveText(shown);
    await page.getByRole("button", { name: "Create goal", exact: true }).click();
    await page.waitForURL("**/app/goals/tracked/**");
    expect((await goals(page)).map((goal) => [goal.name, goal.target, goal.decimals])).toEqual([["Typed target", units, 2]]);
  });
}

test('an ambiguous "1,234" target is flagged in the preview and refused on save, with the same reason', async ({ page }) => {
  await valueGoal(page, "Ambiguous target", "1,234");
  const reason = "“1,234” could mean 1234 or 1.234. Type it without a thousands separator.";
  await expect(page.getByRole("region", { name: "Goal preview" }).locator("strong")).toHaveText(`Unreadable amount · ${reason} USD`);
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: reason })).toBeVisible();
  expect(await goals(page)).toEqual([]);
});

test("a manual valuation accepts a decimal comma and surrounding spaces", async ({ page }) => {
  await page.goto("/app/wealth");
  await page.getByRole("button", { name: "+ Add asset" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Add to your wealth" });
  await sheet.getByRole("button", { name: "Cash", exact: true }).click();
  await sheet.getByLabel("Asset name", { exact: true }).fill("Comma savings");
  await sheet.getByLabel("Cash amount", { exact: true }).fill(" 1250,75 ");
  await sheet.getByRole("button", { name: "Save asset", exact: true }).click();
  await expect(sheet).toHaveCount(0);
  const position = await page.evaluate(() => (JSON.parse(localStorage.getItem("zigoals:platform:v1") ?? "null") as { positions: { providerId: string; quantity: string }[] }).positions.find((item) => item.providerId === "Comma savings"));
  expect(position?.quantity).toBe("1250750000000000000000");
});
