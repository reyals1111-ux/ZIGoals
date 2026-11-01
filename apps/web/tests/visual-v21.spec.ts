import { test, expect } from "@playwright/test";
import {expectAlphaMode} from "./ab-shell";
import { installRun7Demo } from "./fixtures/run7-demo";
import { openTodayWidgets, walletArea } from "./phone-nav";
import {chooseChain} from "./chain-choice";
// Session AK X1 (RELEASE_REVIEW R2–R5): this spec tests the wallet buttons.
// A person chooses that module, so the spec chooses the chain first, as a person does (tests/chain-choice.ts).
test.beforeEach(async ({page}) => { await chooseChain(page); });

test.use({ timezoneId: "Europe/Brussels" });
test("V2.1 artwork, summary-first composition and stable decorative identities", async ({ page }, info) => {
  await installRun7Demo(page);
  await page.setViewportSize({ width: info.project.name === "desktop" ? 1440 : 390, height: info.project.name === "desktop" ? 1024 : 800 });
  await page.goto("/app");
  await openTodayWidgets(page);
  // Session AK (ADR-036, deliberate): a goal shows once on Today (G2, RELEASE_REVIEW_2 R2-9) — as its card under "Your goals"; the destinations widget lists no goal names while those cards are on Today.
  await expect(page.getByRole("article", { name: "Your destinations", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Your goals", exact: true }).getByRole("link", { name: "First home", exact: true })).toBeVisible();
  await expect(page.locator(".quote-panel")).toHaveCount(0);
  const snapshot = page.getByRole("region", { name: "Your Today widgets" }).getByRole("region", { name: "Life and Wealth snapshot" });
  await expect(snapshot).toBeVisible();
  await expect(snapshot.getByRole("heading", { name: "Destinations in motion" })).toBeVisible();
  expect(await page.locator(".today-hero").evaluate((hero, section) => Boolean(hero.compareDocumentPosition(section as Node) & Node.DOCUMENT_POSITION_FOLLOWING), await snapshot.elementHandle())).toBe(true);
  // Session Z-Cloud Part 4.2 (mechanics): on a phone the wallet button is in the Status sheet.
  await expect((await walletArea(page)).getByRole("button", { name: "Connect Keplr" })).toBeVisible();
  await expectAlphaMode(page, "LOCAL SIMULATION");
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
    if (name === "today") await openTodayWidgets(page);
    // Session AK (ADR-036, deliberate): a goal shows once on Today (G2, R2-9), as its card under "Your goals"; the destinations widget no longer repeats its name.
    if (name === "today") await expect(page.getByRole("article", { name: "Your destinations", exact: true })).toBeVisible();
    if (name === "today") await expect(page.getByRole("region", { name: "Your goals", exact: true }).getByRole("link", { name: "First home", exact: true })).toBeVisible();
    if (name === "habits") await expect(page.getByRole("article", { name: "Review my spending" })).toBeVisible();
    if (name === "health") await expect(page.getByRole("region", { name: "Breakfast diary" })).toContainText("Morning oats");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true);
    if (process.env.RUN7_CAPTURE === "1") await page.screenshot({ path: info.outputPath(`${name}-${info.project.name}.png`), fullPage: true, animations: "disabled" });
  }
});
