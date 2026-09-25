import { test, expect } from "@playwright/test";

test("ecosystem research is readable without connecting a wallet", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error=>errors.push(error.message));
  await page.goto("/app");
  await page.getByRole("navigation", {name:"Main navigation"}).getByRole("link", { name: "Ecosystem", exact:true }).click();
  await expect(page.getByRole("heading", { name: "Explore the ZIGChain ecosystem." })).toBeVisible();
  await page.locator(".ecosystem-tools > summary").click();
  await expect(page.getByRole("link", { name: "Open Range testnet ↗" })).toHaveAttribute("href", "https://app.range.org/zigchain-testnet/general");
  await expect(page.getByRole("link", { name: "Open ZIGScan testnet ↗" })).toHaveAttribute("href", "https://testnet.zigscan.org/");
  const noble = page.locator(".ecosystem-project").filter({has:page.getByRole("heading",{name:"Noble",exact:true})});
  await noble.locator("summary").click();
  await expect(noble).toContainText("sunset");
  const actions = noble.locator(".ecosystem-project-actions");
  await expect(actions).toContainText("Website unavailable in this review");
  await expect(actions.getByRole("link")).toHaveCount(0);
  await expect(page.getByText("No external curator, originator, custodian or servicer relationship is configured.")).toBeVisible();
  const fits = await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path:`/tmp/zigoals-m2-ecosystem-${testInfo.project.name}.png`,fullPage:true});
});
