import { test, expect } from "@playwright/test";

test("dashboard destinations, safety and layout work at desktop and 320px", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [{ width: 1440, height: 1050 }, { width: 320, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Today's Goals, Habits & Health = Tomorrow's Wealth" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "A destination for your next chapter." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Keplr", exact: true })).toBeVisible();
    await expect(page.locator(".network-banner")).toContainText("ZIGCHAIN TESTNET · PUBLIC ALPHA");
    await expect(page.locator(".network-banner")).toContainText("No blockchain transactions or financial signatures.");
    await expect(page.getByRole("link", { name: "+ Create a goal", exact: true })).toHaveAttribute("href", "/app/goals/new");
    await expect(page.getByRole("link", { name: "Plan my first goal" })).toHaveAttribute("href", "/app/goals/new");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`dashboard-${viewport.width}.png`), fullPage: true });
    await page.getByRole("link", { name: "See how it works" }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(page.getByRole("region", { name: "How it works" })).toBeInViewport();
    await page.getByRole("link", { name: "Plan my first goal" }).click();
    await expect(page).toHaveURL(/\/app\/goals\/new$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
