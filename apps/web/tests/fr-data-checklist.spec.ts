import {expect, test} from '@playwright/test';
import {applyTheme, THEMES} from './p6-helpers';
import {CHECKLIST_DAYS_KEY} from '../lib/af-checklist-keys';
import {addFavourite} from '../lib/checklist/store';
import {emptyChecklist} from '../lib/checklist/schema';
import {ID, TITLE, seedChecklist, stored} from './checklist-fixtures';

/**
 * Friend-readiness (FR-MAX-1): Max ticks his habits on Habits, never on the planets. The Checklist keeps that day all the
 * same: the next day it is in the history (the flame counts it), as the same tick made on the path would be. Before the
 * fix `zigoals:checklist-days:v1` stayed empty all week. Fictional habit; three themes, at 390 (phone) and 1440.
 */
test.use({timezoneId: 'Europe/Brussels'});
const MON_EVENING = new Date('2026-11-23T20:00:00+01:00'), TUE_NOON = new Date('2026-11-24T12:00:00+01:00');
const path = () => addFavourite(emptyChecklist(), {kind: 'habit', habitId: ID.stretch}, {id: 'ck_fr-data-1', at: new Date('2026-11-20T08:00:00Z'), section: 'morning'});

for (const theme of THEMES) test(`${theme}: a day ticked on Habits is kept by the Checklist the next day`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: MON_EVENING});
  await seedChecklist(page, {path: path()});
  // Monday: the habit is ticked on its own page.
  await page.goto('/app/habits');
  const complete = page.getByRole('article', {name: TITLE.stretch, exact: true}).getByRole('button', {name: `Complete ${TITLE.stretch}`, exact: true});
  await complete.click();
  await expect(page.getByRole('article', {name: TITLE.stretch, exact: true}).getByRole('button', {name: `Undo completion for ${TITLE.stretch}`, exact: true})).toHaveAttribute('aria-pressed', 'true');
  expect(await stored(page, CHECKLIST_DAYS_KEY), 'nothing was ticked on the path').toBeNull();
  // Tuesday: the Checklist keeps Monday from the habit's own record, and the flame counts it.
  await page.clock.setSystemTime(TUE_NOON);
  await page.goto('/app/checklist');
  await expect(page.getByRole('heading', {level: 1, name: 'Your orbit'})).toBeVisible();
  await expect.poll(async () => (await stored<{days: Record<string, unknown>}>(page, CHECKLIST_DAYS_KEY))?.days).toEqual({'2026-11-23': {total: 1, done: 1}});
  await expect(page.locator('.checklist-streak')).toHaveAttribute('aria-label', /^1-day streak: /);
  await expect(page.locator('.checklist-progress-line')).toContainText('0 of 1 planet today');
});
