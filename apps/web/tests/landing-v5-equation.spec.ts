import { expect, test, type Page } from "@playwright/test";
import { startLandingServer, type LandingServer } from "./landing-server";

// Landing V5, Part 1.1: the equation "Goals, Habits & Health = Wealth" must add exactly one word per viewport of
// scrolling, on desktop and on phones. These checks only use what V4 and V5 share: the four `[data-equation]` parts
// and the `#equation` section. V4 fails them (Part 1.1 records why), so they start as expected failures and the V5
// equation (Part 1.2) turns them into plain tests.

let server: LandingServer;
test.beforeAll(async () => { server = await startLandingServer(); });
test.afterAll(async () => { await server.close(); });

/** Equation parts a visitor can see: fully opaque (with every ancestor), not painted in V4's quiet grey. */
async function visibleWords(page: Page): Promise<number> {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-equation]")].filter(element => {
    let opacity = 1;
    for (let node: HTMLElement | null = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    const quiet = [element, ...element.querySelectorAll<HTMLElement>("*")].some(part => getComputedStyle(part).color === "rgb(106, 124, 156)");
    return opacity >= 0.95 && !quiet && element.getBoundingClientRect().height > 0;
  }).length);
}

/** Instantly scrolls so the equation section starts `viewports` viewport-heights above the top of the screen. */
async function scrollEquation(page: Page, viewports: number) {
  await page.evaluate(at => {
    const root = document.documentElement;
    const top = document.querySelector("#equation")!.getBoundingClientRect().top + scrollY;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, Math.round(top + innerHeight * at));
    root.style.scrollBehavior = "";
  }, viewports);
}

const SIZES = [
  { project: "desktop", width: 1440, height: 900 },
  { project: "mobile", width: 390, height: 844 },
  { project: "mobile", width: 375, height: 667 },
];

for (const size of SIZES) {
  test(`each viewport of scrolling adds exactly one equation word at ${size.width}×${size.height}`, async ({ page }, info) => {
    test.skip(info.project.name !== size.project, `${size.width}px runs in the ${size.project} project`);
    test.fail(true, "V4: the stepped reveal is off at 700px and below, and on desktop it passes all four steps within 432px (Part 1.1)");
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto(server.url);
    await page.waitForLoadState("load");
    const steps: number[] = [];
    for (const at of [0.05, 1.05, 2.05, 3.05]) {
      await scrollEquation(page, at);
      await page.waitForTimeout(1200);
      steps.push(await visibleWords(page));
    }
    // Back up one viewport: one word leaves again.
    await scrollEquation(page, 2.05);
    await page.waitForTimeout(1200);
    steps.push(await visibleWords(page));
    expect(steps).toEqual([1, 2, 3, 4, 3]);
  });
}
