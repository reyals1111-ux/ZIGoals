import { expect, test, type Page } from "@playwright/test";
import { startLandingServer, type LandingServer } from "./landing-server";

// Landing V5: the equation "Goals, Habits & Health = Wealth" adds exactly one word per viewport of scrolling, on
// desktop and on phones. The first check uses only what V4 and V5 share (the four `[data-equation]` parts and the
// `#equation` section): V4 failed it (1,4,4,4,4 on desktop and 4,4,4,4,4 on phones; see
// docs/verification/landing-v5/INVENTORY.md), and it was committed as an expected failure before V5 fixed it.

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
  { project: "mobile", width: 320, height: 568 },
];

for (const size of SIZES) {
  test(`each viewport of scrolling adds exactly one equation word at ${size.width}×${size.height}`, async ({ page }, info) => {
    test.skip(info.project.name !== size.project, `${size.width}px runs in the ${size.project} project`);
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

test("a fast scroll past several steps still shows the words one at a time, in order", async ({ page }) => {
  await page.goto(server.url);
  await page.waitForLoadState("load");
  await scrollEquation(page, -1);
  await page.waitForTimeout(800);
  expect(await visibleWords(page)).toBe(0);
  // One jump across all four step blocks, as a hard flick would do.
  await scrollEquation(page, 3.2);
  const seen: number[] = [];
  for (let i = 0; i < 45; i++) {
    seen.push(await visibleWords(page));
    await page.waitForTimeout(50);
  }
  expect(seen.at(-1)).toBe(4);
  for (let i = 1; i < seen.length; i++) {
    expect(seen[i]! - seen[i - 1]!, `samples ${i - 1}→${i}: ${seen.join(",")}`).toBeGreaterThanOrEqual(0);
    expect(seen[i]! - seen[i - 1]!, `samples ${i - 1}→${i}: ${seen.join(",")}`).toBeLessThanOrEqual(1);
  }
  // Every count from 1 to 4 was on screen for at least one sample: nothing appeared together.
  for (const count of [1, 2, 3, 4]) expect(seen, seen.join(",")).toContain(count);
});

test("the page is never held: scrolling always continues past the equation", async ({ page }) => {
  await page.goto(server.url);
  await page.waitForLoadState("load");
  await page.mouse.move(200, 300);
  const start = await page.evaluate(() => document.querySelector("#equation")!.getBoundingClientRect().top + scrollY - innerHeight);
  await page.evaluate(top => window.scrollTo({ top, behavior: "instant" }), start);
  const positions: number[] = [];
  // Ordinary wheel scrolling through the whole section: every wheel moves the page by the full amount.
  const viewport = await page.evaluate(() => innerHeight);
  for (let i = 0; i < 8; i++) {
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, viewport);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + viewport * 0.9);
    positions.push(await page.evaluate(() => scrollY));
  }
  const end = await page.evaluate(() => {
    const section = document.querySelector("#equation")!;
    return section.getBoundingClientRect().bottom;
  });
  expect(end, `positions ${positions.join(",")}`).toBeLessThan(0);
});

test("reduced motion, ?motion=off and short screens show the whole equation at once, unpinned", async ({ page }, info) => {
  const phone = info.project.name === "mobile";
  const cases: { label: string; viewport: { width: number; height: number }; url: string; reduce: boolean }[] = [
    { label: "reduced motion", viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, url: server.url, reduce: true },
    { label: "?motion=off", viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, url: `${server.url}/?motion=off`, reduce: false },
    { label: "short screen", viewport: phone ? { width: 844, height: 390 } : { width: 1280, height: 540 }, url: server.url, reduce: false },
  ];
  for (const item of cases) {
    await page.emulateMedia({ reducedMotion: item.reduce ? "reduce" : "no-preference" });
    await page.setViewportSize(item.viewport);
    await page.goto(item.url);
    await page.waitForLoadState("load");
    await scrollEquation(page, -0.2);
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => ({
      ready: document.documentElement.classList.contains("eqv5-ready"),
      stage: getComputedStyle(document.querySelector(".eqv5-stage")!).position,
      opacities: [...document.querySelectorAll("[data-equation]")].map(element => getComputedStyle(element).opacity),
      ticks: [...document.querySelectorAll("#equation .equation-track span")].map(element => element.classList.contains("active")),
      height: document.querySelector("#equation")!.getBoundingClientRect().height / innerHeight,
    }));
    expect(state.ready, item.label).toBe(false);
    expect(state.stage, item.label).not.toBe("sticky");
    expect(state.opacities, item.label).toEqual(["1", "1", "1", "1"]);
    expect(state.ticks, item.label).toEqual([true, true, true, true]);
    expect(state.height, `${item.label}: section height in viewports`).toBeLessThan(3);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("all four words and figures are visible", async ({ page }) => {
    await page.goto(server.url);
    await page.waitForLoadState("load");
    const opacities = await page.evaluate(() => [...document.querySelectorAll("[data-equation]")].map(element => getComputedStyle(element).opacity));
    expect(opacities).toEqual(["1", "1", "1", "1"]);
    expect(await page.locator("#equation .eqv5-ink").allTextContents()).toEqual(["Goals", "Habits", "& Health", "= Wealth"]);
  });
});
