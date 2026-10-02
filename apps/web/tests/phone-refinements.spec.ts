import { expect, test, type Locator, type Page } from "@playwright/test";
import {openFold} from "./phone-nav";

// Session G, Part 4: shorter phone pages without removing anything ("Show all N", a folded week with its totals), 44 px
// Habits calendar days at 360 px, and drag-to-dismiss on sheet grabbers. Sizes are set explicitly so both projects run
// these checks; desktop must stay exactly as before.
test.use({ locale: "en-US" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { error: "LOCAL_FIXTURE_ONLY" } }));
});
async function showcase(page: Page) {
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Load Showcase Demo", exact: true }).click();
  await page.waitForURL("**/app");
}
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.locator(".workspace")).not.toHaveAttribute("aria-busy", "true");
}
const visibleCount = (items: Locator) => items.evaluateAll((all) => all.filter((item) => item.getBoundingClientRect().height > 0).length);

test("Wealth on a phone: four holdings, then Show all 13 assets; every card stays in the page and desktop is unchanged", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await showcase(page);
  await open(page, "/app/wealth");
  const cards = page.locator(".owned-asset-card"), more = page.getByRole("button", { name: "Show all 13 assets", exact: true });
  await expect(cards).toHaveCount(13);
  await expect(more).toBeVisible();
  expect(await visibleCount(cards)).toBe(4);
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".wealth-hero")).toContainText("held in EUR · not converted");
  await more.click();
  expect(await visibleCount(cards)).toBe(13);
  const fewer = page.getByRole("button", { name: "Show fewer assets", exact: true });
  await expect(fewer).toHaveAttribute("aria-expanded", "true");
  await fewer.click();
  expect(await visibleCount(cards)).toBe(4);
  // Asset classes: four tiles, then the rest (their section folds to a row on a phone, Session I Part 9).
  await openFold(page, "Your wealth, in perspective");
  const classes = page.locator(".asset-class-summaries .class-summary"), total = await classes.count();
  expect(total).toBeGreaterThan(4);
  expect(await visibleCount(classes)).toBe(4);
  await page.getByRole("button", { name: `Show all ${total} asset classes`, exact: true }).click();
  expect(await visibleCount(classes)).toBe(total);
  // Top holdings per currency: three, then the rest.
  const top = page.getByRole("region", { name: "USD top holdings" }).locator("li");
  await expect(top).toHaveCount(5);
  expect(await visibleCount(top)).toBe(3);
  await page.getByRole("region", { name: "USD top holdings" }).getByRole("button", { name: "Show all 5 holdings", exact: true }).click();
  expect(await visibleCount(top)).toBe(5);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".phone-show-all")).toHaveCount(0);
  await expect(page.locator("[data-phone-limit]")).toHaveCount(0);
  expect(await visibleCount(cards)).toBe(13);
});

test("Today on a phone: shorter lists with Show all, and the week folded into its totals with the note in view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await showcase(page);
  await open(page, "/app");
  const agenda = page.getByRole("region", { name: "Your funding agenda" });
  expect(await visibleCount(agenda.locator("li"))).toBe(2);
  await agenda.getByRole("button", { name: /^Show all \d+ Goals$/ }).click();
  expect(await visibleCount(agenda.locator("li"))).toBe(await agenda.locator("li").count());
  const attention = page.locator(".needs-attention");
  await expect(attention).toContainText("Review asset");
  expect(await visibleCount(attention.locator("li"))).toBe(2);
  await attention.getByRole("button", { name: /^View all \d+ items$/ }).click();
  expect(await visibleCount(attention.locator("li"))).toBe(await attention.locator("li").count());

  await openFold(page, "Your week");
  const week = page.getByRole("region", { name: "Your week, all in one orbit." });
  await expect(week.locator(".bottom-week-totals")).toHaveText(/^Last 7 days: .*habit check-ins.*health entr.*\.$/);
  await expect(week.getByText("They are not scores and they do not predict anything.")).toBeVisible();
  await expect(week.locator(".bottom-rows")).toBeHidden();
  await week.getByRole("button", { name: "Show each day", exact: true }).click();
  await expect(week.getByRole("group", { name: "Habit check-ins, last 7 days" })).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".phone-show-all, .bottom-week-totals")).toHaveCount(0);
  await expect(page.locator("[data-phone-limit], [data-phone-collapsed]")).toHaveCount(0);
  await expect(week.getByRole("group", { name: "Habit check-ins, last 7 days" })).toBeVisible();
});

