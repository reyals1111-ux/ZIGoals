import {expect, test, type Page} from '@playwright/test';

/**
 * Session U follow-up F3: on a phone each Today widget card folds to a row named by the widget and opens in place, while
 * the overview ("Your selected widgets") keeps every widget's value in view. Nothing is removed: each row is a real
 * button named by its card, with aria-expanded and aria-controls, at least 44 px tall, operable from the keyboard, and
 * still under reduced motion or Motion Off. While Today is being customized no widget folds. Desktop and tablet are
 * unchanged (scripts/desktop-freeze-check.mjs).
 */
test.use({viewport: {width: 390, height: 844}});
async function showcase(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  // Session AK RB (deliberate): since R11 (Session AK G2) a phone mounts Today's widget area when it comes near the screen or
  // the browser is first idle, so the widgets are counted once they are in the page (the count read 0 before).
  await expect(widgetModules(page).first()).toBeAttached();
  await expect.poll(async () => { const a = await widgetModules(page).count(); await page.waitForTimeout(300); return a === await widgetModules(page).count() ? 'settled' : 'changing'; }).toBe('settled');
}
// Session AC (deliberate, the owner's "each thing once"): the habits widget stands in for the hidden Daily Habits by default
// and shows open as Daily Habits did on a phone (asserted below); every other widget folds to a row as before.
function widgetModules(page: Page) { return page.getByRole('region', {name: 'Your Today widgets'}).locator('.placed-module[data-kind="widget"]:not([data-stands-in])'); }

// Session AK RB (RELEASE_REVIEW_2 R2-9, deliberate): the overview no longer repeats every widget (each showed twice on
// Today); each row carries its card's figure under its name instead, so every value stays in view on the folded page.
test('every widget card is a row named by it; the overview still shows every value', async ({page}) => {
  await showcase(page);
  const modules = widgetModules(page), count = await modules.count();
  expect(count).toBeGreaterThan(1);
  const overview = page.getByRole('region', {name: 'Your selected widgets'});
  await expect(overview).toBeVisible();
  await expect(overview.locator('.dashboard-summary-item')).toHaveCount(0);
  const standIn = page.locator('.placed-module[data-stands-in="habits"]');
  await expect(standIn).toHaveCount(1); await expect(standIn.locator('.phone-fold-toggle')).toHaveCount(0);
  await expect(standIn.locator('.habits-today')).toBeVisible();
  for (let i = 0; i < count; i++) {
    const placed = modules.nth(i), card = placed.locator('article.dashboard-widget'), title = (await card.getAttribute('aria-label'))!;
    const row = placed.locator('.phone-fold-toggle');
    // The row is named by the card's own title, then its figure (its Show/Hide hint is hidden from assistive technology).
    const figure = (await card.locator('.dashboard-metric-value strong').first().textContent())?.trim() ?? '';
    await expect(row).toHaveAccessibleName(figure ? `${title} ${figure}` : title);
    if (figure) await expect(row.locator('.phone-fold-detail')).toHaveText(figure);
    await expect(row).toHaveAttribute('aria-expanded', 'false');
    await expect(card).toBeHidden();
    expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // The row controls the region that holds the card.
    await expect(page.locator(`[id="${await row.getAttribute('aria-controls')}"]`).locator('article.dashboard-widget')).toHaveAttribute('aria-label', title);
  }
});

test('a widget row opens and closes from the keyboard, in place', async ({page}) => {
  await showcase(page);
  const placed = widgetModules(page).first(), row = placed.locator('.phone-fold-toggle'), card = placed.locator('article.dashboard-widget');
  await row.focus(); await expect(row).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  await expect(card).toBeVisible();
  const top = (await row.boundingBox())!, body = (await card.boundingBox())!;
  expect(body.y).toBeGreaterThan(top.y); expect(body.y - (top.y + top.height)).toBeLessThan(40);
  await page.keyboard.press('Space');
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  await expect(card).toBeHidden();
  await expect(row).toBeFocused();
});

test('while Today is being customized no widget folds, so each card\'s options are in reach', async ({page}) => {
  await showcase(page);
  const count = await widgetModules(page).count();
  await page.getByRole('button', {name: 'Customize Today', exact: true}).click();
  await expect(widgetModules(page).locator('.phone-fold-toggle')).toHaveCount(0);
  await expect(widgetModules(page).locator('article.dashboard-widget:visible')).toHaveCount(count);
});

for (const [label, setup] of [
  ['reduced motion', async (page: Page) => { await page.emulateMedia({reducedMotion: 'reduce'}); }],
  ['Motion Off', async (page: Page) => { await page.emulateMedia({reducedMotion: 'no-preference'}); await page.addInitScript(() => localStorage.setItem('zigoals:motion:v1', 'off')); }],
] as const) test(`the rows are still under ${label}`, async ({page}) => {
  await setup(page);
  await showcase(page);
  if (label === 'Motion Off') await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
  const row = widgetModules(page).first().locator('.phone-fold-toggle');
  for (const element of [row, row.locator('.phone-fold-hint svg')]) expect(await element.evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(d => parseFloat(d) === 0))).toBe(true);
});
