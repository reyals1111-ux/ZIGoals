import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test, type Browser, type Page } from "@playwright/test";
import { landingRoot } from "./landing-server";

// Landing V5, Part 1.5 (Session N): refreshes the 19 product captures in landing/assets/product/final/ from the
// Showcase of a production build of main (NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED). Opt-in evidence
// capture, never a gate, like run9-2-visual: it writes into landing/ and needs a running server.
//
//   LANDING_CAPTURE=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3102 \
//     pnpm --filter @zigoals/web exec playwright test tests/landing-v5-captures.spec.ts --project=desktop --workers=1
//
// Every /api/** call is answered by a local 503, the clock is fixed and motion is reduced, so the captions stay true
// ("Quotes unavailable during capture", "no wallet observation") and two runs of one build match. Each capture keeps
// V4's file name and pixel width: desktop at a 1440 × 900 viewport, phones at 430 × 932, at whatever density makes the
// captured region exactly that wide. The height follows the region, and index.html carries the new sizes.
// WebP: FFmpeg's libwebp, quality 82. The PNGs and a manifest land in test-results/landing-captures/.
// Font: the app's stack starts with Inter, which it does not ship. LANDING_CAPTURE_FONT can name an Inter font file
// (Session N used InterVariable.ttf from https://github.com/rsms/inter, docs/font-files/, SIL OFL 1.1); it is given
// to the capture pages only, as a web font on the app's own origin, so the captures show the app's first-choice font rather than the
// capture machine's fallback. Nothing is added to the app or the landing.

const FIXED_TIME = "2026-10-02T10:00:00.000Z";
const ONBOARDING_KEY = "zigoals:onboarding:v1";
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 430, height: 932 };
type Capture = {
  name: string;
  width: number;
  viewport: { width: number; height: number };
  path: string | "goal-detail";
  /** The captured region is the union of these elements' boxes. */
  parts: string[];
  /** Optional cap on the region's height, in CSS pixels, measured from its top. */
  maxHeight?: number;
  /** Optional margin of the page's own background around a region that starts with a heading, in CSS pixels. */
  pad?: number;
  before?: (page: Page) => Promise<void>;
};
const CAPTURES: Capture[] = [
  { name: "today-desktop", width: 1150, viewport: DESKTOP, path: "/app", parts: [".dashboard-layout-grid > .placed-module:nth-child(1) .today-pulse-stack"] },
  { name: "today-mobile", width: 398, viewport: PHONE, path: "/app", parts: [".dashboard-layout-grid > .placed-module:nth-child(1) .today-pulse-stack"] },
  { name: "goal-detail-desktop", width: 1548, viewport: DESKTOP, path: "goal-detail", parts: [".goal-detail-overview", ".asset-mix"] },
  { name: "goal-detail-mobile", width: 398, viewport: PHONE, path: "goal-detail", parts: [".goal-detail-overview"] },
  { name: "goal-creator-desktop", width: 710, viewport: DESKTOP, path: "/app/goals/new", parts: [".wizard-content"], maxHeight: 600 },
  { name: "goals-overview-desktop", width: 1548, viewport: DESKTOP, path: "/app/goals", parts: [".goals-heading", ".goals-toolbar", ".goal-grid > article:nth-child(1)", ".goal-grid > article:nth-child(2)", ".goal-grid > article:nth-child(3)"], pad: 16 },
  { name: "goals-mobile", width: 398, viewport: PHONE, path: "/app/goals", parts: [".goal-grid > article:nth-child(1)"] },
  { name: "habits-desktop", width: 1548, viewport: DESKTOP, path: "/app/habits", parts: [".habit-overview", ".habit-consistency"] },
  { name: "habits-mobile", width: 398, viewport: PHONE, path: "/app/habits", parts: [".habit-consistency-month"] },
  { name: "health-desktop", width: 1548, viewport: DESKTOP, path: "/app/health", parts: [".health-page > .page-heading", ".health-summary"] },
  { name: "health-mobile", width: 398, viewport: PHONE, path: "/app/health", parts: [".health-summary"] },
  { name: "wealth-desktop", width: 1548, viewport: DESKTOP, path: "/app/wealth", parts: [".wealth-hero"] },
  { name: "wealth-mobile", width: 398, viewport: PHONE, path: "/app/wealth", parts: [".wealth-hero"] },
  { name: "positions-desktop", width: 1548, viewport: DESKTOP, path: "/app/staking", parts: ["#landing-tracked .positions-section-heading", "#landing-tracked .position-card:nth-child(1)", "#landing-tracked .position-card:nth-child(2)", "#landing-tracked .position-card:nth-child(3)"], pad: 16 },
  { name: "positions-card", width: 502, viewport: DESKTOP, path: "/app/staking", parts: ["#landing-tracked .position-card:nth-child(1)"] },
  { name: "markets-desktop", width: 1548, viewport: DESKTOP, path: "/app/markets", parts: [".market-toolbar", ".picker-tabs", ".market-explorer > .notice", ".markets-grid > article:nth-child(1)", ".markets-grid > article:nth-child(2)", ".markets-grid > article:nth-child(3)"] },
  { name: "markets-card", width: 374, viewport: DESKTOP, path: "/app/markets", parts: [".markets-grid > article:nth-child(1)"] },
  { name: "ecosystem-desktop", width: 1548, viewport: DESKTOP, path: "/app/ecosystem", parts: [".ecosystem-context", ".ecosystem-controls", ".ecosystem-projects > article:nth-child(1)"], pad: 16 },
  { name: "ecosystem-mobile", width: 398, viewport: PHONE, path: "/app/ecosystem", parts: [".ecosystem-projects > article:nth-child(1)", ".ecosystem-projects > article:nth-child(2)"] },
];

