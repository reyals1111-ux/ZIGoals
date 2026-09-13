import { test, expect } from "@playwright/test";

test("ecosystem research is readable without connecting a wallet", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error=>errors.push(error.message));
  await page.goto("/app");
  await page.getByRole("link", { name: "Explore the ecosystem →" }).click();
  await expect(page.getByRole("heading", { name: "Built to work together." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Range testnet ↗" })).toHaveAttribute("href", "https://app.range.org/zigchain-testnet/general");
  await expect(page.getByRole("link", { name: "Open ZIGScan testnet ↗" })).toHaveAttribute("href", "https://testnet.zigscan.org/");
  const noble = page.locator("details").filter({has:page.locator("summary", {hasText:"Noble"})});
  await noble.locator("summary").click();
  await expect(noble).toContainText("sunset");
  await expect(noble.getByRole("button")).toHaveCount(0);
  await expect(page.getByText("No external curator, originator, custodian or servicer relationship is configured.")).toBeVisible();
  const fits = await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path:`/tmp/zigoals-m2-ecosystem-${testInfo.project.name}.png`,fullPage:true});
});
