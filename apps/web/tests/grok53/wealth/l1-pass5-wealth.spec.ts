import {expect, test} from '@playwright/test';
import {chooseChain} from '../../chain-choice';
import {hydrated, loadShowcase} from '../../ah-helpers';

/**
 * Session AL, lane L1 fifth pass (GROK53_REPLAY_L1_2.md, the CHANGED rows): 1280×800, en-GB, Europe/Brussels, the
 * Showcase as the replay used it; market answers offline (503).
 */
test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark', locale: 'en-GB', timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});

test('N-MO-17: Showcase Gold counts troy ounces (never "10 GOLD") and says what one troy ounce is worth', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth/asset/showcase-gold'); await hydrated(page);
  const holding = page.getByRole('region', {name: 'Your holding'});
  await expect(holding).toContainText('10 troy ounces of Gold · US$4,400.00 per troy ounce');
  await expect(holding).toContainText('5 troy ounces of Gold');
  await expect(page.locator('main')).not.toContainText(/\b\d+ GOLD\b/);
  await page.goto('/app/wealth'); await hydrated(page);
  await expect(page.locator('.holding-unit-price small').filter({hasText: 'per troy ounce'}).first()).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/\bper GOLD\b|\b\d+ GOLD\b/);
});

for (const theme of ['nebula', 'dark', 'light'] as const) test(`D-221 (${theme}): hovering "Refresh prices" and "Manage assets" visibly changes their edge and face`, async ({page}) => {
  if (theme !== 'nebula') await page.addInitScript(t => { try { localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: t})); } catch { /* storage denied */ } }, theme);
  test.skip(!!test.info().project.use.hasTouch, 'a hover state is for a pointer');
  await loadShowcase(page);
  await page.goto('/app/wealth'); await hydrated(page);
  const look = (el: Element) => { const c = getComputedStyle(el); return {border: c.borderTopColor, face: `${c.backgroundColor} ${c.backgroundImage}`}; };
  for (const tool of [page.getByRole('button', {name: /Refresh prices/}), page.getByRole('link', {name: 'Manage assets'})]) {
    await page.mouse.move(2, 2);
    await expect(tool).toBeEnabled();
    const rest = await tool.evaluate(look);
    await tool.hover();
    await expect.poll(() => tool.evaluate(look)).not.toEqual(rest);
    const hover = await tool.evaluate(look);
    expect(hover.border).not.toBe(rest.border);
    expect(hover.face).not.toBe(rest.face);
  }
});

test('DV-146: Edit asset says the saved cash balance and value as Wealth writes them, beside the plain-number field', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth/asset/showcase-usd'); await hydrated(page);
  await page.getByRole('button', {name: 'Edit asset'}).click();
  let sheet = page.getByRole('dialog', {name: /^Edit /});
  const balance = sheet.getByLabel('Cash balance');
  await expect(balance).toHaveValue('25000');
  await expect(balance).toHaveAccessibleDescription(/Now US\$25,000\.00\. Type the new balance as a plain number/);
  await page.goto('/app/wealth/asset/showcase-custom'); await hydrated(page);
  await page.getByRole('button', {name: 'Edit asset'}).click();
  sheet = page.getByRole('dialog', {name: /^Edit /});
  await expect(sheet.getByLabel('Total holding value')).toHaveAccessibleDescription('Now US$2,500.00.');
});
