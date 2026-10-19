import {expect, test} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../lib/af-checklist-keys';

/**
 * Session AF (the lead, after CI's guide.spec "viewing writes nothing" failed by a race): with nothing on the path, looking
 * at Today's Checklist card or the Checklist itself stores no Checklist record at all — the day record is written only
 * when there is something to keep (a tick, a custom item, a nudge shown, a day to seal into the history).
 */
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('an empty path: viewing Today and the Checklist writes no Checklist record', async ({page}) => {
  const {records} = buildShowcase('2026-10-19');
  await page.goto('/app/settings');
  await page.evaluate(values => { sessionStorage.clear(); localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true})});
  const keys = () => page.evaluate(([a, b]) => [a, b].filter(k => localStorage.getItem(k!) !== null), [CHECKLIST_KEY, CHECKLIST_DAYS_KEY]);
  await page.goto('/app');
  await expect(page.locator('.today-checklist-card .today-checklist-title')).toHaveText('Your day as a path of planets');
  await page.waitForTimeout(1500);
  expect(await keys()).toEqual([]);
  await page.goto('/app/checklist');
  await expect(page.getByRole('heading', {level: 1, name: 'Your orbit'})).toBeVisible();
  await page.waitForTimeout(1500);
  expect(await keys()).toEqual([]);
});
