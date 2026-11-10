import {expect, test, type Page} from '@playwright/test';
import {hydrated, offlineApi} from '../../ah-helpers';
import {applyTheme, axe, THEMES} from '../../p6-helpers';

/**
 * Session AL (lane L10a). Part 12 (owner decision O2; Moscow MO-043, MO-044, MO-118, M-018, N-MO-01, N-MO-02): the
 * placeholder Plans page, two one-time prices in euros, the placeholder line, "Everything is free during the Alpha", and
 * no way to buy (no buy, purchase, checkout or subscribe control; no dollar price). The addresses people try for prices
 * open it. 3g: the shell's landmarks and skip link pass axe in every theme, and an unknown /app address shows the app's
 * own helpful 404 with the shell around it. Fictional data only; /api answers 503.
 */
test.beforeEach(async ({page}) => { await offlineApi(page); });
const PLACEHOLDER = 'Placeholder prices · nothing is charged during the Alpha · prices may change';
async function ready(page: Page, path: string) {
  await page.goto(path); await hydrated(page);
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('main h1').first()).toBeVisible();
}

test('Plans: both one-time prices in euros, the placeholder line, free during the Alpha, nothing to buy', async ({page}) => {
  await ready(page, '/app/plans');
  await expect(page).toHaveTitle(/^Plans · /);
  const main = page.locator('main');
  await expect(main.getByRole('heading', {level: 1, name: 'Plans'})).toBeVisible();
  const base = main.getByRole('region', {name: 'ZIGoals', exact: true}), premium = main.getByRole('region', {name: 'ZIGoals Premium'});
  await expect(base).toContainText('€20'); await expect(base).toContainText('one-time');
  await expect(premium).toContainText('€50'); await expect(premium).toContainText('ZIGi · Your Personal AI Companion');
  await expect(premium).toContainText('NOVA’s premium features'); await expect(premium).toContainText('bring your own AI');
  await expect(main.getByText(PLACEHOLDER, {exact: true})).toBeVisible();
  await expect(main.getByText('Everything is free during the Alpha', {exact: false}).first()).toBeVisible();
  await expect(main).toContainText('ZIGoals bills nothing');
  // No way to pay: no control with buy, purchase, checkout, subscribe, upgrade or pay words; no form; no dollar price.
  await expect(main.getByRole('button')).toHaveCount(0);
  await expect(main.getByRole('link', {name: /buy|purchase|checkout|subscribe|upgrade|\bpay\b/i})).toHaveCount(0);
  await expect(main.locator('form, input')).toHaveCount(0);
  expect(await main.textContent()).not.toMatch(/\$\s?\d|USD/);
  // Not linked from the landing page.
  await page.goto('/');
  await expect(page.locator('a[href*="/app/plans"]')).toHaveCount(0);
});

test('Plans: the price addresses people try open the Plans page; an unknown address is the helpful 404', async ({page}) => {
  for (const path of ['/app/pricing', '/app/premium', '/app/upgrade']) {
    await page.goto(path);
    await page.waitForURL(url => url.pathname === '/app/plans');
  }
  await ready(page, '/app/no-such-page');
  await expect(page).toHaveTitle('Page not found · ZIGoals Alpha');
  const main = page.locator('main');
  await expect(main.getByRole('heading', {level: 1, name: 'Page not found.'})).toBeVisible();
  await expect(main.getByRole('link', {name: 'Go to Today'})).toHaveAttribute('href', '/app');
  await expect(main.getByRole('navigation', {name: 'Pages you may have meant'}).getByRole('link')).toHaveText(['Goals', 'Habits', 'Health', 'Wealth', 'Tasks', 'Settings']);
  // The shell is around it: navigation and the search trigger.
  await expect(page.getByRole('button', {name: /^Search\b/}).filter({visible: true})).toHaveCount(1);
});

for (const theme of THEMES) {
  test(`${theme}: axe-clean shell landmarks, skip link, Plans, 404, and the Apps & extras sheet`, async ({page, isMobile}) => {
    test.setTimeout(90_000);
    await applyTheme(page, theme);
    const found: string[] = [];
    for (const path of ['/app', '/app/plans', '/app/no-such-page']) {
      await ready(page, path);
      for (const v of await axe(page)) found.push(`${path}: ${v.rule} ${v.target} ${v.summary}`);
    }
    // One banner/navigation set: a skip link first in the tab order, pointing at main.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', {name: 'Skip to content'})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#main');
    await expect(page.getByRole('main')).toHaveCount(1);
    if (isMobile) {
      await page.getByTestId('apps-extras-button').click();
      const sheet = page.getByRole('dialog', {name: 'Apps & extras'});
      await expect(sheet).toBeVisible();
      for (const v of await axe(page, sheet)) found.push(`sheet: ${v.rule} ${v.target} ${v.summary}`);
    }
    expect(found).toEqual([]);
  });
}
