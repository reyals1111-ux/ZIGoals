import { test, expect } from "@playwright/test";
import { closeMore, navLink } from "./phone-nav";
test("unified shell exposes all eight destinations and preserves Alpha controls", async ({ page }) => {
  await page.goto("/app");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [label, href] of [["Today", "/app"], ["Goals", "/app/goals"], ["Staking", "/app/staking"], ["Portfolio", "/app/portfolio"], ["Habits", "/app/habits"], ["Health", "/app/health"], ["Ecosystem", "/app/ecosystem"], ["Activity", "/app/activity"], ["Settings", "/app/settings"]]) {
    // On a phone (Session E) the last six destinations are in the More sheet, which navLink opens first.
    await expect(await navLink(page, label!)).toHaveAttribute("href", href!);
  }
  await closeMore(page);
  await expect(nav.getByRole("link", { name: "Today", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Connect Keplr", exact: true })).toBeVisible();
  await expect(page.locator(".network-banner")).toContainText("No blockchain transactions or financial signatures.");
  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
