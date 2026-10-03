import { expect, test, type Page } from "@playwright/test";
import { landingFileSize, startLandingServer, type LandingServer } from "./landing-server";

// Landing V5 budget (Session N). Bytes are uncompressed file bytes as stored in landing/, and 1 KB = 1,000 bytes.
// Weight, layout shift and "no endless loop" run everywhere, CI included, because they are deterministic.
// LCP and long tasks depend on the machine, so they run only with LANDING_PERF=1 and their numbers go to
// docs/verification/landing-v5/README.md.
// - firstView: the page, its styles and scripts and every image on the first screen, before any scroll.
// - beforeScroll: firstView plus the lazy images the browser fetches early because they sit just below the fold.
// - phoneFullScroll: up to 1.8 MB because the phone fold frames were remade as 12-frame sets (owner decision N16).
const BUDGET = {
  firstView: 260_000,
  beforeScroll: 360_000,
  phoneFullScroll: 1_800_000,
  desktopFullScroll: 6_000_000,
  cls: 0.01,
  lcpPhoneMs: 2_500,
  lcpDesktopMs: 1_200,
  longTaskMs: 50,
};
const FILM = "assets/video/zigoals-origami-web.mp4";

let server: LandingServer;
test.beforeAll(async () => { server = await startLandingServer(); });
test.afterAll(async () => { await server.close(); });

const sum = (files: Iterable<string>) => [...files].reduce((total, file) => total + landingFileSize(file), 0);

async function observeLayoutShift(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

/** Scrolls the whole page half a viewport at a time, as a reader would, then back to the top. */
async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = await page.evaluate(() => Math.round(innerHeight / 2));
  for (let y = 0; y <= height; y += step) {
    await page.evaluate(top => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1_000);
}

/** Weight of one full visit. The film counts at its file size whenever the page asked for it. */
async function visit(page: Page, viewport: { width: number; height: number }) {
  server.files.clear();
  await page.setViewportSize(viewport);
  await page.goto(server.url);
  await page.waitForLoadState("load");
  await page.waitForTimeout(800);
  const beforeScroll = new Set(server.files);
  // Files only lazy images below the first screen use; a file any other image uses (the hero mark) is first view.
  const { below, needed } = await page.evaluate(() => {
    const path = (image: HTMLImageElement) => decodeURIComponent(new URL(image.currentSrc || image.src).pathname).slice(1);
    const later = (image: HTMLImageElement) => image.loading === "lazy" && image.getBoundingClientRect().top >= innerHeight;
    const images = [...document.images].filter(image => image.currentSrc || image.src);
    return { below: images.filter(later).map(path), needed: images.filter(image => !later(image)).map(path) };
  });
  const firstView = [...beforeScroll].filter(file => !below.includes(file) || needed.includes(file));
  await observeLayoutShift(page);
  await scrollThrough(page);
  const all = new Set(server.files);
  const filmRequested = await page.evaluate(() => Boolean(document.querySelector("#brand-film")?.getAttribute("src")));
  if (filmRequested && viewport.width > 950) all.add(FILM);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  return {
    firstView: sum(firstView), firstViewFiles: firstView.length, beforeScroll: sum(beforeScroll), beforeScrollFiles: beforeScroll.size,
    fullScroll: sum(all), files: all.size, cls,
  };
}

test("one full visit stays within the weight and layout-shift budget", async ({ page }, info) => {
  const phone = info.project.name === "mobile";
  const result = await visit(page, phone ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  test.info().annotations.push({ type: "landing-weight", description: JSON.stringify({ project: info.project.name, ...result }) });
  console.log(`landing-weight ${info.project.name} ${JSON.stringify(result)}`);
  expect(result.firstView, "first view bytes").toBeLessThanOrEqual(BUDGET.firstView);
  expect(result.beforeScroll, "bytes fetched before the first scroll").toBeLessThanOrEqual(BUDGET.beforeScroll);
  expect(result.fullScroll, "full scroll-through bytes").toBeLessThanOrEqual(phone ? BUDGET.phoneFullScroll : BUDGET.desktopFullScroll);
  expect(result.cls, "cumulative layout shift").toBeLessThan(BUDGET.cls);
});

test("nothing animates forever and nothing keeps running when the page is idle", async ({ page }) => {
  await page.goto(server.url);
  await page.waitForLoadState("load");
  await scrollThrough(page);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight / 3, behavior: "instant" }));
  await page.waitForTimeout(1_500);
  const endless = await page.evaluate(() => document.getAnimations()
    .filter(animation => animation.effect?.getComputedTiming().iterations === Infinity)
    .map(animation => (animation as CSSAnimation).animationName ?? animation.id ?? "unnamed"));
  expect(endless, "animations that never end").toEqual([]);
  expect(await page.locator("video[loop]").count(), "looping videos").toBe(0);
  // Once scrolling stops, no script may keep asking for frames.
  const frames = await page.evaluate(async () => {
    let count = 0;
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => { count++; return original(callback); };
    await new Promise(resolve => setTimeout(resolve, 2_000));
    window.requestAnimationFrame = original;
    return count;
  });
  expect(frames, "animation frames requested while idle").toBe(0);
});

test("LCP and long tasks on a mid-range phone and on desktop (LANDING_PERF=1)", async ({ page, context }, info) => {
  test.skip(!process.env.LANDING_PERF, "Machine-dependent: run with LANDING_PERF=1 and record the numbers");
  const phone = info.project.name === "mobile";
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (phone) {
    // Lighthouse's mobile preset with applied (DevTools) throttling: 562.5 ms RTT, 1,474.56 Kbps down,
    // 675 Kbps up, 4× CPU slowdown.
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 562.5, downloadThroughput: (1_474.56 * 1024) / 8, uploadThroughput: (675 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  await page.setViewportSize(phone ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto(server.url);
  await page.waitForLoadState("load");
  await page.waitForTimeout(3_000);
  const lcp = await page.evaluate(() => new Promise<{ time: number; element: string }>(resolve => {
    new PerformanceObserver(list => {
      const last = list.getEntries().at(-1) as unknown as { startTime: number; element?: Element } | undefined;
      resolve({ time: Math.round(last?.startTime ?? -1), element: last?.element ? `${last.element.tagName.toLowerCase()}.${[...last.element.classList].join(".")}` : "unknown" });
    }).observe({ type: "largest-contentful-paint", buffered: true });
  }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.evaluate(() => {
    (window as unknown as { __long: number[] }).__long = [];
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) (window as unknown as { __long: number[] }).__long.push(Math.round(entry.duration));
    }).observe({ type: "longtask" });
  });
  await scrollThrough(page);
  const longTasks = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
  const result = { project: info.project.name, lcpMs: lcp.time, lcpElement: lcp.element, longTasks };
  test.info().annotations.push({ type: "landing-perf", description: JSON.stringify(result) });
  console.log(`landing-perf ${JSON.stringify(result)}`);
  expect(lcp.time).toBeGreaterThan(0);
  expect(lcp.time).toBeLessThanOrEqual(phone ? BUDGET.lcpPhoneMs : BUDGET.lcpDesktopMs);
  expect(longTasks.filter(duration => duration > BUDGET.longTaskMs), "long tasks while scrolling").toEqual([]);
});
