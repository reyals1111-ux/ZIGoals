import { test, expect } from "@playwright/test";
import {openFold} from "./phone-nav";

test("dashboard destinations, safety and layout work at desktop and 320px", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [{ width: 1440, height: 1050 }, { width: 320, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: "Today's Goals, Habits & Health = Tomorrow's Wealth" })).toBeVisible();
    // On a phone the destination invitation folds to a row (Session I, Part 9); open it first.
    await openFold(page, "Plan a new destination");
    await expect(page.getByRole("heading", { name: "A destination for your next chapter." })).toBeVisible();
    // Session Z-Cloud Part 4.2–4.3: without a wallet the label says practice money; a phone keeps the notices and the
    // wallet buttons in the Status sheet behind its one status line.
    const line = page.locator(".phone-status-line"), phone = await line.isVisible();
    if (phone) await line.click();
    const notices = phone ? page.getByRole("dialog", { name: "Status" }) : page.locator(".app-topbar");
    await expect(notices.getByRole("button", { name: "Connect Keplr", exact: true })).toBeVisible();
    await expect(notices).toContainText("PRACTICE MONEY (NO REAL VALUE) · PUBLIC ALPHA");
    await expect(notices).toContainText("No blockchain transactions or financial signatures.");
    if (phone) await page.keyboard.press("Escape");
    await expect(page.locator(".today-hero").getByRole("button", { name: "+ Quick add", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Plan my first goal" })).toHaveAttribute("href", "/app/goals/new");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`dashboard-${viewport.width}.png`), fullPage: true });
    await page.getByRole("button", { name: "See how it works" }).click();
    await expect(page.getByRole("dialog", { name: "ZIGoals brand film" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await openFold(page, "How it works");
    await expect(page.getByRole("region", { name: "How it works" })).toBeAttached();
    await page.getByRole("link", { name: "Plan my first goal" }).click();
    await expect(page).toHaveURL(/\/app\/goals\/new$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
