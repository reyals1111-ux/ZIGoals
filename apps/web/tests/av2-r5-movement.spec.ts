import {expect, test} from '@playwright/test';
import {AT, health, healthRecord, openHealth} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AV lane 2, round 5 (gym; Gentler Streak, LEDGER #375): Health → Workouts → "Your movement band": six weeks of
 * walks give a usual range of 120–180 min a week (the lowest and highest set aside), this week's walk and gardening fill
 * it to 105 min so far, day by day, with the last 30 days as a table — at 390 and 1440, in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. No calorie figure. Fictional data (Saturday 14 Nov 2026).
 */
const walk = (i: number, date: string, minutes: number, name = 'Fictional walk') => ({id: `health_walk-r5-${String(i).padStart(4, '0')}`, date, name, steps: 0, minutes, createdAt: AT, updatedAt: AT});
const activity = [...[100, 120, 140, 160, 180, 200].map((m, i) => walk(i, addLocalDays('2026-11-09', -7 * (6 - i)), m)), walk(10, '2026-11-10', 60), walk(11, '2026-11-14', 45, 'Gardening')];
for (const theme of THEMES) test(`${theme}: the movement band`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, {...healthRecord(health({activity})), [WORKOUTS_KEY]: {version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90}}, '/app/health?view=workouts');
  const fold = page.locator('details.workouts-band-fold');
  await fold.locator('summary').click();
  const band = fold.locator('.r5-band');
  await expect(band).toContainText('This week so far: 105 min (0 min of workouts, 105 min of other movement).');
  await expect(band).toContainText('Below your usual range (120–180 min a week) so far; the week runs to Sunday.');
  await expect(band.getByRole('img')).toHaveAccessibleName(/Your usual range is 120 to 180 minutes a week\./);
  await expect(band.getByRole('list', {name: 'This week, day by day'}).getByRole('listitem')).toHaveCount(7);
  await expect(band).not.toContainText('kcal');
  await band.locator('details > summary', {hasText: 'The last 30 days'}).click();
  await expect(band.getByRole('table', {name: 'Movement minutes per day, the last 30 days'}).getByRole('row')).toHaveCount(31);

  const findings = await axe(page, band);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
