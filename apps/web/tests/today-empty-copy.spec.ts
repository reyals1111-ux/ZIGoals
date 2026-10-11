import { expect, test } from "@playwright/test";

// QA-31 (Session F, docs/qa/QA_SWEEP_2026-09-30.md): with no habits, Today's daily rhythm read
// "0 more chances to take a small step." and its ring "0% exact progress · target not yet reached".
test.use({ locale: "en-US" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { error: "LOCAL_FIXTURE_ONLY" } }));
});

test("with no habits, Today's daily rhythm says how to begin instead of counting zero chances", async ({ page }) => {
  await page.goto("/app");
  const rhythm = page.getByRole("link").filter({ has: page.getByRole("heading", { name: "Your daily rhythm", exact: true }) });
  await expect(rhythm).toContainText("Create your first habit to see today’s rhythm.");
  await expect(rhythm).not.toContainText("0 more chances");
  await expect(rhythm.getByRole("progressbar", { name: "Habits completed today" })).toHaveAttribute("aria-valuetext", "No Habits scheduled today");
});
