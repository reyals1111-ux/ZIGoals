import { expect, test, type Page } from "@playwright/test";

// Session G, Part 3 (QA-06, QA-29): numbers and money follow the browser's locale; dates with words stay English. The
// server render and hydration use en-US and the page switches right after hydration, so no locale may log a hydration
// error. Every other spec pins en-US (playwright.config.ts).
async function showcase(page: Page) {
  await page.route("**/api/market-**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"fixture offline"}' }));
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Load Showcase Demo", exact: true }).click();
  await page.waitForURL("**/app");
}
const NBSP = String.fromCharCode(0xa0);
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => { if (/hydrat|did not match|Minified React error/i.test(message.text())) errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const cases = [
  { locale: "en-US", wealth: "$501,800", euro: "€8,000", share: "63.77%", kcal: "1,970" },
  { locale: "de-DE", wealth: "501.800 $", euro: "8.000 €", share: "63,77%", kcal: "1.970" },
  { locale: "nl-BE", wealth: "US$ 501.800", euro: "€ 8.000", share: "63,77%", kcal: "1.970" },
  { locale: "ja-JP", wealth: "$501,800", euro: "€8,000", share: "63.77%", kcal: "1,970" },
] as const;

for (const c of cases) test.describe(c.locale, () => {
  test.use({ locale: c.locale });
  test(`${c.locale}: Wealth, Health and Habits use the locale's numbers and English names, without hydration errors`, async ({ page }) => {
    const errors = watchErrors(page);
    await showcase(page);
    await page.goto("/app/wealth");
    const total = page.locator(".wealth-hero, main").first();
    await expect(total).toContainText(c.wealth.replace(/ /g, NBSP));
    await expect(total).toContainText(`${c.euro.replace(/ /g, NBSP)} held in EUR · not converted`);
    await expect(page.getByRole("main")).toContainText(c.share);
    await page.goto("/app/health");
    await expect(page.getByRole("main")).toContainText(`${c.kcal}kcal logged`);
    await page.goto("/app/habits");
    const week = page.getByRole("main");
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) await expect(week).toContainText(day);
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});
