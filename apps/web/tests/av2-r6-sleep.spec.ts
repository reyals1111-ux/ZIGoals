import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import {addLocalDays} from '../lib/local-date';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2, round 6 (r6-body; AutoSleep, LEDGER #419, #423): Health → Sleep → Tonight says "Bed by 23:00 for
 * your 7 h 30 min before your usual 06:45 wake, with your usual 15 min to fall asleep." from the goal and the last 14
 * nights; a wake time typed for tomorrow changes it on the page only (nothing stored); each night says "Asleep … of … in
 * bed (n %)" and the week its average; in the evening the Health page's Sleep card carries the bedtime line — at 390 and
 * 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional nights.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-20', AT = '2026-11-20T08:00:00.000Z';
const nights = Array.from({length: 10}, (_, i) => { const wake = addLocalDays(TODAY, -i), prev = addLocalDays(wake, -1);
  return {id: `health_sleep-r6-fictional-${wake}`, kind: 'night', source: 'manual', start: `${prev}T23:00:00.000Z`, end: `${wake}T${i % 2 ? '06:40' : '06:50'}:00.000Z`, latencyMin: 15, awakeMin: 20, timeZone: 'UTC', createdAt: AT, updatedAt: AT}; });
const goal = {minutes: 450, updatedAt: AT};

for (const theme of THEMES) test(`${theme}: tonight's bedtime and time asleep of time in bed`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${TODAY}T19:00:00Z`)});
  await page.goto('/app/settings'); await hydrated(page);
  const health = withHealthGroup(createEmptyHealth(), 'sleep', {version: 1, nights, goal} as Sleep, false);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);

  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const bed = page.getByRole('group', {name: 'Tonight’s bedtime'});
  await expect(bed).toContainText(/Bed by 11:00\s?PM for your 7 h 30 min before your usual 6:45\s?AM wake, with your usual 15 min to fall asleep\./);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  await bed.getByLabel('Waking at another time tomorrow? (tonight only)').fill('05:30');
  await expect(bed).toContainText(/Bed by 9:45\s?PM for your 7 h 30 min before your 5:30\s?AM wake/);
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
  await bed.getByRole('button', {name: 'Use my usual wake time'}).click();
  await expect(bed).toContainText(/before your usual 6:45\s?AM wake/);
  await expect(page.locator('.sleep-recent')).toContainText(/Asleep 7 h \d\d min of 7 h \d\d min in bed \(\d+ %\)/);
  await expect(page.locator('.sleep-week')).toContainText(/Asleep of time in bed, a night on average: 7 h \d\d min of 7 h \d\d min \(\d+ %\)\./);
  await expect(page.locator('.sleep-view')).not.toContainText(/you must|you should/i);
  const findings = await axe(page, page.locator('.sleep-tonight-panel'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);

  await page.goto('/app/health'); await hydrated(page);
  const fold = page.locator('.phone-fold-toggle').filter({has: page.getByText('Sleep', {exact: true})});
  if (await fold.count()) await fold.first().click();
  await expect(page.locator('.sleep-card')).toContainText(/Tonight: Bed by 11:00\s?PM/);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
