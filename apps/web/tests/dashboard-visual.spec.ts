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
    await expect(page.locator(".today-hero").getByRole("button", { name: "+ Quick add", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Plan my first goal" })).toHaveAttribute("href", "/app/goals/new");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`dashboard-${viewport.width}.png`), fullPage: true });
    await page.getByRole("button", { name: "See how it works" }).click();
    await expect(page.getByRole("dialog", { name: "ZIGoals intro" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "How it works" })).toBeAttached();
    await page.getByRole("link", { name: "Plan my first goal" }).click();
    await expect(page).toHaveURL(/\/app\/goals\/new$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
