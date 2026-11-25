import {expect, test, type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {BODY_EXTRAS_KEY} from '../lib/body-extras/schema';
import {SLEEP_GOAL_PERIOD_KEY} from '../lib/sleep/goal-period';
import {withHealthGroup, healthGroupIn} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import type {HealthData} from '../lib/health';
import {addLocalDays} from '../lib/local-date';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AW (X6; Happy Scale, Sleep as Android; LEDGER #456–#460), at 390 and 1440, in Nebula, Light and Dark, axe-clean,
 * no sideways scroll at 320. Fictional readings and nights; every /api call 503.
 * - Health → Weight: the trend card says this week against the week before (#458); "Notes and new lows in your
 *   weigh-ins" keeps a note by the weight's id, marks "lowest …" as a fact, filters, and downloads the CSV with the note
 *   (#457); "A day you name" keeps a day and shows the trend's estimate with its sum, called an estimate (#456). With
 *   "Hide calories and weight" on, every figure of the three is hidden and the new-lows filter is set aside.
 * - Health → Sleep: "Your sleep goal" over 14 days or 30 (the choice kept on this device, out of the sleep group) (#460);
 *   "Rename or remove a sleep tag" renames on every night with one Undo, and removes (#459).
 * Nothing here moves, so there is no motion to stop.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-20', AT = '2026-11-01T08:00:00.000Z';
// A steady −0.5 kg a week: a reading every other day for six weeks, ending today.
const weights = Array.from({length: 22}, (_, i) => { const date = addLocalDays(TODAY, -42 + i * 2); return {id: `health_fictional-${date}`, date, grams: Math.round(84_000 - i * 2 * 500 / 7), createdAt: AT, updatedAt: AT}; });
const seed = async (page: Page, theme: (typeof THEMES)[number], isMobile: boolean, health: unknown) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${TODAY}T10:00:00Z`)});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);
};
const weightTab = async (page: Page) => { await page.goto('/app/health'); await hydrated(page); await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Weight', exact: true}).click(); };
const serious = (v: {impact?: string | null}[]) => v.filter(x => x.impact === 'serious' || x.impact === 'critical');
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);

for (const theme of THEMES) test(`${theme}: this week against the last, notes and new lows, and a day you name`, async ({page, isMobile}) => {
  await seed(page, theme, isMobile, {...createEmptyHealth(), weights});
  await weightTab(page);
  // #458: the trend card's line (each week has 3 or 4 readings).
  await expect(page.locator('#health-weight-trend .health-trend-week')).toHaveText(/^This week \d+(\.\d)? kg on average \([34] weigh-ins\), \d(\.\d)? kg under the week before \(\d+(\.\d)? kg, [34] weigh-ins\)\.$/);

  // #457: a note by the weight's id, the new lows, the CSV.
  await page.locator('summary').filter({hasText: 'Notes and new lows in your weigh-ins'}).click();
  const notes = page.getByRole('region', {name: 'Notes and new lows'});
  await expect(notes.getByRole('list', {name: 'Weigh-ins'}).getByRole('listitem')).toHaveCount(22);
  await notes.getByRole('button', {name: 'Add a note for Nov 20, 2026'}).click();
  await notes.getByRole('textbox', {name: 'Note for Nov 20, 2026'}).fill('new scale');
  await notes.getByRole('button', {name: 'Save note'}).click();
  await expect(notes).toContainText('“new scale”');
  await expect(notes.getByRole('button', {name: 'Edit note for Nov 20, 2026'})).toBeFocused();
  expect((await stored(page, BODY_EXTRAS_KEY)).weighNotes).toEqual([{id: `health_fictional-${TODAY}`, note: 'new scale'}]);
  await notes.getByRole('button', {name: 'New lows'}).click();
  await expect(notes.locator('.x6-low').first()).toHaveText(/^lowest (of all your readings|since .+)$/);
  await notes.getByRole('button', {name: 'With a note'}).click();
  await expect(notes.getByRole('list', {name: 'Weigh-ins'}).getByRole('listitem')).toHaveCount(1);
  const [download] = await Promise.all([page.waitForEvent('download'), notes.getByRole('button', {name: 'Download weigh-ins with notes (CSV)'}).click()]);
  expect(download.suggestedFilename()).toBe('weigh-ins.csv');
  const csv = readFileSync((await download.path())!, 'utf8');
  expect(csv.split('\r\n')[0]).toBe('"date","kg","lb_converted","note","lowest_since"');
  expect(csv).toContain(`"${TODAY}",`); expect(csv).toContain('"new scale"');
  expect(serious(await axe(page, notes)), 'notes axe').toEqual([]);

  // #456: a named day, the estimate with its sum, called an estimate.
  await page.locator('summary').filter({hasText: 'A day you name'}).click();
  const named = page.getByRole('region', {name: 'A day you name'});
  await expect(named).toContainText('If the last 4 weeks’ pace continued; an estimate, not medical advice.');
  await named.getByRole('textbox', {name: 'Name of the day'}).fill('The wedding');
  await named.getByLabel('The day').fill('2026-12-18');
  await named.getByRole('button', {name: 'Keep this day'}).click();
  const item = named.getByRole('listitem').filter({hasText: 'The wedding'});
  await expect(item.locator('.x6-figure')).toHaveText(/^About \d+(\.\d)? kg$/);
  await expect(item.locator('.x6-sum')).toHaveText(/^\d+(\.\d)? kg now, −0\.5 kg a week, 4 weeks$/);
  await expect(item).toContainText('an estimate');
  expect((await stored(page, BODY_EXTRAS_KEY)).namedDays).toMatchObject([{name: 'The wedding', on: '2026-12-18'}]);
  expect(await named.innerText()).not.toMatch(/kcal|you will|guarantee|you should/i);
  expect(serious(await axe(page, named)), 'named axe').toEqual([]);

  // "Hide calories and weight": every figure of the three hidden, the new-lows filter set aside.
  await page.evaluate(() => { localStorage.setItem('zigoals:hide-body-figures', 'on'); window.dispatchEvent(new Event('zigoals-hide-body-figures')); });
  for (const loc of [page.locator('#health-weight-trend .health-trend-week'), item.locator('.x6-figure'), item.locator('.x6-sum'), notes.locator('.x6-figure').first()]) await expect(loc).toHaveCSS('visibility', 'hidden');
  await expect(notes.getByRole('button', {name: 'New lows'})).toHaveCount(0);
  await expect(notes).toContainText('New lows are hidden with your weight figures on this device.');
  await page.evaluate(() => { localStorage.removeItem('zigoals:hide-body-figures'); window.dispatchEvent(new Event('zigoals-hide-body-figures')); });

  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

const nights = Array.from({length: 20}, (_, i) => { const wake = addLocalDays(TODAY, -i), prev = addLocalDays(wake, -1);
  const tags = [...(i % 3 === 0 ? ['caffeine'] : []), ...(i % 4 === 1 ? ['screens'] : []), ...(i === 6 ? ['coffee'] : [])];
  return {id: `health_sleep-x6-fictional-${wake}`, kind: 'night', source: 'manual', start: `${prev}T${i % 2 ? '23:10' : '22:50'}:00.000Z`, end: `${wake}T06:50:00.000Z`, latencyMin: 15, awakeMin: 10, timeZone: 'UTC', ...(tags.length ? {tags} : {}), createdAt: AT, updatedAt: AT}; });
const goal = {minutes: 450, bedFrom: '22:30', bedTo: '23:00', updatedAt: AT};
const tagsOf = async (page: Page) => (healthGroupIn(await stored(page, HEALTH_STORAGE_KEY) as HealthData, 'sleep') as Sleep).nights.flatMap(n => n.tags ?? []);

for (const theme of THEMES) test(`${theme}: the sleep goal over 14 or 30 days, and a tag renamed on every night with one Undo`, async ({page, isMobile}) => {
  await seed(page, theme, isMobile, withHealthGroup(createEmptyHealth(), 'sleep', {version: 1, nights, goal} as Sleep, false));
  await page.goto('/app/health?view=sleep'); await hydrated(page);

  // #460
  const period = page.getByRole('region', {name: 'Your sleep goal over 14 days'});
  await expect(period.getByRole('button', {name: '14 days'})).toHaveAttribute('aria-pressed', 'true');
  // Even nights 7 h 35 min asleep (at or above the 7 h 30 min goal), odd ones 7 h 15 min; bedtimes 22:50 and 23:10.
  await expect(period).toContainText(/Nights at or above your goal\s*7 of 14 logged nights/);
  await expect(period).toContainText(/Nights in your bedtime window\s*7 of 14/);
  await expect(period).toContainText(/Bedtime, on average\s*11:00\s?PM, right at the end of your window \(11:00\s?PM\)/);
  await period.getByRole('button', {name: '30 days'}).click();
  const month = page.getByRole('region', {name: 'Your sleep goal over 30 days'});
  await expect(month).toContainText(/10 of 20 logged nights/);
  expect(await stored(page, SLEEP_GOAL_PERIOD_KEY)).toEqual({version: 1, days: 30});
  expect(JSON.stringify(healthGroupIn(await stored(page, HEALTH_STORAGE_KEY) as HealthData, 'sleep'))).not.toContain('"days"');
  expect(serious(await axe(page, month)), 'period axe').toEqual([]);

  // #459: rename caffeine onto coffee (the night with both keeps one), Undo, then remove screens.
  await page.locator('summary').filter({hasText: 'Rename or remove a sleep tag'}).click();
  const tags = page.getByRole('region', {name: 'Your sleep tags'});
  await expect(tags.getByRole('listitem').filter({hasText: 'caffeine'})).toContainText('7 nights');
  await tags.getByRole('button', {name: 'Rename caffeine'}).click();
  await tags.getByRole('textbox', {name: 'New name for “caffeine”'}).fill('coffee');
  await tags.getByRole('button', {name: 'Rename on every night'}).click();
  await expect.poll(async () => (await tagsOf(page)).filter(t => t === 'coffee').length).toBe(7);
  expect((await tagsOf(page)).includes('caffeine')).toBe(false);
  await page.getByRole('button', {name: /^Undo/}).click();
  await expect.poll(async () => (await tagsOf(page)).filter(t => t === 'caffeine').length).toBe(7);
  expect((await tagsOf(page)).filter(t => t === 'coffee').length).toBe(1);
  await tags.getByRole('button', {name: 'Remove screens'}).click();
  await tags.getByRole('button', {name: 'Remove from 5 nights'}).click();
  await expect.poll(async () => (await tagsOf(page)).includes('screens')).toBe(false);
  expect(serious(await axe(page, tags)), 'tags axe').toEqual([]);
  await expect(page.locator('.sleep-view')).not.toContainText(/you must|you should/i);

  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
