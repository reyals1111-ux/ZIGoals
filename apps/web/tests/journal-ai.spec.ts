import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {ENERGY_KEY} from '../lib/energy/schema';

/**
 * Session AI (feature 6, the journal and the daily energy): a few lines, today's energy, then ZIGi's one question made on
 * this device; the answer stays with the entry; Remove has Undo; the journal is private by default. Empty start, offline.
 */
const TODAY = '2026-10-28';
test.use({timezoneId: 'UTC'});
test.beforeEach(async ({page}) => {
  // The date is fixed and the clock then runs, so the page's short entrance settles before a tap.
  await page.clock.setSystemTime(new Date(`${TODAY}T19:00:00.000Z`));
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/manifest.webmanifest');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true})});
});
const stored = async <T,>(page: Page, key: string) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null') as T | null;

test('Journal: energy, an entry, ZIGi asks one question, the answer stays; private by default', async ({page}) => {
  await page.goto('/app/journal');
  await expect(page.getByRole('heading', {level: 1, name: 'Journal'})).toBeVisible();
  await page.getByRole('radio', {name: /^4 of 5/}).check();
  await expect.poll(async () => (await stored<{days: Record<string, {energy: number}>}>(page, ENERGY_KEY))?.days[TODAY]?.energy).toBe(4);
  await page.getByLabel('Today’s entry').fill('Tired after a long meeting at work.');
  await page.getByRole('button', {name: 'Save entry'}).click();
  const ask = page.getByRole('form', {name: "ZIGi's question"});
  await expect(ask).toContainText('ZIGi asks');
  await ask.getByLabel(/Your answer/).fill('Fewer meetings on Friday.');
  await ask.getByRole('button', {name: 'Save answer'}).click();
  const journal = await stored<{entries: {text: string; followUp?: {from: string; answer?: string}}[]; shareWithAi: boolean}>(page, JOURNAL_KEY);
  expect(journal?.shareWithAi).toBe(false);
  expect(journal?.entries).toMatchObject([{text: 'Tired after a long meeting at work.', followUp: {from: 'device', answer: 'Fewer meetings on Friday.'}}]);
  await page.getByRole('button', {name: `Remove the entry of ${TODAY}`}).click();
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect(page.locator('.journal-entries li')).toHaveCount(1);
});
test('Today has the journal card', async ({page}) => {
  // A For you card that waits behind "Show more" opens from its own link.
  await page.goto('/app#for-you-journal');
  await expect(page.getByRole('heading', {name: 'How was today?'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Open your journal'})).toBeVisible();
});
