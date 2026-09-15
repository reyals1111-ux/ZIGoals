import { test, expect } from "@playwright/test";
import { installRun7Demo } from "./fixtures/run7-demo";
test.use({ timezoneId: "Europe/Brussels" });
test("populated product fits every required viewport with reduced motion and scoped links", async ({ page }, info) => {
  test.setTimeout(120_000);
  await installRun7Demo(page);
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const width of info.project.name === "desktop" ? [1440,1280,768] : [390,320]) {
    await page.setViewportSize({ width, height: width <= 390 ? 800 : 1024 });
    for (const [name, route] of [["today", "/app"], ["goals", "/app/goals"], ["goal-detail", "/app/goals/1"], ["create-goal", "/app/goals/new"], ["habits", "/app/habits"], ["health", "/app/health"], ["activity", "/app/activity"], ["settings", "/app/settings"], ["ecosystem", "/app/ecosystem"]]) {
      await page.goto(route!);
      await expect(page.locator("main h1")).toBeVisible();
      if (name === "today") await expect(page.getByRole("heading", { name: "First home", exact: true })).toBeVisible();
      if (name === "habits") await expect(page.getByRole("article", { name: "Review my spending", exact: true })).toBeVisible();
      if (name === "health") await expect(page.getByRole("region", { name: "Breakfast diary" })).toContainText("Morning oats");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} at ${width}`).toBe(true);
      if (process.env.RUN7_CAPTURE === "1") await page.screenshot({ path: info.outputPath(`${name}-${width}.png`), fullPage: true, animations: "disabled" });
      if (name === "today") expect(await page.locator(".ambient-light").first().evaluate(node => getComputedStyle(node).animationName)).toBe("none");
    }
  }
  expect(errors).toEqual([]);
});
