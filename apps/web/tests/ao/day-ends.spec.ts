import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../ah-helpers';
import {HABITS_KEY} from '../../lib/habits';
import {DAY_ENDS_KEY} from '../../lib/day-boundary';
import {quietPage} from '../quiet-page';

/**
 * Session AO (C-DVG-22, C-NB-28, N-NB-11; owner rule 1, ADR-039): "My day ends at". The time of day is a test condition
 * (Playwright's clock); each habit made records the day it was made for (its start date), which is the day the app counts
 * as today at that moment. midnight → 03:00 → midnight in Brussels and Tokyo: today never steps back, the day in
 * progress keeps the later end, and nothing made before a change moves.
 */
const startDates = (page: Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{"habits":[]}') as {habits: {title: string; startDate: string}[]}).habits.map(h => [h.title, h.startDate]), HABITS_KEY);
async function newHabit(page: Page, title: string) {
  await page.goto('/app/habits'); await hydrated(page);
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
}
async function chooseEnd(page: Page, label: string) {
  await page.goto('/app/settings#day-ends'); await hydrated(page);
  const section = page.locator('#day-ends');
  await expect(section).toContainText('Changing it never moves or recounts past days');
  await section.getByLabel('My day ends at').selectOption({label});
  await expect(section.getByRole('status')).toHaveText(label.startsWith('Midnight') ? 'Your day ends at midnight.' : `Your day now ends at ${label}.`);
  // Settings' jump to #day-ends keeps the target in place for a moment; the next page opens once nothing is loading.
  await quietPage(page);
}
const ZONES = [{zone: 'Europe/Brussels', offset: 1}, {zone: 'Asia/Tokyo', offset: 9}];
const utc = (localIso: string, offset: number) => new Date(Date.parse(`${localIso}Z`) - offset * 3_600_000);

for (const {zone, offset} of ZONES) test.describe(`in ${zone}`, () => {
  test.use({timezoneId: zone});
  test('midnight → 03:00 → midnight: the day counts until 03:00, never steps back, and the change alone moves nothing made before it', async ({page}, info) => {
    test.skip(info.project.name !== 'desktop', 'one project is enough for the clock walk (the setting is the same on a phone)');
    await page.clock.install({time: utc('2026-11-13T23:30:00', offset)});
    await offlineApi(page); await freshDevice(page);
    await newHabit(page, 'AO before any change');            // 23:30 on the 13th, midnight rule
    await page.clock.setSystemTime(utc('2026-11-14T01:00:00', offset));
    await chooseEnd(page, '3:00');                            // the change at 01:00 on the 14th
    await newHabit(page, 'AO right after choosing 3:00');     // today was the 14th: it stays the 14th (no step back)
    await page.clock.setSystemTime(utc('2026-11-15T02:30:00', offset));
    await newHabit(page, 'AO at 02:30 the next night');       // the new rule: still the 14th until 03:00
    await page.clock.setSystemTime(utc('2026-11-15T03:05:00', offset));
    await newHabit(page, 'AO at 03:05');
    await page.clock.setSystemTime(utc('2026-11-16T02:00:00', offset));
    await chooseEnd(page, 'Midnight (default)');              // 03:00 → midnight at 02:00: the 15th keeps its 03:00 end
    await newHabit(page, 'AO right after midnight again');
    await page.clock.setSystemTime(utc('2026-11-16T03:01:00', offset));
    await newHabit(page, 'AO after 03:00');
    expect(await startDates(page)).toEqual([
      ['AO before any change', '2026-11-13'], ['AO right after choosing 3:00', '2026-11-14'], ['AO at 02:30 the next night', '2026-11-14'],
      ['AO at 03:05', '2026-11-15'], ['AO right after midnight again', '2026-11-15'], ['AO after 03:00', '2026-11-16'],
    ]);
    expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), DAY_ENDS_KEY))!)).toMatchObject({version: 1, endsAt: 0, change: {from: 180}});
  });
});

test.describe('over a daylight-saving night (Brussels, 25 Oct 2026: 03:00 CEST falls back to 02:00 CET)', () => {
  test.use({timezoneId: 'Europe/Brussels'});
  test('choosing 3:00 at 01:30 CEST: the 25th stays the 25th through the repeated hour, and the next night counts until 03:00 CET', async ({page}, info) => {
    test.skip(info.project.name !== 'desktop', 'one project is enough for the clock walk');
    await page.clock.install({time: new Date('2026-10-24T23:30:00Z')}); // 01:30 CEST on the 25th
    await offlineApi(page); await freshDevice(page);
    await chooseEnd(page, '3:00');
    await page.clock.setSystemTime(new Date('2026-10-25T01:30:00Z')); // 02:30 CET, the repeated hour
    await newHabit(page, 'AO in the repeated hour');
    await page.clock.setSystemTime(new Date('2026-10-26T01:30:00Z')); // 02:30 CET on the 26th: still the 25th
    await newHabit(page, 'AO at 02:30 the next night');
    await page.clock.setSystemTime(new Date('2026-10-26T02:00:00Z')); // 03:00 CET on the 26th
    await newHabit(page, 'AO at 03:00 on the 26th');
    expect(await startDates(page)).toEqual([['AO in the repeated hour', '2026-10-25'], ['AO at 02:30 the next night', '2026-10-25'], ['AO at 03:00 on the 26th', '2026-10-26']]);
  });
});

test('the setting: seven choices from midnight to 6:00, midnight by default, and the rule said under it', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/settings#day-ends'); await hydrated(page);
  const select = page.locator('#day-ends').getByLabel('My day ends at');
  await expect(select.locator('option')).toHaveText(['Midnight (default)', '1:00', '2:00', '3:00', '4:00', '5:00', '6:00']);
  await expect(select).toHaveValue('0');
  expect(await select.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('#day-ends')).toContainText('so the change alone never breaks a streak');
  expect(await page.evaluate(k => localStorage.getItem(k), DAY_ENDS_KEY)).toBeNull(); // viewing writes nothing
});
