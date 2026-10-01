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

test("the equation reveals its four steps in scroll order", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "The stepped reveal runs above 700px; phones get the settled state below");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(landingUrl);

  const section = await page.evaluate(() => {
    const rect = document.querySelector("#equation")!.getBoundingClientRect();
    return { top: rect.top + scrollY, height: rect.height };
  });

  const stateAt = async (progress: number) => {
    await page.evaluate(
      ({ top, height, at }) => window.scrollTo(0, Math.round(top + (height - innerHeight) * at)),
      { ...section, at: progress },
    );
    await page.waitForTimeout(250);
    return page.evaluate(() => ({
      words: [...document.querySelectorAll("[data-equation]")].map(el => el.classList.contains("active")),
      ticks: [...document.querySelectorAll(".equation-track span")].map(el => el.classList.contains("active")),
    }));
  };

  // Goals, then + Habits, then + Health, then = Wealth, each with its own tick.
  expect(await stateAt(0.02)).toEqual({ words: [true, false, false, false], ticks: [true, false, false, false] });
  expect(await stateAt(0.25)).toEqual({ words: [true, true, false, false], ticks: [true, true, false, false] });
  expect(await stateAt(0.5)).toEqual({ words: [true, true, true, false], ticks: [true, true, true, false] });
  expect(await stateAt(0.75)).toEqual({ words: [true, true, true, true], ticks: [true, true, true, true] });

  // The ticks are the visible progress: an inactive one is the dim rail colour.
  const tickColours = await page.evaluate(() =>
    [...document.querySelectorAll(".equation-track span")].map(el => getComputedStyle(el).backgroundColor),
  );
  expect(new Set(tickColours).size).toBe(1);
  await stateAt(0.02);
  const mixedColours = await page.evaluate(() =>
    [...document.querySelectorAll(".equation-track span")].map(el => getComputedStyle(el).backgroundColor),
  );
  expect(new Set(mixedColours).size).toBe(2);

  // Scrolling back up steps the reveal back down: the sequence is deterministic,
  // not a one-way entrance.
  expect(await stateAt(0.5)).toEqual({ words: [true, true, true, false], ticks: [true, true, true, false] });
});

test("reduced motion settles the equation on all four steps without scrolling", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Paired with the desktop reveal above");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(landingUrl);
  await page.waitForTimeout(300);

  expect(await page.evaluate(() => ({
    enabled: document.documentElement.classList.contains("equation-enabled"),
    words: [...document.querySelectorAll("[data-equation]")].map(el => el.classList.contains("active")),
    ticks: [...document.querySelectorAll(".equation-track span")].map(el => el.classList.contains("active")),
    opacities: [...document.querySelectorAll("[data-equation]")].map(el => getComputedStyle(el).opacity),
  }))).toEqual({
    enabled: false,
    words: [true, true, true, true],
    ticks: [true, true, true, true],
    opacities: ["1", "1", "1", "1"],
  });
});
