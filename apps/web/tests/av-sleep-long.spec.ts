import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-SLEEP-LONG; Sleep Cycle's long-range trends): Health → Sleep → Over time at "90 days"
 * shows the weeks' average time asleep and at "1 year" the months', with the whole range's average and a table — at 390
 * and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional nights; every /api call 503.
 */
test.use({timezoneId: 'UTC'});
const AT = '2026-11-20T10:00:00.000Z';
const day = (n: number) => new Date(Date.parse('2026-11-23T12:00:00Z') - n * 86_400_000).toISOString().slice(0, 10);
// Eight hours a night for the last 20 nights, seven hours on nights 60 to 79: 40 nights in all.
const night = (d: string, hours: number) => { const prev = new Date(Date.parse(`${d}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10); return {id: `health_sleep-fictional-${d}`, kind: 'night', source: 'manual', start: hours === 8 ? `${prev}T23:00:00.000Z` : `${d}T00:00:00.000Z`, end: `${d}T07:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT}; };
const nights = [...Array.from({length: 20}, (_, i) => night(day(i), 8)), ...Array.from({length: 20}, (_, i) => night(day(60 + i), 7))];
for (const theme of THEMES) test(`${theme}: 90 days by week, then a year by month`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T12:00:00Z')});
  const health = withHealthGroup(createEmptyHealth(), 'sleep', {version: 1, nights, goal: {minutes: 480, updatedAt: AT}} as Sleep, false);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const charts = page.getByRole('region', {name: 'Over time'});
  await charts.getByRole('group', {name: 'Range'}).getByRole('button', {name: '90 days'}).click();
  const long = charts.locator('.sleep-long-chart');
  await expect(long.locator('figcaption')).toHaveText('Time asleep · last 90 days, average a night by week');
  await expect(long).toContainText('On average 7 h 30 min a night over the 40 nights logged.');
  await long.getByText('Show as a table').click();
  await expect(long.getByRole('row').nth(1)).toContainText('8 h');
  const findings = await axe(page, long);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await charts.getByRole('group', {name: 'Range'}).getByRole('button', {name: '1 year'}).click();
  await expect(long.locator('figcaption')).toHaveText('Time asleep · last 12 months, average a night');
  await expect(long.getByRole('img')).toHaveAttribute('aria-label', /^Average time asleep, a year, by month: 7 h 30 min a night over the 40 nights logged; goal 8 h 00 min\.$/);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
