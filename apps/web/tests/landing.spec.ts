import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { normalize, resolve } from "node:path";
import { expect, test } from "@playwright/test";

const landingRoot = resolve(process.cwd(), "../../landing");

// The V4 landing is a multi-file site, so this serves the real directory rather
// than one HTML string. The types mirror what Cloudflare's asset server sends,
// `.mjs` included: a server that labels a module script `application/octet-stream`
// makes the page look broken for reasons the page is not responsible for.
const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

let server: Server;
let landingUrl: string;

test.beforeAll(async () => {
  server = createServer((request, response) => {
    const path = (request.url ?? "/").split("?")[0]!.split("#")[0]!;
    const relative = normalize(path === "/" ? "/index.html" : path).replace(/^(\.\.[/\\])+/, "");
    const file = resolve(landingRoot, `.${relative}`);
    if (!file.startsWith(landingRoot) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    const extension = file.slice(file.lastIndexOf("."));
    response.writeHead(200, {
      "content-type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      "content-length": statSync(file).size,
    });
    createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Landing test server has no TCP address");
  landingUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolveClose, reject) => {
    server.close(error => error ? reject(error) : resolveClose());
  });
});

test("landing keeps its public contract visible without horizontal overflow", async ({ page }) => {
  const external: string[] = [];
  page.on("request", request => {
    if (!request.url().startsWith(landingUrl) && !request.url().startsWith("data:")) external.push(request.url());
  });
  await page.goto(landingUrl);

  const alpha = page.getByRole("link", { name: "Launch Alpha", exact: false }).first();
  await expect(alpha).toHaveAttribute("href", "https://alpha.zigoals.app/app");
  await expect(alpha).toHaveAttribute("target", "_blank");
  await expect(alpha).toHaveAttribute("rel", "noopener noreferrer");

  // The honesty copy that must never disappear from the apex.
  await expect(page.locator(".alpha-status")).toHaveText("Public Alpha / Financial execution disabled");
  await expect(page.locator("#alpha")).toContainText(
    "The public Alpha is unaudited. Financial signing and broadcasting are disabled, and the Goal Manager contract is not deployed. Mainnet financial execution is disabled.",
  );
  await expect(page.locator(".independence")).toHaveText(
    "Independent project · Not affiliated with ZIGChain · Financial execution disabled",
  );

  // No remote font, script, stylesheet or pixel: the apex loads from itself only.
  await expect(page.locator('link[href*="fonts.googleapis.com"]')).toHaveCount(0);
  expect(external, "landing must not request a third-party resource").toEqual([]);

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const caption = page.locator(".equation-caption");
    await expect(caption).toHaveText("Today's Goals, Habits & Health= Tomorrow's Wealth");

    // The approved slogan keeps its two visual lines, in order, inside the viewport.
    const lines = await caption.evaluate(el => {
      const second = el.querySelector(".caption-line")!;
      const firstEmphasis = el.querySelector(".nebula-emphasis")!;
      return {
        firstTop: firstEmphasis.getBoundingClientRect().top,
        secondTop: second.getBoundingClientRect().top,
        right: Math.max(
          ...[...el.querySelectorAll("span")].map(part => part.getBoundingClientRect().right),
        ),
      };
    });
    expect(lines.secondTop).toBeGreaterThan(lines.firstTop);
    expect(lines.right).toBeLessThanOrEqual(width);

    await expect(alpha).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `landing document width at ${width}px`,
    ).toBeLessThanOrEqual(width);
  }
});

test("landing declares a loadable local icon and a real favicon file", async ({ page }) => {
  await page.goto(landingUrl);
  await page.waitForLoadState("networkidle");

  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveAttribute("type", "image/svg+xml");
  const href = await icon.getAttribute("href");
  expect(href).toBe("assets/brand/favicon.svg");
  expect(await page.evaluate(async iconHref => {
    const response = await fetch(iconHref!);
    return { ok: response.ok, type: response.headers.get("content-type") };
  }, href)).toEqual({ ok: true, type: "image/svg+xml" });

  // The old landing deliberately had no favicon.ico; the V4 apex ships one, so a
  // browser's unprompted request for it must not 404.
  expect(await page.evaluate(async () => {
    const response = await fetch("/favicon.ico");
    return response.ok;
  })).toBe(true);

  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "assets/brand/apple-touch-icon.png",
  );
});

