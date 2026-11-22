import {expect, test} from '@playwright/test';
import {createHabit, emptyHabitData, logHabitValue, HABITS_KEY} from '../lib/habits';
import {addLocalDays} from '../lib/local-date';
import {hydrated} from './ah-helpers';
import {openHabitDetails} from './ab-shell';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-TWO-DAY; Streaks' 2-day rule): a habit's "Consistency & trends" says "Never missed
 * twice: 21 days" beside a 4-day streak when one day was missed — the streak itself unchanged — at 390 and 1440, in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-01T08:00:00+01:00'), NOW = new Date('2026-11-23T08:00:00+01:00'), ID = 'aaaaaaaa-0000-4000-8000-000000000001';
for (const theme of THEMES) test(`${theme}: one missed day keeps "never missed twice"; the streak starts again`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = createHabit(emptyHabitData(), {title: 'Fictional walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, ID);
  for (let day = '2026-11-01'; day < '2026-11-23'; day = addLocalDays(day, 1)) if (day !== '2026-11-18') d = logHabitValue(d, ID, day, 1, {}, NOW);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);
  const walk = page.getByRole('article', {name: 'Fictional walk', exact: true});
  await openHabitDetails(walk);
  await walk.getByText('Consistency & trends', {exact: true}).click();
  const streak = walk.locator('.habit-metrics > div').filter({hasText: 'Current streak'});
  await expect(streak.locator('strong')).toContainText('4 days');
  await expect(streak.locator('.habit-streak-two')).toHaveText('Never missed twice: 21 days');
  const findings = await axe(page, walk.locator('.habit-metrics'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
