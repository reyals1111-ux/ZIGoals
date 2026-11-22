import {expect, test} from '@playwright/test';
import {foldMarker, go, start} from './av2-polish-helpers';

/**
 * Session AV lane 2 (polish P-3, P-16): every fold shows that it opens. A summary laid out as a row (display: flex) had
 * lost the browser's marker and read as plain bold text; each now carries the journal's own ▸ (▾ while open), which never
 * moves, Motion Off or not. Measured from the computed `::before` of each summary, in the Showcase at 390 and 1440.
 */
test.use({timezoneId: 'Europe/Amsterdam'});

const PAGES: {path: string; folds: (string | RegExp)[]}[] = [
  {path: '/app/health?view=workouts', folds: ['Calendar', /^Suggest a workout for today/, /^Places and equipment/, /^Ready-made routines/, /^(Your shoes and their distance|Add your running shoes)/, /^This month beside the last/, 'Open the exercise library']},
  {path: '/app/habits', folds: [/^This week, Monday to Sunday/, /^Your areas this week/, /^Your notes and moods/, /^Habit journal timezone/]},
  {path: '/app/tasks', folds: ['Fit my day around the Agenda']},
  {path: '/app/wealth#spending', folds: [/^Search all your entries/]},
  {path: '/app/wealth?view=budgets', folds: [/^\d{4} in review/, /in short$/, /^Pay periods and fills/, 'Move money between budgets']},
  {path: '/app/health', folds: ['Name your meals and set their times', /^Import a nutrition CSV/]},
];

for (const width of [390, 1440]) test(`${width}: each listed fold carries the ▸ marker, ▾ once open`, async ({page}) => {
  test.setTimeout(120_000);
  await start(page, {width});
  for (const {path, folds} of PAGES) {
    await go(page, path);
    for (const name of folds) {
      const summary = page.locator('details > summary').filter({hasText: name}).first();
      await expect(summary, `${path}: ${String(name)}`).toBeAttached({timeout: 15_000});
      await summary.scrollIntoViewIfNeeded();
      await foldMarker(summary);
    }
    // One fold per page opened: the marker turns to ▾.
    const first = page.locator('details > summary').filter({hasText: folds[0]!}).first();
    await first.click();
    await expect(first.locator('xpath=..')).toHaveAttribute('open', '');
    await foldMarker(first, true);
  }
});

test('Motion Off: the marker is still', async ({page}) => {
  await start(page, {width: 390});
  await page.evaluate(() => localStorage.setItem('zigoals:motion:v1', 'off'));
  await go(page, '/app/habits');
  await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
  const summary = page.locator('details > summary').filter({hasText: /^This week, Monday to Sunday/}).first();
  await foldMarker(summary);
  await summary.click();
  await foldMarker(summary, true);
});