// Landing V5 (Session N, owner-directed): the four steps of "Goals, Habits & Health = Wealth" appear one word per
// step, on desktop and on phones, each word already in its final nebula look. V4's grey-to-nebula reveal (desktop
// only, "dim" parts in #6a7c9c) is gone: a word is either not there yet or there in its final colours.
test("the equation adds one word per step, each already in its final nebula look", async ({ page }, info) => {
  await page.setViewportSize(info.project.name === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 });
  await page.goto(landingUrl);
  await page.waitForLoadState("load");

  // Every word paints its own segment of the spectrum, through transparent text, before and after it appears.
  const look = () => page.evaluate(() => [...document.querySelectorAll("#equation .eqv5-ink, #equation .eqv5-comma")].map(el => {
    const style = getComputedStyle(el);
    return { color: style.color, clip: style.backgroundClip, gradient: style.backgroundImage.startsWith("linear-gradient(") };
  }));
  const finalLook = Array(5).fill({ color: "rgba(0, 0, 0, 0)", clip: "text", gradient: true });
  expect(await look()).toEqual(finalLook);

  const stateAt = async (viewports: number) => {
    await page.evaluate(at => {
      const top = document.querySelector("#equation")!.getBoundingClientRect().top + scrollY;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, Math.round(top + innerHeight * at));
    }, viewports);
    // Longer than the 0.6s fade, so a reading is a settled state.
    await page.waitForTimeout(1100);
    return page.evaluate(() => ({
      words: [...document.querySelectorAll("#equation [data-equation]")].map(el => Number(getComputedStyle(el).opacity)),
      ticks: [...document.querySelectorAll("#equation .equation-track span")].map(el => el.classList.contains("active")),
    }));
  };
  // Goals — then , Habits — then & Health — then = Wealth: one word and one progress tick per step.
  expect(await stateAt(0.05)).toEqual({ words: [1, 0, 0, 0], ticks: [true, false, false, false] });
  expect(await stateAt(1.05)).toEqual({ words: [1, 1, 0, 0], ticks: [true, true, false, false] });
  expect(await stateAt(2.05)).toEqual({ words: [1, 1, 1, 0], ticks: [true, true, true, false] });
  expect(await stateAt(3.05)).toEqual({ words: [1, 1, 1, 1], ticks: [true, true, true, true] });
  // The look never changed on the way.
  expect(await look()).toEqual(finalLook);

  // Every colour of every word's spectrum stands out from the page background (at least 4.5:1, which is more than
  // large text needs). This replaces V4's check that its grey "dim" state stayed legible.
  const contrasts = await page.evaluate(() => {
    const channel = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    const luminance = (colour: string) => {
      const [r, g, b] = colour.match(/[\d.]+/g)!.slice(0, 3).map(part => channel(Number(part) / 255));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const background = luminance(getComputedStyle(document.body).backgroundColor);
    return [...document.querySelectorAll("#equation .eqv5-ink, #equation .eqv5-comma")].flatMap(el =>
      (getComputedStyle(el).backgroundImage.match(/rgba?\([^)]*\)/g) ?? []).map(stop => (luminance(stop) + 0.05) / (background + 0.05)));
  });
  expect(contrasts.length).toBeGreaterThanOrEqual(12);
  for (const ratio of contrasts) expect(ratio).toBeGreaterThanOrEqual(4.5);

  // Scrolling back up steps the story back down: deterministic, not a one-way entrance.
  expect((await stateAt(2.05)).words).toEqual([1, 1, 1, 0]);
});

