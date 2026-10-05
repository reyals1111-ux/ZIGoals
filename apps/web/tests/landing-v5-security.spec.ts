import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { landingRoot, startLandingServer, type LandingServer } from "./landing-server";

// Landing V5 (Session N): the security posture is V4's, unchanged. The response headers and the upload allowlist are
// pinned by hash (Session U Part 6 changes, below); under the real Content-Security-Policy a full scroll raises no
// violation and asks no other origin for anything; every file the page references exists and every file that ships is
// referenced; and the copy makes no earn, yield or partnership claim. The only link that is not https is the invite e-mail.

// SHA-256 of landing/_headers and landing/.assetsignore on main at 57275a6 (Alpha deploy #23 source, Landing V4).
const HEADERS_SHA256 = "f0ce45672bd3f660045212fd1424d674b2fb98418ddfbc6906ea310a48bd31de";
// Session U Part 6 (FIX_PLAN F4): .assetsignore gained its final block (only the reviewed media types under assets/, no
// dotfile anywhere); nothing it published before is dropped. Landing V4/V5 value: e1388b8c…f74807.
const ASSETSIGNORE_SHA256 = "8c09ec286426c5281e713cd1998ade09cbd3b2618759f273fbcddbf3b93a66b9";
const INVITE = "mailto:contact@zigoals.app?subject=Friends%20Alpha%20invite";
const sha256 = (file: string) => createHash("sha256").update(readFileSync(resolve(landingRoot, file))).digest("hex");

test.describe("files", () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name !== "desktop", "File checks run once, in the desktop project"); });

  test("the response headers and the upload allowlist are exactly their reviewed bytes", () => {
    expect(sha256("_headers")).toBe(HEADERS_SHA256);
    expect(sha256(".assetsignore")).toBe(ASSETSIGNORE_SHA256);
  });

  test("every file the page refers to exists, and every file that ships is referred to", async () => {
    const html = readFileSync(resolve(landingRoot, "index.html"), "utf8");
    const referenced = new Set<string>(["index.html", "favicon.ico"]);
    const add = (url: string) => {
      const clean = url.trim().split(/[?#]/)[0]!;
      if (!clean || /^(mailto:|#|data:)/.test(url.trim())) return;
      // The site root (og:url) is the page itself.
      if (/^https:\/\/zigoals\.app\//.test(clean)) { referenced.add(clean.replace("https://zigoals.app/", "") || "index.html"); return; }
      if (/^https?:\/\//.test(clean)) return;
      referenced.add(clean.replace(/^\.?\//, "") || "index.html");
    };
    for (const match of html.matchAll(/\s(?:src|href|poster|data-image|data-image-mobile|data-src|data-mobile-src|data-poster)="([^"]+)"/g)) add(match[1]!);
    for (const match of html.matchAll(/\ssrcset="([^"]+)"/g)) for (const part of match[1]!.split(",")) add(part.trim().split(/\s+/)[0]!);
    for (const match of html.matchAll(/<meta[^>]+content="(https:\/\/zigoals\.app\/[^"]+)"/g)) add(match[1]!);
    // Scripts load modules and frames by path.
    for (const script of readdirSync(resolve(landingRoot, "scripts"))) {
      const source = readFileSync(resolve(landingRoot, "scripts", script), "utf8");
      for (const match of source.matchAll(/from '\.\/([^']+)'/g)) add(`scripts/${match[1]}`);
    }
    const { PHONE, WIDE } = await import(pathToFileURL(resolve(landingRoot, "scripts/fold-state.mjs")).href) as { PHONE: Record<string, number[]>; WIDE: number[] };
    for (const name of Object.keys(PHONE)) {
      for (const i of WIDE) add(`assets/origami-scroll/${name}/${String(i).padStart(2, "0")}.webp`);
      for (const i of PHONE[name]!) add(`assets/origami-scroll/${name}/phone/${String(i).padStart(2, "0")}.webp`);
    }
    const missing = [...referenced].filter(file => { try { return !statSync(resolve(landingRoot, file)).isFile(); } catch { return true; } });
    expect(missing, "referenced but missing").toEqual([]);
    // What ships: every file in landing/ except Wrangler's own control files.
    const control = new Set(["_headers", ".assetsignore", "wrangler.jsonc"]);
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(resolve(dir, entry.name)) : [relative(landingRoot, resolve(dir, entry.name))]);
    const shipped = walk(landingRoot).filter(file => !control.has(file));
    const allowed = (file: string) => file === "index.html" || file === "favicon.ico" || /^styles\/[^/]+\.css$/.test(file) || /^scripts\/[^/]+\.m?js$/.test(file) || file.startsWith("assets/");
    expect(shipped.filter(file => !allowed(file)), "files outside the upload allowlist").toEqual([]);
    // Workers Assets answers a path it would spell differently (an "@", for one) with a 307 to the percent-encoded
    // spelling, an extra round trip per file (seen in wrangler dev and on the live Alpha): every name is already plain.
    expect(shipped.filter(file => file.split("/").some(part => encodeURIComponent(part) !== part)), "file names Workers Assets would redirect").toEqual([]);
    expect(shipped.filter(file => !referenced.has(file)), "files that ship but nothing refers to").toEqual([]);
  });
});

let server: LandingServer;
test.beforeAll(async () => { server = await startLandingServer({ headers: true }); });
test.afterAll(async () => { await server.close(); });

test("under the real CSP a full scroll raises no violation and asks no other origin for anything", async ({ page }) => {
  const outside: string[] = [];
  page.on("request", request => { const url = request.url(); if (!url.startsWith(server.url) && !url.startsWith("data:")) outside.push(url); });
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", event => (window as unknown as { __csp: string[] }).__csp.push(`${event.violatedDirective} ${event.blockedURI}`));
  });
  const response = await page.goto(server.url);
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  await page.waitForLoadState("load");
  await page.evaluate(async () => {
    const root = document.documentElement;
    root.style.scrollBehavior = "auto";
    for (let y = 0; y <= root.scrollHeight; y += Math.round(innerHeight / 2)) { scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 60)); }
  });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp), "CSP violations").toEqual([]);
  expect(outside, "requests to another origin").toEqual([]);
});

