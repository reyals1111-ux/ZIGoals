import {expect, test} from '@playwright/test';
import {hydrated, loadShowcase} from './ah-helpers';
import {openHabitDetails} from './ab-shell';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #187, #190 — Loop's score chart, history and frequency charts): a habit's
 * Consistency & trends → "More history": the strength as a weekly line over the past year (named, with "As a table"),
 * days done by month, quarter or year, and each weekday's days done month by month — on the Showcase's Walk, at 390 and
 * 1440, in Nebula, Light and Dark, axe-clean, no sideways page scroll at 320 (the weekday table scrolls in its own
 * focusable frame).
 */
for (const theme of THEMES) test(`${theme}: a habit's longer history`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await loadShowcase(page);
  await page.goto('/app/habits'); await hydrated(page);
  const walk = page.getByRole('article', {name: 'Walk', exact: true});
  await openHabitDetails(walk);
  await walk.getByText('Consistency & trends', {exact: true}).click();
  await walk.locator('summary', {hasText: 'More history: strength over the year, months and weekdays'}).click();
  const history = walk.locator('.habit-longer');
  await expect(history.getByRole('img', {name: /^Strength at the end of each week, 0 to 100: \d+ weeks with a figure/})).toBeVisible();
  const totals = history.locator('.habit-longer-totals');
  await expect(totals.getByRole('columnheader', {name: 'Month'})).toBeVisible();
  const quarter = history.getByRole('radio', {name: 'By quarter'});
  await quarter.check();
  await expect(quarter).toBeFocused();
  await expect(totals.getByRole('columnheader', {name: 'Quarter'})).toBeVisible();
  await expect(totals.getByRole('row').nth(1).getByRole('rowheader')).toHaveText(/^Q[1-4] \d{4}$/);
  await expect(history.getByRole('region', {name: 'Days done on each weekday, month by month'})).toBeVisible();
  const findings = await axe(page, history);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