test("reduced motion settles the equation on all four steps without scrolling", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(info.project.name === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 });
  await page.goto(landingUrl);
  await page.waitForTimeout(300);

  // Nothing hidden, nothing pinned, nothing mid-transition: the settled, fully lit spectrum.
  expect(await page.evaluate(() => ({
    enabled: document.documentElement.classList.contains("eqv5-ready"),
    words: [...document.querySelectorAll("#equation [data-equation]")].map(el => el.classList.contains("is-on")),
    ticks: [...document.querySelectorAll("#equation .equation-track span")].map(el => el.classList.contains("active")),
    opacities: [...document.querySelectorAll("#equation [data-equation]")].map(el => getComputedStyle(el).opacity),
    colours: [...document.querySelectorAll("#equation .eqv5-ink, #equation .eqv5-comma")].map(el => getComputedStyle(el).color),
    stage: getComputedStyle(document.querySelector("#equation .eqv5-stage")!).position,
  }))).toEqual({
    enabled: false,
    words: [true, true, true, true],
    ticks: [true, true, true, true],
    opacities: ["1", "1", "1", "1"],
    colours: Array(5).fill("rgba(0, 0, 0, 0)"),
    stage: "relative",
  });
});

// Session K, Part 7: a visitor whose system asks for more contrast gets stronger quiet text and edges, and nothing
// moves: the media block changes colours only.
test("prefers-contrast: more strengthens quiet text and edges without moving anything", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(info.project.name === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 });
  await page.goto(landingUrl);
  await page.waitForTimeout(300);
  // What the page keeps dim on purpose (everything else is already at least 13:1).
  const QUIET = [".separator", ".toolbar-divider", ".footer-bottom", ".faq-list summary span", ".footer-spark", ".mobile-menu a span"];
  const sample = () => page.evaluate(selectors => {
    const channel = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    const luminance = (colour: string) => { const [r, g, b] = colour.match(/[\d.]+/g)!.slice(0, 3).map(part => channel(Number(part) / 255)); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
    const background = luminance(getComputedStyle(document.body).backgroundColor);
    const ratio = (colour: string) => { const l = luminance(colour); return (Math.max(l, background) + 0.05) / (Math.min(l, background) + 0.05); };
    const text = Object.fromEntries(selectors.map(selector => { const element = document.querySelector(selector); return [selector, element ? ratio(getComputedStyle(element).color) : null]; }));
    const layout = [...document.querySelectorAll("body *")].map(element => { const r = element.getBoundingClientRect(); return `${Math.round(r.x * 10)},${Math.round(r.y * 10)},${Math.round(r.width * 10)},${Math.round(r.height * 10)}`; });
    const edge = document.querySelector(".dimension") ? ratio(getComputedStyle(document.querySelector(".dimension")!).borderTopColor) : null;
    // Every element that holds text directly, in document order: its contrast on the page background.
    const all = [...document.querySelectorAll("body *")].filter(element => [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())).map(element => ratio(getComputedStyle(element).color));
    return { text, layout, edge, all };
  }, QUIET);
  const normal = await sample();
  await page.emulateMedia({ reducedMotion: "reduce", contrast: "more" });
  await page.waitForTimeout(100);
  const more = await sample();
  // Colours only: every element keeps its exact box.
  expect(more.layout).toEqual(normal.layout);
  // Every sampled quiet line reaches at least 7:1 on the page background, and is stronger than before.
  const measured = Object.entries(more.text).filter(([, ratio]) => ratio !== null);
  expect(measured.length).toBeGreaterThanOrEqual(4);
  for (const [selector, ratio] of measured) {
    expect(ratio!, selector).toBeGreaterThanOrEqual(7);
    expect(ratio!, selector).toBeGreaterThan(normal.text[selector]!);
  }
  if (more.edge !== null && normal.edge !== null) expect(more.edge).toBeGreaterThan(normal.edge);
  // And no text anywhere on the page gets darker.
  expect(more.all.length).toBe(normal.all.length);
  const darker = more.all.map((ratio, i) => ratio < normal.all[i]! - 0.001 ? i : -1).filter(i => i >= 0);
  expect(darker, "elements whose text lost contrast").toEqual([]);
});
