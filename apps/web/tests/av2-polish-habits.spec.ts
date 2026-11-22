import {expect, test} from '@playwright/test';
import {go, noSideways, start} from './av2-polish-helpers';

/**
 * Session AV lane 2 (polish), Habits:
 * - P-28: every area chip is outlined (only the chosen one looked like a button).
 * - P-29: a step with its unit ("+1,000 steps") is set like Done beside it (14 px), not at 22 px.
 * - P-31: a fresh device's "Today's rhythm" says "No habits yet", not "0 / 0 scheduled habits complete".
 */
test.use({timezoneId: 'Europe/Amsterdam'});

test('Showcase: outlined chips, one type size in a completion row', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/habits');
  const chips = page.getByRole('group', {name: 'Filter by area'}).getByRole('button');
  await expect(chips.nth(1)).toBeVisible({timeout: 15_000});
  for (const width of await chips.evaluateAll(els => els.map(e => parseFloat(getComputedStyle(e).borderTopWidth)))) expect(width).toBeGreaterThanOrEqual(1);
  const amounts = page.locator('.habit-check-actions .habit-step-amount');
  await expect(amounts.first()).toBeAttached();
  for (const size of await amounts.evaluateAll(els => els.map(e => parseFloat(getComputedStyle(e).fontSize)))) expect(size).toBe(14);
  await noSideways(page);
});

test('a fresh device: Today\'s rhythm says there is no habit yet', async ({page}) => {
  await start(page, {width: 390, showcase: false});
  await go(page, '/app/habits');
  const overview = page.getByRole('region', {name: 'Today’s habit progress'});
  await expect(overview).toBeVisible({timeout: 15_000});
  await expect(overview).toContainText('No habits yet');
  await expect(overview).not.toContainText('scheduled habits complete');
});
