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
// the pages themselves; `first-run` captures the brand-new-user Today separately, as evidence of the welcome card.
// INTENDED lists the owner-authorized differences (QA-01); compare reports them apart and fails on anything else.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

export const FIXED_TIME = "2026-09-30T10:00:00.000Z";
/** The device-only first-run flag (apps/web/lib/onboarding.ts). */
export const ONBOARDING_KEY = "zigoals:onboarding:v1";
/**
 * ZIGi's device settings (apps/web/lib/ai/settings.ts, ADR-012). Every page capture runs with the launcher hidden through
 * this valid record, so pages compare without the floating button; the `zigi-launcher` capture removes it and shows the
 * button once. In Showcase the app reads its storage from the tab's namespaced sessionStorage, so the record is written
 * there as well, under the prefix the Showcase records carry (found from the Habits record).
 */
export const AI_SETTINGS_KEY = "zigoals:ai:v1";
export const AI_LAUNCHER_HIDDEN = { version: 1, enabled: false, mode: null, provider: null, model: null, localServer: null, baseUrl: null, subscriptionApp: null, rememberKey: false, pageShare: { today: true, goals: true, habits: true, health: false, wealth: true, help: true }, includeHealth: false, customInstructions: "", contextBudgetTokens: 6000, maxOutputTokens: 1024, launcherHidden: true, voice: { transcription: "off", transcriptionModel: null, language: null, readAloud: false } };
/**
 * ZIGi's look (apps/web/lib/ai/store/records.ts, Session V Part 12): a hidden ZIGi leaves a small "Show ZIGi" tab at the
 * screen's edge unless it is switched off, so every capture also carries this valid record with the edge tab off, in
 * localStorage and in the Showcase tab's namespace. A build without Part 12 ignores it.
 */
export const ZIGI_KEY = "zigoals:zigi:v1";
export const ZIGI_NO_EDGE_TAB = { version: 1, edgeTab: false };
const SHOWCASE_PROBE_KEY = "zigoals:habits:v1";
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
  // Staking (#57) replaced "Stake / Positions"; the old address /app/goals/positions still redirects to it (307), which
  // tests/page-marks.spec.ts covers. Portfolio (#57) is new.
  { name: "staking", path: "/app/staking" },
  { name: "portfolio", path: "/app/portfolio" },
  { name: "ecosystem", path: "/app/ecosystem" },
  { name: "activity", path: "/app/activity" },
  { name: "settings", path: "/app/settings" },
  { name: "help", path: "/app/help" },
  { name: "dialog-quick-add", path: "/app", showcaseOnly: true, dialog: "quick-add", sizes: ["1024x768", "820x1180-touch"] },
  { name: "dialog-add-asset", path: "/app/wealth?add=asset", showcaseOnly: true, dialog: "sheet", sizes: ["1024x768", "820x1180-touch"] },
  // ZIGi (ADR-012): the one capture with the launcher shown; every other capture hides it through its device key.
  { name: "zigi-launcher", path: "/app", showcaseOnly: true, launcher: true, sizes: ["1280x800"] },
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

/**
 * Owner-authorized differences at desktop and tablet sizes. QA-01 (owner request on PR #52): Health amount fields are
 * text fields with a decimal keypad instead of <input type="number">, so their accessibility role changes from
 * spinbutton to textbox, with the same name and value. A capture counts as intended only when its pixels are identical
 * and every changed snapshot line is such a change on that page; anything else stays a failure.
 */
export const INTENDED = [
  { id: "QA-01", page: "health", note: "Health amount fields are text fields with a decimal keypad (spinbutton -> textbox, same name and value; pixels identical)",
    matches: (before, after) => /^\s*- spinbutton\b/.test(before) && after === before.replace("- spinbutton", "- textbox") },
];
/** The id of the owner-authorized change that explains every difference between two snapshots of a page, or null. */
export function intendedDifference(page, before, after) {
  const a = before.split("\n"), b = after.split("\n");
  if (a.length !== b.length) return null;
  for (const rule of INTENDED.filter(rule => rule.page === page)) {
    const changed = a.flatMap((line, i) => line === b[i] ? [] : [[line, b[i]]]);
    if (changed.length && changed.every(([x, y]) => rule.matches(x, y))) return rule.id;
  }
  return null;
}

function playwright() { return createRequire(new URL("../apps/web/package.json", import.meta.url))("@playwright/test"); }

async function settle(page) {
  // The pointer rests where the last click happened (Load Showcase Demo); whatever a later page puts under it would
  // show its hover state or the glass light, depending on timing. Park it in the corner before every capture.
  await page.mouse.move(0, 0);
  await page.locator("main h1").first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('.workspace[aria-busy="true"]'), null, { timeout: 30000 });
  // Scroll through once so lazy images and in-view effects have run, then return to the top. page.evaluate has no
  // timeout of its own and one run hung here for 30 minutes, so the wait is bounded: anything still unfinished after
  // 15 s shows up as a difference in `compare`, never as a silent pass.
  await page.evaluate(async () => {
    let stopped = false;
    const settled = (async () => {
      for (let y = 0; !stopped && y < document.documentElement.scrollHeight; y += Math.max(innerHeight, 1)) { scrollTo(0, y); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }
      scrollTo(0, 0);
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); })));
    })();
    await Promise.race([settled, new Promise(r => setTimeout(r, 15000))]);
    stopped = true;
    scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}

