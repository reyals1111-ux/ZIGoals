import {expect, test, type Page} from '@playwright/test';
import {hydrated} from './ah-helpers';

/**
 * Session AS (ADR-042 Part 1, the owner's two findings of 17 Nov on the Showcase): NOVA answers the question asked.
 * - "how many habits did I miss this week" showed the list of all seven habits. It now says how many were missed (none
 *   on that day), with the check-ins behind it and what is still open today, and shows the ranked miss bars.
 * - "wgat days did i forget to meditate this month" showed the month's minutes. It now names the two days (both marked
 *   as skipped, never counted as missed) and lights exactly those two days on the month calendar.
 * The same sentences are pinned by the corpus (apps/web/lib/ai/evals/as) for the same day. Fictional data only.
 */
test.skip(({isMobile}) => isMobile, 'computer layout: runs in the desktop project (a phone answers in the same words, pinned by the corpus)');
test.use({timezoneId: 'UTC', viewport: {width: 1440, height: 900}});
const DAY = new Date('2026-11-17T19:00:00.000Z');
const frame = (page: Page) => page.locator('.nova-frame'), field = (page: Page) => page.locator('.nova-command input'), answer = (page: Page) => page.locator('.ns-answer');
const widget = (page: Page, id: string) => page.locator(`.nova-stage-area .nova-widget[data-widget="${id}"]`);
async function showcaseNova(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.clock.install({time: DAY});
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/app/settings'); await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/nova'); await hydrated(page);
  await expect(frame(page)).toHaveAttribute('data-opening', 'done', {timeout: 15_000});
  await expect(field(page)).toBeVisible();
}
async function ask(page: Page, words: string) { await field(page).fill(words); await field(page).press('Enter'); }

test('"how many habits did I miss this week": the count of missed habits, not the list of habits', async ({page}) => {
  await showcaseNova(page);
  await ask(page, 'how many habits did I miss this week');
  await expect(answer(page)).toContainText('You missed no habit this week (Mon, Nov 16 to Tue, Nov 17): 11 of 11 due check-ins done. Still open today: Exercise, Meditate and Drink water.');
  await expect(answer(page)).toContainText('Answered on this device · no AI used');
  // The answer's own widget: misses per habit, ranked. With nothing missed it says so; it never ranks a habit that was not missed.
  const bars = widget(page, 'habit-misses');
  await expect(bars).toBeVisible();
  await expect(bars.locator('.ax-rank')).toHaveCount(0);
  await expect(bars.locator('.ax-figure, .ax-head')).toContainText('0');
  await expect(bars).toContainText('of 7');
  await expect(bars).toContainText('habits missed');
  await expect(bars).toContainText('Every due day was done');
  await expect(bars.locator('.ax-chips')).toHaveText(/Still open today\s*Exercise\s*Meditate\s*Drink water/);
  await expect(bars).toContainText('Your habits'); // its source
  // The old answer's widget (the list of all habits) is not what was made.
  await expect(widget(page, 'habits')).toHaveCount(0);
});

test('"wgat days did i forget to meditate this month": the two days, lit on the month calendar; not the month\'s minutes', async ({page}) => {
  await showcaseNova(page);
  await ask(page, 'wgat days did i forget to meditate this month');
  await expect(answer(page)).toContainText('Meditate: not done on 2 days this month (Sun, Nov 1 to Tue, Nov 17): Tue, Nov 3 and Thu, Nov 12. Both were marked as skipped. Today is still open.');
  await expect(answer(page)).not.toContainText('minutes');
  const calendar = widget(page, 'habit-missed-days');
  await expect(calendar).toBeVisible();
  // Exactly the two days are lit, each as a skipped day (a dashed ring: marked so by the person, never counted as missed).
  const lit = calendar.locator('.ax-cal-cell[data-lit]');
  await expect(lit).toHaveCount(2);
  expect(await lit.evaluateAll(cells => cells.map(c => `${c.textContent}:${(c as HTMLElement).dataset.state}`))).toEqual(['3:skipped', '12:skipped']);
  // Today (the 17th) is ringed and, still open, not lit; the days after it are outside the period.
  await expect(calendar.locator('.ax-cal-cell[data-today]')).toHaveText('17');
  await expect(calendar.locator('.ax-cal-cell[data-today][data-lit]')).toHaveCount(0);
  // The same days in words for a screen reader (the drawing is decoration).
  await expect(calendar.locator('table')).toContainText('Skipped (marked so; not counted as missed)2 days: Nov 3, Nov 12');
  await expect(calendar.locator('table')).toContainText('Missed (a due day not done)None');
  await expect(calendar.locator('table')).toContainText('TodayStill open');
});
