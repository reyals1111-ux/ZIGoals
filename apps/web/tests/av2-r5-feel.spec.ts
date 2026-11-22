import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {showcaseWorkouts} from '../lib/workouts/showcase';

/**
 * Session AV lane 2, round 5 (gym; Gentler Streak, LEDGER #372): Health → Workouts → "Suggest a workout for today" asks
 * "How do you feel today?". Sore makes the 60-minute suggestion three exercises of two sets with the lighter words; Tired
 * keeps one exercise fewer; on either day "Or start an easy walk instead" starts a walk — at 390 and 1440, in Nebula,
 * Light and Dark, axe-clean, no sideways scroll at 320. Nothing is stored for the feeling. Fictional data; /api 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: how I feel shapes today's suggestion`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(showcaseWorkouts('2026-11-22'))] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const start = page.getByRole('region', {name: 'Start a workout'});
  await start.locator('details.workouts-suggest-fold > summary').click();
  const suggest = start.locator('.av2-suggest');
  const feel = suggest.getByRole('group', {name: 'How do you feel today?'});
  await expect(feel.getByRole('radio')).toHaveCount(4);
  await suggest.getByRole('radio', {name: '60 minutes'}).check();
  const items = suggest.locator('.av2-suggest-list > li');
  await expect(items).toHaveCount(6);
  const before = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort()));

  await feel.getByRole('radio', {name: 'Sore'}).check();
  await expect(suggest).toContainText('A lighter day: three exercises, two sets each, about 10 % less weight.');
  await expect(items).toHaveCount(3);
  for (const line of await suggest.locator('.av2-suggest-sets').allTextContents()) expect(line.split(' · ')).toHaveLength(2);
  await feel.getByRole('radio', {name: 'Tired'}).check();
  await expect(suggest).toContainText('An easier day: fewer sets and one exercise fewer');
  await expect(items).toHaveCount(5);
  await feel.getByRole('radio', {name: 'Fresh'}).check();
  await expect(items).toHaveCount(6);
  await expect(suggest.getByRole('button', {name: 'Or start an easy walk instead'})).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort()))).toBe(before);

  const findings = await axe(page, suggest);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await feel.getByRole('radio', {name: 'Tired'}).check();
  await suggest.getByRole('button', {name: 'Or start an easy walk instead'}).click();
  const now = page.locator('#workout-now');
  await expect(now.getByLabel('Workout in progress')).toHaveValue('Easy walk');
  await expect(now).toContainText('Walking');
});
