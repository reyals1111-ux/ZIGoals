import { expect, test, type Page } from "@playwright/test";

// Session F's QA sweep (docs/qa/QA_SWEEP_2026-09-30.md): QA-19, closing Add asset left focus on <body>; QA-20, creating
// a habit with the keyboard left focus on <body>; QA-30, Today had two elements with the id "today-habits-title".
test.use({ locale: "en-US" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }));
});

const focused = (page: Page) => page.evaluate(() => {
  const element = document.activeElement;
  return element ? { tag: element.tagName.toLowerCase(), name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "" } : null;
});

test("closing Add asset returns focus to the button that opened it (QA-19)", async ({ page }) => {
  await page.goto("/app/wealth");
  const trigger = page.getByRole("button", { name: "+ Add asset" }).first();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Add to your wealth" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Add to your wealth" })).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(trigger).toBeFocused();
});

test("after creating a habit with the keyboard, focus is on the new habit; after Cancel, on + New habit (QA-20)", async ({ page }) => {
  await page.goto("/app/habits");
  const add = page.getByRole("button", { name: "+ New habit", exact: true });
  await add.focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Habit title", { exact: true }).fill("Evening stretch");
  await page.getByRole("button", { name: "Create habit", exact: true }).focus();
  await page.keyboard.press("Enter");
  const card = page.getByRole("article", { name: "Evening stretch", exact: true });
  await expect(card).toBeVisible();
  await expect(card).toBeFocused();
  expect(await focused(page)).toEqual({ tag: "article", name: "Evening stretch" });

  await add.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(add).toBeFocused();
});

test("Today has no duplicate element ids (QA-30)", async ({ page }) => {
  await page.goto("/app");
  await expect(page.locator(".habits-today").first()).toBeVisible();
  const duplicates = await page.evaluate(() => {
    const seen = new Map<string, number>();
    for (const element of document.querySelectorAll("[id]")) seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
    return [...seen].filter(([, count]) => count > 1).map(([id]) => id);
  });
  expect(duplicates).toEqual([]);
});
