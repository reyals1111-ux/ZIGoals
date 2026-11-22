import {expect, test, type Page} from '@playwright/test';
import {at, DAY1, DAY2, freshWeek, hydrated, openAt, setup, ZONE} from './au-helpers';
import {quietPage} from '../quiet-page';

/**
 * Session AU (ADR-044, the friends dress rehearsal): Max on his phone, in the Dark theme. A night owl: his day ends at
 * 03:00, so at 01:30 on Tuesday it is still Monday for him. In the rehearsal Today said "0 of 2 habits" beside the
 * Checklist's count, and Monday's tasks were already "Overdue" at 01:30 (the Max reviewer: Blockers). Now:
 * - F-4: Today's line counts habits on his day (as Habits and the Checklist do);
 * - F-5: Tasks follow "My day ends at": Monday's task is still today's at 01:30, and not overdue until 03:00.
 * Phone only (the mobile project); named webkit-au-* so CI's WebKit job runs it on an iPhone profile too.
 */
test.skip(({isMobile}) => !isMobile, 'the phone part of Max\'s week (his desktop part is tests/au/max.spec.ts)');
test.use({timezoneId: ZONE, actionTimeout: 15_000});

async function newHabit(page: Page, title: string) {
  await page.goto('/app/habits'); await hydrated(page);
  await page.getByRole('button', {name: /^(\+ New habit|Create a habit)$/}).first().click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
}
const TASK = 'Fictional library book back';

test('Max after midnight on the phone: Today\'s habit count and Tasks follow his 03:00 day end', async ({page}) => {
  test.setTimeout(150_000);
  await freshWeek(page, 'dark', at(DAY1, '11:00'));
  await setup(page, [/^Habits/]);

  // His day ends at 03:00 (Settings → Your day).
  await page.goto('/app/settings#day-ends'); await hydrated(page);
  const section = page.locator('#day-ends');
  await expect(section).toContainText('habits, the Checklist, streaks and Tasks count for the day until this time (3:00 is the next morning)');
  await section.getByLabel('My day ends at').selectOption({label: '3:00'});
  await expect(section.getByRole('status')).toHaveText('Your day now ends at 3:00.');
  await quietPage(page);

  await newHabit(page, 'Read 20 pages');
  await newHabit(page, 'Stretch');
  // A task for Monday, without a time (written as the Tasks page writes one).
  await page.evaluate(task => localStorage.setItem('zigoals:tasks:v1', JSON.stringify({version: 1, tasks: [{id: 'au-max-1', title: task, priority: 'normal', due: '2026-11-23', createdAt: '2026-11-23T10:00:00.000Z'}]})), TASK);

  // Monday 22:00: one habit ticked.
  await openAt(page, at(DAY1, '22:00'), '/app/habits');
  const read = page.getByRole('article', {name: 'Read 20 pages', exact: true});
  await read.getByRole('button', {name: 'Complete Read 20 pages', exact: true}).click();
  await expect(read.locator('.habit-result')).toHaveText('Complete');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:habits:v1')!).habits.flatMap((h: {entries: {date: string}[]}) => h.entries.map(e => e.date)))).toEqual([DAY1]);

  // Tuesday 01:30 on the calendar, still Monday for Max.
  await openAt(page, at(DAY2, '01:30'));
  await expect(page.locator('[data-today-line]')).toContainText('1 of 2 habits');
  await openAt(page, at(DAY2, '01:30'), '/app/tasks?view=today');
  await expect(page.getByRole('main')).toContainText(TASK);
  await openAt(page, at(DAY2, '01:30'), '/app/tasks?view=overdue');
  await expect(page.getByRole('main')).not.toContainText(TASK);

  // After 03:00 it is Tuesday for him too: the habits start again and Monday's task is overdue.
  await openAt(page, at(DAY2, '09:00'));
  await expect(page.locator('[data-today-line]')).toContainText('0 of 2 habits');
  await openAt(page, at(DAY2, '09:00'), '/app/tasks?view=overdue');
  await expect(page.getByRole('main')).toContainText(TASK);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
