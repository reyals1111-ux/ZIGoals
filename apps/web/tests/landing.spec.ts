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

  // A lit part is transparent, so the one continuous spectrum painted by its
  // parent shows through. A dim part carries its own quiet colour instead, which
  // is what makes the reveal visible rather than merely stateful.
  const LIT = "rgba(0, 0, 0, 0)";
  const DIM = "rgb(106, 124, 156)";

  const stateAt = async (progress: number) => {
    await page.evaluate(
      ({ top, height, at }) => window.scrollTo(0, Math.round(top + (height - innerHeight) * at)),
      { ...section, at: progress },
    );
    // Longer than the 0.55s colour transition, so a reading is a settled state.
    await page.waitForTimeout(900);
    return page.evaluate(() => ({
      active: [...document.querySelectorAll("[data-equation]")].map(el => el.classList.contains("active")),
      ticks: [...document.querySelectorAll(".equation-track span")].map(el => el.classList.contains("active")),
      inputs: [...document.querySelectorAll(".equation-inputs [data-equation]")].map(el => getComputedStyle(el).color),
      plus: [...document.querySelectorAll(".equation-inputs i")].map(el => getComputedStyle(el).color),
      wealth: [...document.querySelectorAll(".equation-result i, .equation-result .gradient-text")]
        .map(el => getComputedStyle(el).color),
    }));
  };

  // Goals — then + Habits — then + Health — then = Wealth. Each step lights its
  // own word, the operator that introduces it, and its progress tick.
  expect(await stateAt(0.02)).toEqual({
    active: [true, false, false, false],
    ticks: [true, false, false, false],
    inputs: [LIT, DIM, DIM],
    plus: [DIM, DIM],
    wealth: [DIM, DIM],
  });
  expect(await stateAt(0.25)).toEqual({
    active: [true, true, false, false],
    ticks: [true, true, false, false],
    inputs: [LIT, LIT, DIM],
    plus: [LIT, DIM],
    wealth: [DIM, DIM],
  });
  expect(await stateAt(0.5)).toEqual({
    active: [true, true, true, false],
    ticks: [true, true, true, false],
    inputs: [LIT, LIT, LIT],
    plus: [LIT, LIT],
    wealth: [DIM, DIM],
  });
  // Fully revealed: every part is transparent again, so the equation is exactly
  // the approved continuous spectrum with nothing of this reveal left in it.
  expect(await stateAt(0.75)).toEqual({
    active: [true, true, true, true],
    ticks: [true, true, true, true],
    inputs: [LIT, LIT, LIT],
    plus: [LIT, LIT],
    wealth: [LIT, LIT],
  });

  // A dim part must stay legible rather than disappear: this is a quiet
  // near-white on the near-black section, not a near-invisible ghost.
  const contrast = await page.evaluate(dim => {
    const channel = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    const luminance = (colour: string) => {
      const [r, g, b] = colour.match(/\d+/g)!.slice(0, 3).map(part => channel(Number(part) / 255));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const background = luminance(getComputedStyle(document.body).backgroundColor);
    return (luminance(dim) + 0.05) / (background + 0.05);
  }, DIM);
  expect(contrast).toBeGreaterThan(3);

  // Scrolling back up steps the reveal back down: deterministic, not a one-way
  // entrance.
  const back = await stateAt(0.5);
  expect(back.inputs).toEqual([LIT, LIT, LIT]);
  expect(back.wealth).toEqual([DIM, DIM]);
});

test("reduced motion settles the equation on all four steps without scrolling", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Paired with the desktop reveal above");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(landingUrl);
  await page.waitForTimeout(300);

  // Nothing dim, nothing mid-transition: the settled, fully lit spectrum.
  expect(await page.evaluate(() => ({
    enabled: document.documentElement.classList.contains("equation-enabled"),
    words: [...document.querySelectorAll("[data-equation]")].map(el => el.classList.contains("active")),
    ticks: [...document.querySelectorAll(".equation-track span")].map(el => el.classList.contains("active")),
    opacities: [...document.querySelectorAll("[data-equation]")].map(el => getComputedStyle(el).opacity),
    colours: [...document.querySelectorAll(
      ".equation-inputs [data-equation], .equation-inputs i, .equation-result i, .equation-result .gradient-text",
    )].map(el => getComputedStyle(el).color),
  }))).toEqual({
    enabled: false,
    words: [true, true, true, true],
    ticks: [true, true, true, true],
    opacities: ["1", "1", "1", "1"],
    colours: Array(7).fill("rgba(0, 0, 0, 0)"),
  });
});
