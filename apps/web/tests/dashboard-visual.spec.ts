import { test, expect } from "@playwright/test";
import { openFilm } from "./ab-shell";
import { expectAlphaFacts } from "./ab-shell";
import { walletArea } from "./phone-nav";
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
    // Session AB-Design (ADR-024 D7; re-pointed, as strict): the compact notice carries the label; the wallet buttons
    // are in the status row (a phone: the Status & wallet sheet behind More); the footer line carries the sentence.
    const wallet = await walletArea(page);
    await expect(wallet.getByRole("button", { name: "Connect Keplr", exact: true })).toBeVisible();
    if (await page.getByRole("dialog", { name: "Status" }).isVisible()) await page.keyboard.press("Escape");
    await expect(page.locator(".today-hero").getByRole("button", { name: "+ Quick add", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Plan my first goal" })).toHaveAttribute("href", "/app/goals/new");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`dashboard-${viewport.width}.png`), fullPage: true });
    await openFilm(page); // Session AB-Design: the how-to first, then the film
    await expect(page.getByRole("dialog", { name: "ZIGoals brand film" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Session AB-Design: the three steps live in the footer banner on every page.
    await expect(page.getByRole("list", { name: "How ZIGoals works" })).toBeAttached();
    await page.getByRole("link", { name: "Plan my first goal" }).click();
    await expect(page).toHaveURL(/\/app\/goals\/new$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Session AC: the notice and Settings' facts block (in the app, then back), after this page's own steps.
    await expectAlphaFacts(page);
  }
  expect(errors).toEqual([]);
});
