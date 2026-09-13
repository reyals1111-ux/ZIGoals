import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const landingHtml = readFileSync(
  resolve(process.cwd(), "../../landing/index.html"),
  "utf8",
);

let server: Server;
let landingUrl: string;

test.beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url !== "/" && request.url !== "/index.html") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(landingHtml);
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
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("https://fonts.gstatic.com/**", route => route.abort());
  await page.goto(landingUrl);

  const alpha = page.getByRole("link", { name: "Explore the Alpha →", exact: true });
  await expect(alpha).toHaveAttribute("href", "https://alpha.zigoals.app/app");
  await expect(alpha).toHaveAttribute("target", "_blank");
  await expect(alpha).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.locator(".alpha-note")).toHaveText(
    "Public Alpha · Simulation + wallet connection only. Goal Manager is not deployed. No blockchain transaction will be sent.",
  );

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { name: "ZIGoals", exact: true })).toBeVisible();
    await expect(alpha).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `landing document width at ${width}px`,
    ).toBeLessThanOrEqual(width);
  }
});

test("landing declares a loadable local icon without requesting a missing favicon", async ({ page }) => {
  const requestedUrls: string[] = [];
  page.on("request", request => requestedUrls.push(request.url()));
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("https://fonts.gstatic.com/**", route => route.abort());
  await page.goto(landingUrl);
  await page.waitForLoadState("networkidle");

  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveAttribute("type", "image/svg+xml");
  const href = await icon.getAttribute("href");
  expect(href).toMatch(/^data:image\/svg\+xml,/);
  expect(await page.evaluate(async iconHref => {
    const response = await fetch(iconHref!);
    return { ok: response.ok, type: response.headers.get("content-type") };
  }, href)).toEqual({ ok: true, type: "image/svg+xml" });
  expect(requestedUrls).not.toContain(`${landingUrl}/favicon.ico`);
});
