import { test, expect } from "@playwright/test";
test("unified shell exposes all eight destinations and preserves Alpha controls", async ({ page }) => {
  await page.goto("/app");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [label, href] of [["Today", "/app"], ["Goals", "/app/goals"], ["Stake / Positions", "/app/goals/positions"], ["Habits", "/app/habits"], ["Health", "/app/health"], ["Ecosystem", "/app/ecosystem"], ["Activity", "/app/activity"], ["Settings", "/app/settings"]]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href!);
  }
  await expect(nav.getByRole("link", { name: "Today", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Connect Keplr", exact: true })).toBeVisible();
  await expect(page.locator(".network-banner")).toContainText("No blockchain transactions or financial signatures.");
  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
