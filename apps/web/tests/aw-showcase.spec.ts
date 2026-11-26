import {expect, test, type Locator, type Page} from '@playwright/test';
import {applyTheme, axe, loadShowcase, offline, settle, THEMES} from './p6-helpers';

/**
 * Session AW (showcase; review lane2-b1 row 13, QUALITY.md "Not fixed"): the Showcase's labelled examples give the
 * features that sat on their empty teaching state real content — "your usual" mood and energy, Tasks' areas and week
 * objectives, finished tasks with planned and spent minutes, a timer running, chess results, prompt packs, a journal
 * photo (made in the Showcase's own media scope), a habit option and a budget near its limit — at 390 and 1440, in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Nothing here moves. The clock is Tuesday 17 November
 * 2026, 10:00 UTC (the corpus's day), fixed, so the timer stamped at the click reads 12 minutes. Today's Tab stops are
 * pinned by tests/ao/today-tab-stops.spec.ts and tests/at/today-tab-stops-week.spec.ts (the examples add none there).
 */
const serious = async (page: Page, scope: Locator) => (await axe(page, scope)).filter(v => v.impact === 'serious' || v.impact === 'critical');
const noSideways = async (page: Page) => {
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
};

for (const theme of THEMES) test(`${theme}: the Showcase's examples show real content, labelled`, async ({page, isMobile}) => {
  test.setTimeout(120_000);
  await applyTheme(page, theme);
  await offline(page);
  await page.clock.setFixedTime(new Date('2026-11-17T10:00:00.000Z'));
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await loadShowcase(page);

  // Today: the one money line names the budget near its limit (still one link).
  await settle(page);
  const money = page.getByRole('region', {name: 'Money that asks for a look'});
  await expect(money).toContainText('Fun near its limit');
  await expect(money.getByRole('link')).toHaveCount(1);

  // Health → Activity → How you felt: mood and energy against "your usual".
  await page.goto('/app/health?view=activity'); await settle(page);
  await page.getByText('How you felt, and week by week', {exact: true}).click();
  const felt = page.getByRole('region', {name: 'How you felt'});
  await expect(felt.getByText('Mood: Up', {exact: true})).toBeVisible();
  await expect(felt.getByText('Energy: About the same', {exact: true})).toBeVisible();
  await expect(felt).toContainText('(22 days answered)');
  expect(await serious(page, page.locator('.av2-feelings-fold'))).toEqual([]);

  // Tasks → This week: two objectives, each one task of two done.
  await page.goto('/app/tasks?view=week'); await settle(page);
  const objectives = page.getByRole('list', {name: 'Objectives this week'});
  await expect(objectives).toContainText('Example · Balcony ready for winter');
  await expect(objectives).toContainText('Example · Savings accounts sorted');
  await expect(objectives.getByText('1 of 2 tasks done')).toHaveCount(2);
  expect(await serious(page, objectives)).toEqual([]);

  // Tasks → Today: the example timer runs, twelve minutes of its twenty planned, with Stop.
  await page.goto('/app/tasks?view=today'); await settle(page);
  const timers = page.getByRole('list', {name: 'Timers running'});
  await expect(timers).toContainText('Example · Order bulbs for the balcony boxes · 12 min of 20 min planned');
  await expect(timers.getByRole('button', {name: 'Stop'})).toBeVisible();

  // Chess → Play: the results by level, said to be the Showcase's examples.
  await page.goto('/app/chess#play'); await settle(page);
  const game = page.locator('section.chess-computer');
  await expect(game).toContainText('Against Easy: 4 won · 1 lost · 1 drawn. Showcase: fictional example results.');

  // Journal: two prompt packs on, and today's walk with its example photo (a real image in this tab's Showcase scope).
  await page.goto('/app/journal'); await settle(page);
  const walk = page.locator('ol.journal-entries > li').filter({hasText: 'long walk before work'});
  const photo = walk.getByRole('img', {name: /^Your photo with the entry of /});
  await expect(photo).toBeVisible({timeout: 15_000});
  expect(await photo.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(320);
  expect(await serious(page, walk)).toEqual([]);
  await noSideways(page);
});