test("links are https, page anchors or the invite e-mail, and the copy promises no earnings or partnerships", async ({ page }) => {
  await page.goto(server.url);
  await page.waitForLoadState("load");
  const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map(link => link.getAttribute("href")!));
  const other = hrefs.filter(href => !href.startsWith("https://") && !href.startsWith("#") && href !== "mailto:contact@zigoals.app?subject=Friends%20Alpha%20invite");
  expect(other, "links that are not https, an anchor or the invite").toEqual([]);
  expect(hrefs.filter(href => href === INVITE).length, "invite links: hero (2), final call (2), FAQ (1)").toBe(5);
  // Visible text and alt text. Listed negations and the Reward Goal type are the only allowed uses.
  const text = await page.evaluate(() => `${document.body.innerText}\n${[...document.images].map(image => image.alt).join("\n")}`);
  const allowed = [
    "Never a promise of financial return",
    "Listings are information, not partnerships or endorsements",
    "do not imply official affiliation, a partnership, endorsement, or a security audit",
    "they do not guarantee returns",
    "Funding plans assume no future investment return",
  ];
  // The Reward Goal type's row in the Goals section: its name, then its description.
  let rest = text.replace(/\bReward\s+Recorded, unclaimed rewards/g, " ");
  for (const phrase of allowed) rest = rest.split(phrase).join(" ");
  const banned = /\b(earn(s|ed|ing|ings)?|APR|APY|TVL|yield(s|ing)?|rewards?|returns?|partner(s|ed|ship|ships)?|integrated|integration|Goal Layer|guaranteed?)\b/gi;
  expect([...new Set(rest.match(banned) ?? [])], "banned words outside the listed negations").toEqual([]);
});
