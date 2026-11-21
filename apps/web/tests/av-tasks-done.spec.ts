import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-TASKS-DONE; Todoist): Completed shows tasks finished per day (14 days) and per week (4),
 * with the same figures as a table; before any is finished, a line says what will show — at 390 and 1440, three themes,
 * axe-clean, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: three tasks finished today show as today's bar, this week's count and the table`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-25T10:00:00+01:00')});
  await page.goto('/app/tasks?view=completed'); await settle(page);
  await expect(page.getByText('When you finish tasks, this view shows how many per day and per week')).toBeVisible();
  await page.goto('/app/tasks?view=all'); await settle(page);
  for (const t of ['Fictional errand one', 'Fictional errand two', 'Fictional errand three']) { await page.getByLabel('New task').first().fill(`${t} today`); await page.getByLabel('New task').first().press('Enter'); }
  // A finished task leaves the open list at once, so the tick is a click and the result is read below (as tasks-ai does).
  for (const t of ['one', 'two', 'three']) { const box = page.getByRole('checkbox', {name: `Mark “Fictional errand ${t}” done`}); await box.click(); await expect(box).toHaveCount(0); }
  await page.goto('/app/tasks?view=completed'); await settle(page);
  const chart = page.getByRole('region', {name: /^Finished per day/});
  await expect(chart).toContainText('3 in the last 14 days');
  await expect(chart.getByRole('list', {name: 'Finished per week'})).toContainText('This week 3');
  await chart.getByText('As a table').click();
  await expect(chart.getByRole('table')).toContainText('3 tasks');
  const findings = await axe(page, chart);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
