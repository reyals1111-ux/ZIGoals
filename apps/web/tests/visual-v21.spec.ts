import { test, expect } from "@playwright/test";
import { installRun7Demo } from "./fixtures/run7-demo";

test.use({ timezoneId: "Europe/Brussels" });
test("V2.1 artwork, summary-first composition and stable decorative identities", async ({ page }, info) => {
  await installRun7Demo(page);
  await page.setViewportSize({ width: info.project.name === "desktop" ? 1440 : 390, height: info.project.name === "desktop" ? 1024 : 800 });
  await page.goto("/app");
  await expect(page.getByRole("article", { name: "Your destinations", exact: true }).getByRole("link", { name: "First home", exact: true })).toBeVisible();
  await expect(page.locator(".quote-panel")).toHaveCount(0);
  await expect(page.locator(".personalized-today > .today-hero + section")).toHaveAttribute("aria-label", "Life and Wealth snapshot");
  await expect(page.getByRole("region", { name: "Life and Wealth snapshot" })).toContainText("3 active Goals");
  await expect(page.getByRole("button", { name: "Connect Keplr" })).toBeVisible();
  await expect(page.locator(".mode-strip")).toContainText("LOCAL SIMULATION");
  await page.goto("/app/goals");
  await expect(page.locator(".goal-card")).toHaveCount(3);
  const tones = await page.locator(".goal-card").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-tone")));
  expect(tones).toEqual(["0", "1", "2"]);
  await page.reload();
  await expect(page.locator(".goal-card")).toHaveCount(3);
  expect(await page.locator(".goal-card").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-tone")))).toEqual(tones);
  for (const [name, route] of [["today", "/app"], ["habits", "/app/habits"], ["health", "/app/health"]]) {
    await page.goto(route!);
    await expect(page.locator("main h1")).toBeVisible();
    if (name === "today") await expect(page.getByRole("article", { name: "Your destinations", exact: true }).getByRole("link", { name: "First home", exact: true })).toBeVisible();
    if (name === "habits") await expect(page.getByRole("article", { name: "Review my spending" })).toBeVisible();
    if (name === "health") await expect(page.getByRole("region", { name: "Breakfast diary" })).toContainText("Morning oats");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true);
    if (process.env.RUN7_CAPTURE === "1") await page.screenshot({ path: info.outputPath(`${name}-${info.project.name}.png`), fullPage: true, animations: "disabled" });
  }
});