/** Writes (or removes) the hidden-launcher record in the Showcase tab's namespaced sessionStorage; a no-op outside Showcase. */
async function setShowcaseLauncher(page, hidden) {
  await page.evaluate(([key, probe, value, hide, zigiKey, zigiValue]) => {
    const physical = Object.keys(sessionStorage).find(k => k.endsWith(probe));
    if (!physical) return;
    const prefix = physical.slice(0, -probe.length), scoped = prefix + key;
    if (hide) sessionStorage.setItem(scoped, value); else sessionStorage.removeItem(scoped);
    sessionStorage.setItem(prefix + zigiKey, zigiValue);
  }, [AI_SETTINGS_KEY, SHOWCASE_PROBE_KEY, JSON.stringify(AI_LAUNCHER_HIDDEN), hidden, ZIGI_KEY, JSON.stringify(ZIGI_NO_EDGE_TAB)]);
}
async function openContext(browser, origin, size, { seedOnboarding }) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1, reducedMotion: "reduce", hasTouch: !!size.touch, isMobile: !!size.touch, colorScheme: "dark" });
  await context.route("**/api/**", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"LOCAL_FIXTURE_ONLY"}' }));
  if (seedOnboarding) await context.addInitScript(key => { try { localStorage.setItem(key, JSON.stringify({ version: 1, seen: true })); } catch { /* storage blocked */ } }, ONBOARDING_KEY);
  await context.addInitScript(([key, value]) => { try { if (localStorage.getItem(key) === null) localStorage.setItem(key, value); } catch { /* storage blocked */ } }, [AI_SETTINGS_KEY, JSON.stringify(AI_LAUNCHER_HIDDEN)]);
  await context.addInitScript(([key, value]) => { try { if (localStorage.getItem(key) === null) localStorage.setItem(key, value); } catch { /* storage blocked */ } }, [ZIGI_KEY, JSON.stringify(ZIGI_NO_EDGE_TAB)]);
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  return { context, page };
}

async function shoot(page, out, name, manifest, path) {
  // A focus lift or glide still running under load would otherwise be caught mid-way (seen once on the Add asset
  // dialog's close button): wait until nothing is running, for at most 5 s, then capture.
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== "running"), null, { timeout: 5000 }).catch(() => {});
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
        await setShowcaseLauncher(page, true);
      }
      for (const item of wanted) {
        let path = item.page.path;
        if (!path) {
          await page.goto(`${origin}/app/goals`); await settle(page);
          path = await page.evaluate(() => document.querySelector('main a[href^="/app/goals/tracked/"]')?.getAttribute("href")?.split("#")[0] ?? null);
          if (!path) { errors.push(`${item.name}: no Goal detail link`); continue; }
        }
        if (item.page.launcher) { await page.evaluate(key => localStorage.removeItem(key), AI_SETTINGS_KEY); await setShowcaseLauncher(page, false); }
        await page.goto(`${origin}${path}`);
        await settle(page);
        if (item.page.launcher) { await page.getByTestId("ai-launcher").waitFor({ state: "visible", timeout: 15000 }); await page.waitForTimeout(400); }
        if (item.page.dialog === "quick-add") await page.locator(".today-hero").getByRole("button", { name: "+ Quick add", exact: true }).click();
        if (item.page.dialog) { await page.locator("dialog[open]").first().waitFor({ state: "visible" }); await page.waitForTimeout(400); }
        await shoot(page, out, item.name, manifest, path);
        if (item.page.launcher) await setShowcaseLauncher(page, true);
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
    for (const { name, page: target } of matrix()) {
      const a = before.captures[name], b = after.captures[name];
      if (!a || !b) { results.push({ name, status: "missing", detail: !a ? "not in baseline" : "not in candidate" }); continue; }
      const entry = { name, status: "same" };
      let authorized = null;
      if (a.aria !== b.aria) {
        const [x, y] = await Promise.all([readFile(join(baseline, `${name}.aria.yml`), "utf8"), readFile(join(candidate, `${name}.aria.yml`), "utf8")]);
        entry.status = "different"; entry.aria = snapshotDiff(x, y); authorized = intendedDifference(target.name, x, y);
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
      // Identical pixels and only an owner-authorized snapshot change: reported as intended, not as a failure.
      if (authorized && entry.pixels === undefined) { entry.status = "intended"; entry.intended = authorized; }
      results.push(entry);
    }
  } finally { await browser?.close(); }
  const different = results.filter(r => r.status !== "same" && r.status !== "intended"), intended = results.filter(r => r.status === "intended");
  return { compared: results.length, same: results.length - different.length - intended.length, intended, different, pageErrors: { baseline: before.pageErrors ?? [], candidate: after.pageErrors ?? [] } };
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
    const intended = INTENDED.filter(rule => report.intended.some(entry => entry.intended === rule.id)).map(rule => `${report.intended.filter(entry => entry.intended === rule.id).length} differ only by the owner-authorized ${rule.id} change: ${rule.note}`);
    console.log(report.different.length ? `FREEZE CHECK FAILED: ${report.different.length} of ${report.compared} captures differ.` : `FREEZE CHECK PASSED: ${report.same} of ${report.compared} captures identical (pixels and accessibility snapshot)${intended.length ? `; ${intended.join("; ")}` : ""}.`);
    process.exitCode = report.different.length ? 1 : 0;
  } else {
    console.error("Usage: desktop-freeze-check.mjs capture --base-url <loopback origin> --out <dir> [--only <regex>]\n       desktop-freeze-check.mjs compare --baseline <dir> --candidate <dir> [--diff <dir>]\n       desktop-freeze-check.mjs first-run --base-url <loopback origin> --out <dir>");
    process.exitCode = 2;
  }
}
