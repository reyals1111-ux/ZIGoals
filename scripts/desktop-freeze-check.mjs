// Desktop/tablet freeze guard for the phone experience (Session E).
// The phone layout applies below 768 CSS px and to coarse-pointer screens at most 500 px tall. This script proves that
// every other size renders exactly as before: it captures every main page, in Showcase and empty, at desktop and tablet
// sizes from a running server, then compares two captures pixel for pixel and by accessibility snapshot.
//
//   node scripts/desktop-freeze-check.mjs capture --base-url http://127.0.0.1:3102 --out <dir> [--only <regex>]
//   node scripts/desktop-freeze-check.mjs compare --baseline <dir> --candidate <dir> [--diff <dir>]
//   node scripts/desktop-freeze-check.mjs first-run --base-url <origin> --out <dir>
//
// Capture the baseline from a production build of main and the candidate from a production build of the branch, on the
// same machine and browser (each on its own loopback port). APIs are answered by a local 503 fixture and the clock is
// fixed, so two captures of the same build are identical. Empty-state captures mark onboarding as seen, so they compare
// the pages themselves; `first-run` captures the brand-new-user Today separately, as evidence of the one intended change.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

export const FIXED_TIME = "2026-09-30T10:00:00.000Z";
/** The device-only first-run flag (apps/web/lib/onboarding.ts). */
export const ONBOARDING_KEY = "zigoals:onboarding:v1";
export const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "820x1180", width: 820, height: 1180 },
  // Tablets with touch: a coarse pointer, but taller than 500 px, so never the phone layout.
  { name: "820x1180-touch", width: 820, height: 1180, touch: true },
  { name: "1180x820-touch", width: 1180, height: 820, touch: true },
];
export const STATES = ["showcase", "empty"];
/** `dialog` captures open a sheet-like dialog first, to prove phone sheet styles never reach these sizes. */
export const PAGES = [
  { name: "today", path: "/app" },
  { name: "goals", path: "/app/goals" },
  { name: "goal-detail", path: null, showcaseOnly: true },
  { name: "habits", path: "/app/habits" },
  { name: "health", path: "/app/health" },
  { name: "wealth", path: "/app/wealth" },
  { name: "markets", path: "/app/markets" },
  { name: "positions", path: "/app/goals/positions" },
  { name: "ecosystem", path: "/app/ecosystem" },
  { name: "activity", path: "/app/activity" },
  { name: "settings", path: "/app/settings" },
  { name: "dialog-quick-add", path: "/app", showcaseOnly: true, dialog: "quick-add", sizes: ["1024x768", "820x1180-touch"] },
  { name: "dialog-add-asset", path: "/app/wealth?add=asset", showcaseOnly: true, dialog: "sheet", sizes: ["1024x768", "820x1180-touch"] },
];

export function captureName(size, state, page) { return `${size}__${state}__${page}`; }
/** Every capture the check expects, in a stable order. */
export function matrix(sizes = SIZES, states = STATES, pages = PAGES) {
  return sizes.flatMap(size => states.flatMap(state => pages
    .filter(page => (state === "showcase" || !page.showcaseOnly) && (!page.sizes || page.sizes.includes(size.name)))
    .map(page => ({ size, state, page, name: captureName(size.name, state, page.name) }))));
}
export function validateBase(base) {
  let url;
  try { url = new URL(base); } catch { throw Error("Use a loopback HTTP origin such as http://127.0.0.1:3102."); }
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    throw Error("Use a loopback HTTP origin such as http://127.0.0.1:3102.");
  return url.origin;
}
const sha256 = value => createHash("sha256").update(value).digest("hex");

/** Lines that differ between two accessibility snapshots (the first few, with line numbers). */
export function snapshotDiff(a, b, limit = 8) {
  if (a === b) return [];
  const left = a.split("\n"), right = b.split("\n"), out = [];
  for (let i = 0; i < Math.max(left.length, right.length) && out.length < limit; i++)
    if (left[i] !== right[i]) out.push(`line ${i + 1}: - ${left[i] ?? "(none)"} | + ${right[i] ?? "(none)"}`);
  return out;
}

function playwright() { return createRequire(new URL("../apps/web/package.json", import.meta.url))("@playwright/test"); }

