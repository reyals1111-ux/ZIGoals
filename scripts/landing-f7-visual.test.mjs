import { existsSync, readFileSync, statSync } from "node:fs";
import { expect, test } from "vitest";

// Session AK F7 (owner follow-up 1): the landing's visual refresh. Every Showcase screen carries a visible "Example data"
// label; "Switch to ZIGoals" names only importers the app ships; the hero's motion plays once and never under reduced
// motion; the phone screens are small WebP files; and the first view stays inside its 260,000-byte budget
// (landing-v5-perf.spec measures the same files in the browser; this catches growth before a browser run).
const landing = new URL("../landing/", import.meta.url);
const app = new URL("../apps/web/", import.meta.url);
const read = (file, base = landing) => readFileSync(new URL(file, base), "utf8");
const size = file => statSync(new URL(file, landing)).size;
const html = read("index.html");
const css = read("styles/final-v6.css");
const text = fragment => fragment.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "’").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const section = id => html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))[0];

test("every Showcase screen on the page carries a visible Example data label", () => {
  const figures = [...html.matchAll(/<figure\b[\s\S]*?<\/figure>/g)].map(match => match[0]);
  const screens = figures.filter(figure => /assets\/product\/(final|phone)\//.test(figure) && !/markets-desktop|ecosystem-desktop/.test(figure));
  // Today, Goal detail, Habits, Health, Wealth, Positions and the two phones (Markets and Ecosystem hold no records).
  expect(screens).toHaveLength(7);
  for (const figure of screens) {
    const images = (figure.match(/<img [^>]*src="assets\/product\//g) ?? []).length;
    expect((figure.match(/<span class="example-tag">Example data<\/span>/g) ?? []).length, figure.slice(0, 120)).toBe(images);
  }
  // Visible: not hidden from anyone, 14 px or more, dark on light.
  const rule = css.match(/\.example-tag\{([^}]*)\}/)[1];
  expect(rule).toContain("font-size:14px");
  expect(rule).toContain("background:#eaf6ff");
  expect(rule).toContain("color:#06101f");
  expect(html).not.toMatch(/class="example-tag"[^>]*aria-hidden/);
});

test("Switch to ZIGoals names only importers the app ships, and says which it does not read", () => {
  const switchText = text(section("switch"));
  const formats = read("lib/import/switch/formats.ts", app);
  const reads = label => new RegExp(`label: '${label}', state: '(reads|meals)'`).test(formats);
  for (const label of ["Apple Health", "Samsung Health", "Oura", "Loop Habit Tracker", "MyFitnessPal", "Cronometer"]) {
    expect(reads(label), label).toBe(true);
    expect(switchText).toContain(label);
  }
  // Session AK's own readers (A15) and the workout and bank-file readers.
  const readers = { Daylio: "lib/import/switch/daylio.ts", Habitica: "lib/import/switch/habitica.ts", YNAB: "lib/import/switch/ynab.ts", Strava: "lib/import/switch/strava.ts", Strong: "lib/import/switch/strong.ts", Hevy: "lib/import/switch/hevy.ts", "FIT files": "lib/import/fit/decode.ts", "CAMT.053": "lib/bankfiles/camt.ts", OFX: "lib/bankfiles/ofx.ts", MT940: "lib/bankfiles/mt940.ts" };
  for (const [name, file] of Object.entries(readers)) {
    expect(existsSync(new URL(file, app)), file).toBe(true);
    expect(switchText).toContain(name);
  }
  // Fitbit is off for good; Garmin and Streaks are named only as not read.
  expect(switchText).not.toContain("Fitbit");
  expect(formats).toMatch(/label: 'Garmin', state: GARMIN_READS \? 'reads' : 'off'/);
  expect(read("lib/import/switch/formats.ts", app)).toContain("export const GARMIN_READS = false;");
  expect(switchText).toContain("Garmin and Streaks do not publish the layout of their exports, so ZIGoals does not read them yet.");
  expect(switchText).toContain("It is read on your device and sent nowhere");
  expect(switchText).toContain("ZIGoals is not affiliated with any of these apps.");
  expect(switchText).not.toMatch(/\b(integrat\w*|partner\w*|seamless\w*|guaranteed?|instantly)\b/i);
  // The privacy page names every one of them as read on the device.
  const privacy = text(read("privacy.html"));
  for (const name of ["Daylio", "Habitica", "YNAB", "Strong", "Hevy", "Apple Health", "Samsung Health", "Oura", "Loop Habit Tracker", "Strava", "MyFitnessPal", "Cronometer"]) expect(privacy).toMatch(new RegExp(`Files you import[^.]*${name}`));
});

test("the hero's motion plays once and never under reduced motion, ?motion=off or without script", () => {
  const hero = html.match(/<section class="hero"[\s\S]*?<\/section>/)[0];
  const glides = [...hero.matchAll(/<animateMotion\b[^>]*>/g)].map(match => match[0]);
  expect(glides).toHaveLength(4);
  for (const glide of glides) {
    expect(glide).toContain('begin="indefinite"'); // started only by scripts/main.js
    expect(glide).toContain('fill="freeze"');
    expect(glide).not.toMatch(/repeat(Count|Dur)/);
    // Each glide ends where the planet sits without it: the path closes on 0 0.
    expect(glide).toMatch(/path="M[-\d. ]+A[\d. ]+ 0 0 1 0 0"/);
  }
  const main = read("scripts/main.js");
  expect(main).toMatch(/if \(!reduced\.matches && !manualStatic\) document\.querySelectorAll\('\.hero-orbits animateMotion'\)/);
  // Every CSS animation in the refresh is inside the no-preference block, finite, and the global kill switches apply.
  const motionBlock = css.match(/@media \(prefers-reduced-motion:no-preference\)\{([\s\S]*?)\n\}/)[1];
  const outside = css.replace(motionBlock, "");
  expect(outside).not.toMatch(/animation:/);
  for (const rule of motionBlock.match(/animation:[^;}]+/g)) {
    expect(rule).not.toMatch(/infinite/);
    expect(motionBlock).toContain("html:not(.motion-off)");
  }
  expect(read("styles/motion.css")).toMatch(/@media\(prefers-reduced-motion:reduce\)\{html\{[^}]*\}\*,\*:before,\*:after\{animation:none!important/);
});

test("new pictures are WebP from this site, and the phone screens stay small", () => {
  const webp = file => {
    const bytes = readFileSync(new URL(file, landing));
    expect(bytes.toString("ascii", 8, 12), file).toBe("WEBP");
    return bytes;
  };
  for (const file of ["assets/product/phone/today.webp", "assets/product/phone/habits.webp"]) {
    webp(file);
    expect(size(file), file).toBeLessThanOrEqual(36_000);
  }
  webp("assets/video/zigoals-origami-poster-phone.webp");
  expect(size("assets/video/zigoals-origami-poster-phone.webp")).toBeLessThan(size("assets/video/zigoals-origami-poster.webp") / 2);
  // No other host: every picture and stylesheet is a path inside the landing.
  for (const [, url] of html.matchAll(/\s(?:src|srcset|href)="([^"]+)"/g)) {
    if (/^(https:|mailto:|#)/.test(url)) continue;
    expect(url).not.toMatch(/^\/\/|^http:/);
  }
});

test("the first view stays inside its 260,000-byte budget", () => {
  // What landing-v5-perf.spec counts before a scroll: the page, its stylesheets and scripts (fold-stage.mjs imports
  // fold-state.mjs), the hero mark and the icon.
  const linked = [...html.matchAll(/<link rel="stylesheet" href="([^"?]+)/g), ...html.matchAll(/<script[^>]* src="([^"?]+)/g)].map(match => match[1]);
  const files = ["index.html", ...linked, "scripts/fold-state.mjs", "assets/brand/zigoals-mark-v3.webp", "assets/brand/favicon.svg"];
  const bytes = files.reduce((total, file) => total + size(file), 0);
  expect(bytes).toBeLessThanOrEqual(260_000);
});