test("Habits calendar days are at least 44 px on a 360 px phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await showcase(page);
  await open(page, "/app/habits");
  const card = page.locator(".habit-card").first();
  await card.getByText("History & reflection", { exact: true }).click();
  const days = card.locator(".habit-calendar-day");
  await expect(days.first()).toBeVisible();
  const sizes = await days.evaluateAll((all) => all.map((day) => { const box = day.getBoundingClientRect(); return Math.min(box.width, box.height); }));
  expect(sizes.length).toBeGreaterThanOrEqual(28);
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44);
  const cardBox = (await card.boundingBox())!, calendar = (await card.locator(".habit-calendar").boundingBox())!;
  expect(calendar.x).toBeGreaterThanOrEqual(cardBox.x);
  expect(calendar.x + calendar.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
});

async function grab(page: Page, sheet: Locator) {
  const box = (await sheet.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + 10 };
}
async function drag(page: Page, from: { x: number; y: number }, by: number) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 8; step++) await page.mouse.move(from.x, from.y + (by * step) / 8);
}

test("phone sheets: dragging the grabber down closes the sheet as Escape does; a short drag or a drag elsewhere does not", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await showcase(page);
  await open(page, "/app/wealth");
  const trigger = page.locator(".wealth-actions").getByRole("button", { name: "+ Add asset" });
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "Add to your wealth" });
  await expect(sheet).toBeVisible();
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));

  // A short drag springs back.
  await drag(page, await grab(page, sheet), 40);
  expect(await sheet.evaluate((el) => el.style.transform)).toBe("translateY(40px)");
  await page.mouse.up();
  await expect(sheet).toBeVisible();

  // A drag that starts in the sheet's content is not a dismissal.
  const body = (await sheet.locator(".wealth-sheet-body").boundingBox())!;
  await drag(page, { x: body.x + body.width / 2, y: body.y + 20 }, 300);
  await page.mouse.up();
  await expect(sheet).toBeVisible();

  // A long drag on the grabber closes it, and focus returns to the trigger.
  await drag(page, await grab(page, sheet), 260);
  await page.mouse.up();
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toBeFocused();

  // More, the phone navigation sheet, works the same way.
  await page.locator(".phone-tabbar").getByRole("button", { name: "More", exact: true }).click();
  const more = page.getByRole("dialog", { name: "More" });
  await expect(more).toBeVisible();
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  await drag(page, await grab(page, more), 240);
  await page.mouse.up();
  await expect(more).toBeHidden();
});

test("phone sheets under reduced motion: the sheet does not follow the finger, and a full drag still closes it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await showcase(page);
  await open(page, "/app/wealth");
  await page.locator(".wealth-actions").getByRole("button", { name: "+ Add asset" }).click();
  const sheet = page.getByRole("dialog", { name: "Add to your wealth" });
  await expect(sheet).toBeVisible();
  await drag(page, await grab(page, sheet), 260);
  expect(await sheet.evaluate((el) => el.style.transform)).toBe("");
  await page.mouse.up();
  await expect(sheet).toHaveCount(0);
});

test("desktop sheets are not draggable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await showcase(page);
  await open(page, "/app/wealth");
  await page.locator(".wealth-actions").getByRole("button", { name: "+ Add asset" }).click();
  const sheet = page.getByRole("dialog", { name: "Add to your wealth" });
  await expect(sheet).toBeVisible();
  await drag(page, await grab(page, sheet), 260);
  await page.mouse.up();
  await expect(sheet).toBeVisible();
});
