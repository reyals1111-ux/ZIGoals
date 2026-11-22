import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV lane 2 (r3-plan, LEDGER #262; Structured's Cycle Seasons, the days only): with the cycle log on and its "Show my
 * cycle day on the Day Timeline and the Agenda" chosen, the Day Timeline's all-day line says "Day 2 of your cycle · period
 * day (logged)" with the log's own line, and the Agenda's day and week list the cycle days; without the choice nothing
 * shows; never a phase or advice. At 390 and 1440 in Nebula, Light and Dark, axe-clean. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const cycle = (plan: boolean) => JSON.stringify({version: 1, on: true, ...(plan ? {plan: true} : {}), days: {'2026-11-22': {flow: 'medium'}, '2026-11-23': {flow: 'light'}}});
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: the cycle day on the Day Timeline and the Agenda, opt-in`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:cycle:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, cycle(false));
  await page.goto('/app/timeline'); await settle(page);
  await expect(page.locator('.cycle-on-plan')).toHaveCount(0);

  await page.evaluate(v => localStorage.setItem('zigoals:cycle:v1', v), cycle(true));
  await page.goto('/app/timeline'); await settle(page);
  const allDay = page.getByRole('region', {name: 'All day'});
  await expect(allDay).toContainText('Day 2 of your cycle · period day (logged).');
  await expect(allDay).toContainText('Information for you, not a contraceptive or a diagnosis.');
  await expect(allDay).not.toContainText(/phase|season|advice/i);
  await clean(page);
  // Tomorrow: day 3, no period logged.
  await page.getByRole('group', {name: 'Day to show'}).getByRole('button', {name: 'Tomorrow'}).click();
  await expect(allDay).toContainText('Day 3 of your cycle.');

  await page.goto('/app/agenda?view=week'); await settle(page);
  const agenda = page.getByRole('region', {name: 'Your cycle on these days'});
  await expect(agenda.getByRole('listitem').first()).toContainText(/Day \d+ of your cycle/);
  await expect(agenda).toContainText('Day 2 of your cycle · period day (logged)');
  await clean(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