test.skip(process.env.LANDING_CAPTURE !== "1", "Opt-in evidence capture: run with LANDING_CAPTURE=1 against a production build of main");
test.setTimeout(20 * 60_000);

const FONT = process.env.LANDING_CAPTURE_FONT ? readFileSync(process.env.LANDING_CAPTURE_FONT) : null;
// Served on the app's own origin by a route below, so the app's Content-Security-Policy (font-src 'self') allows it.
const FONT_PATH = "/__landing-capture/inter.ttf";
const FONT_FACE = FONT ? `@font-face{font-family:Inter;src:url(${FONT_PATH}) format("truetype");font-weight:100 900;font-style:normal;font-display:block}` : "";

async function open(browser: Browser, origin: string, viewport: { width: number; height: number }, deviceScaleFactor: number) {
  const context = await browser.newContext({ viewport, deviceScaleFactor, reducedMotion: "reduce", colorScheme: "dark", locale: "en-US" });
  if (FONT) await context.route(`**${FONT_PATH}`, route => route.fulfill({ status: 200, contentType: "font/ttf", body: FONT }));
  await context.route("**/api/**", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"LOCAL_FIXTURE_ONLY"}' }));
  await context.addInitScript(key => { try { localStorage.setItem(key, JSON.stringify({ version: 1, seen: true })); } catch { /* storage blocked */ } }, ONBOARDING_KEY);
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  await page.goto(`${origin}/app/settings`);
  await page.getByRole("button", { name: "Load Showcase Demo", exact: true }).click();
  await page.waitForURL("**/app");
  return { context, page };
}

