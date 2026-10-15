import { alphaNotice, inAboutAlpha } from "./ab-shell";
import { test, expect } from "@playwright/test";
import { closeMore, navLink, walletArea } from "./phone-nav";
test("unified shell exposes all eight destinations and preserves Alpha controls", async ({ page }) => {
  await page.goto("/app");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [label, href] of [["Today", "/app"], ["Goals", "/app/goals"], ["Staking", "/app/staking"], ["Portfolio", "/app/portfolio"], ["Habits", "/app/habits"], ["Health", "/app/health"], ["Ecosystem", "/app/ecosystem"], ["Activity", "/app/activity"], ["Settings", "/app/settings"]]) {
    // On a phone (Session E) the last six destinations are in the More sheet, which navLink opens first.
    await expect(await navLink(page, label!)).toHaveAttribute("href", href!);
  }
  await closeMore(page);
  await expect(nav.getByRole("link", { name: "Today", exact: true })).toHaveAttribute("aria-current", "page");
  // Session Z-Cloud Part 4.2 (mechanics): on a phone the wallet button and the notice are in the Status sheet.
  const status = await walletArea(page);
  await expect(status.getByRole("button", { name: "Connect Keplr", exact: true })).toBeVisible();
  // Session AB-Design: the sentence is the footer's disclaimer line on every width (the sheet repeats it on a phone).
  // Session AC (owner finding 3): the footer's line moved to Settings' facts block; on a computer the notice carries the
  // sentence on this page, and the facts block carries it in Settings on every width.
  const phone = await page.getByRole("dialog", { name: "Status" }).isVisible();
  await expect(phone ? status : alphaNotice(page)).toContainText("No blockchain transactions or financial signatures.");
  if (phone) await page.keyboard.press("Escape");
  await inAboutAlpha(page, about => expect(about.locator(".network-banner")).toContainText("No blockchain transactions or financial signatures."));
  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