async function settle(page) {
  await page.locator("main h1").first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('.workspace[aria-busy="true"]'), null, { timeout: 30000 });
  // Scroll through once so lazy images and in-view effects have run, then return to the top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }
    scrollTo(0, 0);
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); })));
  });
  await page.waitForTimeout(600);
}

async function openContext(browser, origin, size, { seedOnboarding }) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1, reducedMotion: "reduce", hasTouch: !!size.touch, isMobile: !!size.touch, colorScheme: "dark" });
  await context.route("**/api/**", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"LOCAL_FIXTURE_ONLY"}' }));
  if (seedOnboarding) await context.addInitScript(key => { try { localStorage.setItem(key, JSON.stringify({ version: 1, seen: true })); } catch { /* storage blocked */ } }, ONBOARDING_KEY);
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  return { context, page };
}

async function shoot(page, out, name, manifest, path) {
  const png = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
  const aria = await page.locator("body").ariaSnapshot();
  await writeFile(join(out, `${name}.png`), png);
  await writeFile(join(out, `${name}.aria.yml`), aria);
  manifest.captures[name] = { path, png: sha256(png), aria: sha256(aria) };
  console.log(`captured ${name}`);
}

export async function capture({ base, out, only }) {
  const origin = validateBase(base);
  await mkdir(out, { recursive: true });
  const { chromium } = playwright();
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const manifest = { origin, fixedTime: FIXED_TIME, browser: browser.version(), captures: {} };
  const errors = [];
  try {
    for (const size of SIZES) for (const state of STATES) {
      const wanted = matrix([size], [state]).filter(item => !only || only.test(item.name));
      if (!wanted.length) continue;
      // Empty captures compare the pages themselves, never the first-run card (see `first-run`).
      const { context, page } = await openContext(browser, origin, size, { seedOnboarding: true });
      page.on("pageerror", error => errors.push(`${size.name} ${state}: ${error.message}`));
      if (state === "showcase") {
        await page.goto(`${origin}/app/settings`);
        await page.getByRole("button", { name: "Load Showcase Demo", exact: true }).click();
        await page.waitForURL("**/app");
      }
      for (const item of wanted) {
        let path = item.page.path;
        if (!path) {
          await page.goto(`${origin}/app/goals`); await settle(page);
          path = await page.evaluate(() => document.querySelector('main a[href^="/app/goals/tracked/"]')?.getAttribute("href")?.split("#")[0] ?? null);
          if (!path) { errors.push(`${item.name}: no Goal detail link`); continue; }
        }
        await page.goto(`${origin}${path}`);
        await settle(page);
        if (item.page.dialog === "quick-add") await page.locator(".today-hero").getByRole("button", { name: "+ Quick add", exact: true }).click();
        if (item.page.dialog) { await page.locator("dialog[open]").first().waitFor({ state: "visible" }); await page.waitForTimeout(400); }
        await shoot(page, out, item.name, manifest, path);
      }
      await context.close();
    }
  } finally { await browser.close(); }
  manifest.pageErrors = errors;
  await writeFile(join(out, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
  return manifest;
}

/** Evidence only: Today for a brand-new user (no onboarding flag) at 1440x900 and 820x1180. Never part of `compare`. */
export async function firstRun({ base, out }) {
  const origin = validateBase(base);
  await mkdir(out, { recursive: true });
  const { chromium } = playwright();
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const manifest = { origin, fixedTime: FIXED_TIME, browser: browser.version(), captures: {} };
  try {
    for (const size of SIZES.filter(s => ["1440x900", "820x1180"].includes(s.name))) {
      const { context, page } = await openContext(browser, origin, size, { seedOnboarding: false });
      await page.goto(`${origin}/app`); await settle(page);
      await shoot(page, out, `${size.name}__first-run__today`, manifest, "/app");
      await context.close();
    }
  } finally { await browser.close(); }
  await writeFile(join(out, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
  return manifest;
}

/** Decodes both PNGs in the browser and counts differing pixels; writes a diff image with changes in magenta. */
async function pixelDiff(page, a, b) {
  return page.evaluate(async ({ a, b }) => {
    const load = async src => { const img = new Image(); img.src = `data:image/png;base64,${src}`; await img.decode(); const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0); return { w: img.width, h: img.height, data: x.getImageData(0, 0, img.width, img.height).data, canvas: c }; };
    const A = await load(a), B = await load(b);
    if (A.w !== B.w || A.h !== B.h) return { pixels: null, size: [`${A.w}x${A.h}`, `${B.w}x${B.h}`] };
    const out = B.canvas.getContext("2d").getImageData(0, 0, B.w, B.h); let pixels = 0, box = null;
    for (let i = 0; i < A.data.length; i += 4) {
      if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2] || A.data[i + 3] !== B.data[i + 3]) {
        pixels++; const p = i / 4, x = p % A.w, y = Math.floor(p / A.w);
        box = box ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] : [x, y, x, y];
        out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 255; out.data[i + 3] = 255;
      } else { out.data[i + 3] = 90; }
    }
    const c = document.createElement("canvas"); c.width = B.w; c.height = B.h; c.getContext("2d").putImageData(out, 0, 0);
    return { pixels, box, image: pixels ? c.toDataURL("image/png").split(",")[1] : null };
  }, { a: a.toString("base64"), b: b.toString("base64") });
}