async function visit(page: Page, origin: string, path: Capture["path"]) {
  let target = path;
  if (path === "goal-detail") {
    await page.goto(`${origin}/app/goals`);
    await page.locator("main h1").first().waitFor();
    target = (await page.evaluate(() => document.querySelector('main a[href^="/app/goals/tracked/"]')?.getAttribute("href")?.split("#")[0])) ?? "";
    if (!target) throw new Error("No Goal detail link in the Showcase");
  }
  await page.goto(`${origin}${target}`);
  await page.locator("main h1").first().waitFor({ state: "visible", timeout: 30_000 });
  // After hydration, so React never sees (or removes) the added style.
  if (FONT_FACE) await page.addStyleTag({ content: FONT_FACE });
  await page.waitForFunction(() => !document.querySelector('.workspace[aria-busy="true"]'), null, { timeout: 30_000 });
  // Name the Staking page's "Tracked crypto" section, which has no class of its own.
  await page.evaluate(() => {
    const section = [...document.querySelectorAll("main section")].find(item => /^Tracked crypto/.test(item.querySelector("h2")?.textContent?.trim() ?? ""));
    if (section) section.id = "landing-tracked";
  });
  // Lazy images and in-view effects: scroll through once, then back to the top; fonts and images settled.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }
    scrollTo(0, 0);
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.complete ? null : new Promise(r => { image.addEventListener("load", r, { once: true }); image.addEventListener("error", r, { once: true }); })));
  });
  if (FONT_FACE && !(await page.evaluate(() => [...document.fonts].some(face => face.family.replace(/"/g, "") === "Inter" && face.status === "loaded"))))
    throw new Error("The capture font did not load");
  // The phone tab bar and other fixed chrome would otherwise sit across the captured region: V4's captures show the
  // component alone, so fixed elements are hidden for the capture.
  await page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>("body *")) if (getComputedStyle(element).position === "fixed") element.style.visibility = "hidden";
  });
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== "running"), null, { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(600);
}

/** The union of the parts' boxes in page coordinates (CSS px), whole pixels. */
async function region(page: Page, parts: string[], maxHeight?: number, pad = 0) {
  return page.evaluate(([parts, maxHeight, pad]) => {
    const boxes = (parts as string[]).map(selector => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const box = element.getBoundingClientRect();
      return { left: box.left + scrollX, top: box.top + scrollY, right: box.right + scrollX, bottom: box.bottom + scrollY };
    });
    const margin = Number(pad);
    const left = Math.floor(Math.min(...boxes.map(b => b.left))) - margin, top = Math.floor(Math.min(...boxes.map(b => b.top))) - margin;
    const right = Math.ceil(Math.max(...boxes.map(b => b.right))) + margin;
    let bottom = Math.ceil(Math.max(...boxes.map(b => b.bottom))) + margin;
    if (maxHeight) bottom = Math.min(bottom, top + Number(maxHeight));
    return { x: left, y: top, width: right - left, height: bottom - top };
  }, [parts, maxHeight ?? 0, pad] as const);
}

test("refresh the landing's product captures from the Showcase", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "One run is enough: each capture sets its own viewport");
  const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100").origin;
  const out = resolve("test-results/landing-captures");
  mkdirSync(out, { recursive: true });
  const font = FONT ? { file: process.env.LANDING_CAPTURE_FONT, sha256: createHash("sha256").update(FONT).digest("hex") } : null;
  const manifest: Record<string, unknown> = { origin, fixedTime: FIXED_TIME, browser: browser.version(), font, captures: {} };
  for (const item of CAPTURES) {
    // Measure at 1×, then capture at the density that makes the region exactly the V4 width.
    const measure = await open(browser, origin, item.viewport, 1);
    await visit(measure.page, origin, item.path);
    const box = await region(measure.page, item.parts, item.maxHeight, item.pad);
    await measure.context.close();
    const scale = item.width / box.width;
    const shot = await open(browser, origin, item.viewport, scale);
    await visit(shot.page, origin, item.path);
    const clip = await region(shot.page, item.parts, item.maxHeight, item.pad);
    if (clip.width !== box.width || clip.height !== box.height) throw new Error(`${item.name}: the region moved between passes`);
    const png = join(out, `${item.name}.png`);
    await shot.page.screenshot({ path: png, clip, fullPage: true, animations: "disabled", caret: "hide" });
    await shot.context.close();
    const webp = resolve(landingRoot, `assets/product/final/${item.name}.webp`);
    const height = Math.round(clip.height * scale);
    execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-y", "-i", png, "-vf", `scale=${item.width}:${height}:flags=lanczos`, "-c:v", "libwebp", "-quality", "82", "-compression_level", "6", "-preset", "picture", webp]);
    (manifest.captures as Record<string, unknown>)[item.name] = { viewport: item.viewport, path: item.path, parts: item.parts, cssRegion: clip, scale: Number(scale.toFixed(4)), size: { width: item.width, height } };
    console.log(`captured ${item.name} ${item.width}x${height} at ${scale.toFixed(3)}x`);
  }
  writeFileSync(join(out, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
});
