import {expect, test} from '@playwright/test';
import {guideOfTheDay} from '../lib/meditation/guides';
import {TODAY, health, healthRecord, openHealth} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #71, #77 — Headspace's Today's Meditation, Calm's daily): Health →
 * Meditation → "Today's practice": the day's written guide with its steps, "Another one", Dutch and English, and
 * "Begin" that starts the existing timer for the practice's minutes — at 390 and 1440, in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Text only; fictional data.
 */
for (const theme of THEMES) test(`${theme}: today's written practice, another one, then begin`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health()), '/app/health?view=meditation');
  await page.getByText('Today’s practice, a short written guide', {exact: true}).click();
  const g = guideOfTheDay(TODAY), next = guideOfTheDay(TODAY, 1);
  const title = page.locator('.meditation-today-title');
  await expect(title).toHaveText(g.en.title);
  await expect(page.locator('.meditation-today-steps li')).toHaveCount(g.en.steps.length);
  const findings = await axe(page, page.locator('details.meditation-today-fold', {hasText: 'Today’s practice, a short written guide'})); // (CI run 2007; deliberate) the class is shared by later Meditation folds: the practice's own fold, by its summary words
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const another = page.getByRole('button', {name: 'Another one'});
  await another.click();
  await expect(title).toHaveText(next.en.title);
  await expect(another).toBeFocused();
  await page.getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(title).toHaveText(next.nl.title);
  await expect(page.locator('.meditation-today')).toHaveAttribute('lang', 'nl');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', {name: `Begin · ${next.minutes} min with the bell`}).click();
  await expect(page.locator('.meditation-focus')).toBeVisible();
});
