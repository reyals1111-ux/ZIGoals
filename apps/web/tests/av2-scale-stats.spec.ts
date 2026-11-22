import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {SCALES_KEY} from '../lib/scales/store';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #189, Daylio's scale statistics): Journal → Your own scales → "How your
 * scales went": a scale over 30, 90 or 365 days — days rated, average, lowest and highest, how often each level came,
 * and a dot per rated day named in words — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at
 * 320. Offline, fixed date, UTC; fictional ratings.
 */
const TODAY = '2026-11-04';
test.use({timezoneId: 'UTC'});
const record = {version: 1, scales: [{id: 'stress', name: 'Fictional stress', low: 'calm', high: 'very tense'}], days: {'2026-11-01': {stress: 2}, '2026-11-02': {stress: 4}, '2026-11-03': {stress: 2}, '2026-08-20': {stress: 5}}};
for (const theme of THEMES) test(`${theme}: a scale's statistics over 30 and 90 days`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${TODAY}T09:00:00.000Z`)});
  await offlineApi(page); await freshDevice(page);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SCALES_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/journal'); await hydrated(page);
  const section = page.locator('#your-scales');
  await section.locator('summary', {hasText: 'How your scales went'}).click();
  const stats = section.locator('.scale-stats');
  await expect(stats).toContainText('3 of 30 days rated · average 2.7 of 5 · lowest 2, highest 4 · most often 2 (2 of 5).');
  await expect(stats.getByRole('list', {name: 'How often each level came, last 30 days'}).getByRole('listitem').nth(3)).toContainText('2 days');
  await expect(stats.getByRole('img', {name: /^Fictional stress, each rated day from .+: .+ 2, .+ 4, .+ 2\.$/})).toBeVisible();
  const findings = await axe(page, stats);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const ninety = stats.getByRole('radio', {name: '90 days'});
  await ninety.check();
  await expect(ninety).toBeFocused();
  await expect(stats).toContainText('4 of 90 days rated · average 3.3 of 5 · lowest 2, highest 5');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
