import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {TODAY_FOLDS_KEY} from '../lib/today-folds';

/**
 * Session V Part 1b: on a phone, the Today widget rows a person opened stay open after a reload (one device key,
 * `zigoals:today-folds:v1`, written only when a row is opened or closed). Folded stays the default, viewing writes
 * nothing, an unreadable value reads as folded and is left as it was, Showcase keeps it in the tab's session storage.
 */
test.use({viewport: {width: 390, height: 844}});
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
const rows = (page: Page) => page.getByRole('region', {name: 'Your Today widgets'}).locator('.placed-module[data-kind="widget"] .phone-fold-toggle');
async function seeded(page: Page, extra: Record<string, string> = {}) {
  await page.goto('/app/settings');
  const records = {...buildShowcase('2026-09-20').records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...extra};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, records);
  await page.goto('/app');
  await expect(rows(page).first()).toBeVisible();
}
const stored = (page: Page) => page.evaluate(key => localStorage.getItem(key), TODAY_FOLDS_KEY);

test('an opened row stays open after a reload, a closed one stays closed; viewing writes nothing', async ({page}) => {
  await seeded(page);
  expect(await stored(page)).toBeNull();
  const count = await rows(page).count();
  for (let i = 0; i < count; i++) await expect(rows(page).nth(i)).toHaveAttribute('aria-expanded', 'false');
  await page.reload(); await expect(rows(page).first()).toBeVisible();
  expect(await stored(page)).toBeNull();
  await rows(page).nth(1).click();
  await expect(rows(page).nth(1)).toHaveAttribute('aria-expanded', 'true');
  expect(JSON.parse((await stored(page))!)).toEqual({version: 1, open: {'preset-habits-health-1': true}});
  await page.reload();
  await expect(rows(page).nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expect(rows(page).nth(0)).toHaveAttribute('aria-expanded', 'false');
  await rows(page).nth(1).click();
  await expect(rows(page).nth(1)).toHaveAttribute('aria-expanded', 'false');
  await page.reload(); await expect(rows(page).first()).toBeVisible();
  await expect(rows(page).nth(1)).toHaveAttribute('aria-expanded', 'false');
  expect(JSON.parse((await stored(page))!)).toEqual({version: 1, open: {}});
});

test('an unreadable value reads as folded and is never rewritten by viewing; unknown ids are ignored', async ({page}) => {
  await seeded(page, {[TODAY_FOLDS_KEY]: '{"version":1,"open":{"preset-habits-health-0":"yes"}}'});
  for (let i = 0; i < await rows(page).count(); i++) await expect(rows(page).nth(i)).toHaveAttribute('aria-expanded', 'false');
  expect(await stored(page)).toBe('{"version":1,"open":{"preset-habits-health-0":"yes"}}');
  await seeded(page, {[TODAY_FOLDS_KEY]: JSON.stringify({version: 1, open: {'a-widget-that-is-gone': true, 'preset-habits-health-2': true}})});
  await expect(rows(page).nth(2)).toHaveAttribute('aria-expanded', 'true');
  await expect(rows(page).nth(0)).toHaveAttribute('aria-expanded', 'false');
});

test('Showcase keeps the remembered rows in the tab and never in this device\'s storage', async ({page}) => {
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(rows(page).first()).toBeVisible();
  await rows(page).first().click();
  await expect(rows(page).first()).toHaveAttribute('aria-expanded', 'true');
  await page.reload(); await expect(rows(page).first()).toHaveAttribute('aria-expanded', 'true');
  expect(await stored(page)).toBeNull();
  expect(await page.evaluate(key => Object.keys(sessionStorage).filter(k => k.endsWith(key)).length, TODAY_FOLDS_KEY)).toBe(1);
});

// Run11's packaged journey (CI, Session V) opened a row by clicking it on every visit; a row remembered open, then shown
// folded for a moment, closed under that click. A remembered row is open the first time it shows, after a reload and
// after moving between pages in the app. Rows are told apart by their widget id: before the person's layout loads,
// Today shows the default one for a moment, whose rows can carry the same names.
test('a remembered row is open the first time it shows: after a reload and after an in-app navigation', async ({page}) => {
  await page.addInitScript(() => {
    const seen: string[] = []; (window as unknown as {__rowStates: string[]}).__rowStates = seen;
    const note = (el: Element) => { if (el instanceof HTMLButtonElement && el.classList.contains('phone-fold-toggle')) seen.push(`${el.closest('.placed-module')?.getAttribute('data-module') ?? ''}=${el.getAttribute('aria-expanded')}`); };
    new MutationObserver(list => { for (const m of list) { if (m.type === 'attributes') note(m.target as Element); for (const n of m.addedNodes) if (n instanceof Element) { note(n); n.querySelectorAll('.phone-fold-toggle').forEach(note); } } })
      .observe(document, {subtree: true, childList: true, attributes: true, attributeFilter: ['aria-expanded']});
  });
  await seeded(page);
  const id = 'preset-habits-health-1', row = page.locator(`.placed-module[data-module="${id}"] .phone-fold-toggle`);
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  const states = () => page.evaluate(module => (window as unknown as {__rowStates: string[]}).__rowStates.filter(s => s.startsWith(`${module}=`)), id);
  await page.reload(); await expect(row).toHaveAttribute('aria-expanded', 'true');
  expect(await states()).toEqual([`${id}=true`]);
  await page.evaluate(() => { (window as unknown as {__rowStates: string[]}).__rowStates.length = 0; });
  await page.getByRole('link', {name: 'Habits', exact: true}).first().click();
  await expect(page).toHaveURL(/\/app\/habits$/);
  await page.getByRole('link', {name: 'Today', exact: true}).first().click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  expect(await states()).toEqual([`${id}=true`]);
  await expect(page.locator('.placed-module[data-module="preset-habits-health-0"] .phone-fold-toggle')).toHaveAttribute('aria-expanded', 'false');
});
