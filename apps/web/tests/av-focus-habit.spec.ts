import {expect, test} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY} from '../lib/habits';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-FOCUS-HABIT; Finch's Goal of the Day): a habit's options menu makes it today's focus;
 * its card says "Today's focus" and Today says "★ Today's focus: … · still open"; the next day nothing is focused — at
 * 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-10T08:00:00+01:00'), NOW = new Date('2026-11-23T08:00:00+01:00');
for (const theme of THEMES) test(`${theme}: the walk as today's focus, on its card and on Today`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = emptyHabitData();
  for (const [i, title] of ['Fictional walk', 'Fictional reading'].entries()) d = createHabit(d, {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, `aaaaaaaa-0000-4000-8000-00000000000${i + 1}`);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-23'); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);
  const walk = page.getByRole('article', {name: 'Fictional walk', exact: true});
  await walk.getByRole('button', {name: 'Options for Fictional walk', exact: true}).click();
  await walk.getByRole('menuitem', {name: 'Make it today’s focus', exact: true}).click();
  // Deliberate change (q4 #24): the badge is a line of its own with its own mark (◎), not "· ★" after the eyebrow (the
  // card's ☆ is the Checklist's star). As strict: the exact text, and one line only.
  await expect(walk.locator('.habit-focus-badge')).toHaveText('◎ Today’s focus');
  expect(await walk.locator('.habit-focus-badge').evaluate(el => el.getBoundingClientRect().height < parseFloat(getComputedStyle(el).fontSize) * 2.2)).toBe(true);
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:habit-extras:v1') ?? 'null')?.focus);
  expect(kept).toEqual({date: '2026-11-23', habitId: 'aaaaaaaa-0000-4000-8000-000000000001'});
  await page.goto('/app'); await hydrated(page);
  const line = page.getByRole('region', {name: 'Today\'s focus habit'});
  await expect(line).toHaveText('◎ Today’s focus: Fictional walk · still open →'); // q4 #24 (deliberate): the focus mark, as on the card
  await expect(line.getByRole('link')).toHaveAttribute('href', '/app/habits?habit=aaaaaaaa-0000-4000-8000-000000000001');
  const findings = await axe(page, line);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  // The next day nothing is focused.
  await page.clock.setSystemTime(new Date('2026-11-24T08:00:00+01:00'));
  await page.reload(); await hydrated(page);
  await expect(page.getByRole('region', {name: 'Today\'s focus habit'})).toHaveCount(0);
});
