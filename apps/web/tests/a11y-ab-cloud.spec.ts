import {expect, test, type Locator, type Page} from '@playwright/test';
import {audit} from './a11y-audit';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {buildEverythingZip, collectEverything} from '../lib/export/everything';
import {POINT_TELL_KEY} from '../lib/ab-cloud-device-keys';

/**
 * Session AB-Cloud Gate B (ADR-023): WCAG 2.2 AA on this session's new surfaces, with the suite's own audit (names,
 * labels, ids, ARIA references, nesting) plus what a browser can decide: keyboard reach, focus into and back from the
 * dialogs, 44 px targets (2.5.8 asks 24; the app's rule is 44), reflow at 320 px without sideways scrolling. The extras
 * switch needs a signed-in account and is covered by the integration rehearsals; the restore section's empty state and
 * the Your data page are in a11y-wcag-x.spec.ts.
 */
test.use({timezoneId: 'Europe/Brussels'});
const DAY = '2026-10-14', NOW = new Date(`${DAY}T08:00:00.000Z`);
const {records} = buildShowcase(DAY, 'Europe/Brussels', {aa: true});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: NOW});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
});
/** Visible controls under `scope` smaller than 44 × 44 px (a checkbox counts by its label). */
const small = (scope: Locator) => scope.evaluate(root => [...root.querySelectorAll('button, a[href], select, textarea, input:not([type=checkbox]):not([type=radio]), label.checkbox')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44); }).map(el => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`));
const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('Restore from a backup: the preview is named, labelled, reachable by keyboard, 44 px, and reflows at 320 px', async ({page}) => {
  const zip = buildEverythingZip(collectEverything(records, {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null}), {date: DAY, showcase: false, now: NOW});
  await page.goto('/app/settings/data');
  const region = page.getByRole('region', {name: 'Restore from a backup'});
  await region.getByLabel('Export everything ZIP').setInputFiles({name: `zigoals-export-${DAY}.zip`, mimeType: 'application/zip', buffer: Buffer.from(zip.bytes)});
  const preview = region.getByLabel('What this backup holds');
  await expect(preview).toBeVisible();
  expect(await audit(region)).toEqual([]);
  expect(await small(region)).toEqual([]);
  // Every choice is a named select inside a group with a legend; the confirmation and the action follow in order.
  const selects = preview.getByRole('combobox');
  expect(await selects.count()).toBeGreaterThan(5);
  for (const legend of ['Goals and Wealth', 'Habits', 'Health']) await expect(preview.getByRole('group', {name: legend})).toBeVisible();
  await selects.first().focus();
  await page.keyboard.press('Tab');
  await expect(selects.nth(1)).toBeFocused();
  await page.setViewportSize({width: 320, height: 800});
  await expect(preview).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('Point & tell: dialogs take focus and give it back, every control is named and 44 px, the list reflows at 320 px', async ({page}) => {
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, enabled: true, pins: [{id: 'pin-aaaaaaaa', n: 1, path: '/app/goals', target: 'Your goals', note: 'A longer note that wraps on a narrow phone screen without pushing the page sideways at all.', at: '2026-10-14T08:00:00.000Z'}]})), POINT_TELL_KEY);
  await page.goto('/app/goals');
  const tell = page.locator('[data-point-tell]');
  const launcher = page.getByRole('button', {name: 'Point & tell: pick a part of this page to comment on'});
  await expect(launcher).toBeVisible();
  expect(await audit(tell)).toEqual([]);
  await page.getByRole('button', {name: 'Your Point & tell notes (1)'}).click();
  const list = page.getByRole('dialog', {name: 'Your Point & tell notes'});
  await expect(list.getByRole('heading', {name: 'Your Point & tell notes'})).toBeFocused();
  expect(await audit(tell)).toEqual([]);
  expect(await small(list)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(list).toHaveCount(0);
  await expect(launcher).toBeFocused();
  // The note sheet, by keyboard alone: the launcher, a focused part, Enter; the field has focus; Esc returns to the launcher.
  await launcher.press('Enter');
  await page.locator('main h1').first().evaluate(el => { el.setAttribute('tabindex', '-1'); (el as HTMLElement).focus(); });
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', {name: /^Note on /});
  await expect(sheet.getByLabel('Your note')).toBeFocused();
  expect(await audit(tell)).toEqual([]);
  expect(await small(sheet)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(launcher).toBeFocused();
  await page.setViewportSize({width: 320, height: 800});
  await page.getByRole('button', {name: 'Your Point & tell notes (1)'}).click();
  await expect(list).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  const box = (await list.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(320);
});

test('Vitamins on the food form and in the micronutrient view: named fields and bars, 44 px edit buttons', async ({page}) => {
  await page.evaluate(values => { for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, records);
  await page.goto('/app/health');
  await page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name: 'Targets', exact: true}).click();
  const vitamins = page.getByRole('region', {name: 'Micronutrients'}).locator('[data-region="vitamins"]');
  await expect(vitamins.getByRole('progressbar').first()).toBeVisible();
  expect(await audit(vitamins)).toEqual([]);
  expect(await small(vitamins)).toEqual([]);
  await page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name: 'Foods & recipes', exact: true}).click();
  await page.getByRole('button', {name: /^Edit food /}).first().click();
  const fields = page.getByRole('group', {name: 'Vitamins (optional)'});
  await expect(fields).toBeVisible();
  expect(await audit(fields)).toEqual([]);
  expect(await fields.getByRole('textbox').count()).toBe(7);
});