export async function compare({ baseline, candidate, diff }) {
  const read = async dir => JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  const [before, after] = await Promise.all([read(baseline), read(candidate)]);
  const results = [];
  let page = null, browser = null;
  try {
    for (const { name } of matrix()) {
      const a = before.captures[name], b = after.captures[name];
      if (!a || !b) { results.push({ name, status: "missing", detail: !a ? "not in baseline" : "not in candidate" }); continue; }
      const entry = { name, status: "same" };
      if (a.aria !== b.aria) {
        const [x, y] = await Promise.all([readFile(join(baseline, `${name}.aria.yml`), "utf8"), readFile(join(candidate, `${name}.aria.yml`), "utf8")]);
        entry.status = "different"; entry.aria = snapshotDiff(x, y);
      }
      if (a.png !== b.png) {
        if (!page) { const { chromium } = playwright(); browser = await chromium.launch({ channel: "chrome", headless: true }); page = await browser.newPage(); }
        const [x, y] = await Promise.all([readFile(join(baseline, `${name}.png`)), readFile(join(candidate, `${name}.png`))]);
        const result = await pixelDiff(page, x, y);
        if (result.pixels !== 0) {
          entry.status = "different"; entry.pixels = result.pixels; entry.box = result.box; entry.size = result.size;
          if (diff && result.image) { await mkdir(diff, { recursive: true }); await writeFile(join(diff, `${name}.diff.png`), Buffer.from(result.image, "base64")); }
        } else entry.encodingOnly = true;
      }
      results.push(entry);
    }
  } finally { await browser?.close(); }
  const different = results.filter(r => r.status !== "same");
  return { compared: results.length, same: results.length - different.length, different, pageErrors: { baseline: before.pageErrors ?? [], candidate: after.pageErrors ?? [] } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  const { values } = parseArgs({ args: rest, options: { "base-url": { type: "string" }, out: { type: "string" }, only: { type: "string" }, baseline: { type: "string" }, candidate: { type: "string" }, diff: { type: "string" } } });
  if (command === "capture" && values["base-url"] && values.out) {
    const manifest = await capture({ base: values["base-url"], out: values.out, only: values.only ? new RegExp(values.only) : null });
    console.log(`${Object.keys(manifest.captures).length} captures, ${manifest.pageErrors.length} page errors`);
  } else if (command === "first-run" && values["base-url"] && values.out) {
    const manifest = await firstRun({ base: values["base-url"], out: values.out });
    console.log(`${Object.keys(manifest.captures).length} first-run captures (evidence only)`);
  } else if (command === "compare" && values.baseline && values.candidate) {
    const report = await compare({ baseline: values.baseline, candidate: values.candidate, diff: values.diff });
    console.log(JSON.stringify(report, null, 1));
    console.log(report.different.length ? `FREEZE CHECK FAILED: ${report.different.length} of ${report.compared} captures differ.` : `FREEZE CHECK PASSED: ${report.compared} of ${report.compared} captures identical (pixels and accessibility snapshot).`);
    process.exitCode = report.different.length ? 1 : 0;
  } else {
    console.error("Usage: desktop-freeze-check.mjs capture --base-url <loopback origin> --out <dir> [--only <regex>]\n       desktop-freeze-check.mjs compare --baseline <dir> --candidate <dir> [--diff <dir>]\n       desktop-freeze-check.mjs first-run --base-url <loopback origin> --out <dir>");
    process.exitCode = 2;
  }
}
