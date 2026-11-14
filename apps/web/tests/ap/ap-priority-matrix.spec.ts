import {expect, test} from '@playwright/test';
import {TODAY, seeded, stored, tasksRecord} from './ap-fixtures';

/**
 * Session AP (owner-approved feature list): Tasks' "Priority matrix". Four boxes from priority and day (urgent: overdue or
 * due within 2 days; important: P1 or P2), the rule said in one line; moving a card changes only its priority level,
 * never its day, and a move across the urgency line is refused with the reason. Draft for the integrator to run.
 */
test.use({timezoneId: 'Europe/Brussels'});
const TASKS = tasksRecord([
  {id: 'ap-tax', title: 'Fictional tax form', priority: 'high', level: 1, due: '2026-11-12'},
  {id: 'ap-plumber', title: 'Fictional plumber call', due: TODAY},
  {id: 'ap-trip', title: 'Fictional trip plan', priority: 'high', level: 2, due: '2026-11-20'},
  {id: 'ap-photos', title: 'Fictional photo sorting', priority: 'low'},
]);
type Stored = {tasks: {id: string; due?: string; level?: number; priority: string}[]};
const box = (page: Parameters<typeof stored>[0], name: string) => page.locator('.tasks-matrix-box').filter({has: page.getByRole('heading', {name: new RegExp(`^${name}`)})});

test('four boxes with their rule; the button moves a card to its partner box and changes only its priority', async ({page}) => {
  await seeded(page, {'zigoals:tasks:v1': TASKS}, '/app/tasks?view=matrix');
  await expect(page.getByText('Urgent: overdue or due within 2 days. Important: priority P1 or P2. Moving a card changes only its priority; its day stays.')).toBeVisible();
  await expect(box(page, 'Urgent and important')).toContainText('Fictional tax form');
  await expect(box(page, 'Urgent, not important')).toContainText('Fictional plumber call');
  await expect(box(page, 'Important, not urgent')).toContainText('Fictional trip plan');
  await expect(box(page, 'Neither urgent nor important')).toContainText('Fictional photo sorting');
  await page.getByRole('button', {name: 'Move “Fictional plumber call” to “Urgent and important”'}).click();
  await expect(box(page, 'Urgent and important')).toContainText('Fictional plumber call');
  const plumber = (await stored<Stored>(page, 'zigoals:tasks:v1'))!.tasks.find(t => t.id === 'ap-plumber')!;
  expect([plumber.level, plumber.due]).toEqual([1, TODAY]);
  // Undo puts it back at P3.
  await page.locator('.aa-toast').last().getByRole('button', {name: 'Undo'}).click();
  await expect(box(page, 'Urgent, not important')).toContainText('Fictional plumber call');
});

test('drag between boxes: within a row the priority changes; across the urgency line it is refused', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'HTML drag and drop needs a mouse; the phone uses each card\'s button (above)');
  await seeded(page, {'zigoals:tasks:v1': TASKS}, '/app/tasks?view=matrix');
  await page.locator('#task-ap-photos').dragTo(box(page, 'Important, not urgent'));
  await expect(box(page, 'Important, not urgent')).toContainText('Fictional photo sorting');
  expect((await stored<Stored>(page, 'zigoals:tasks:v1'))!.tasks.find(t => t.id === 'ap-photos')).toMatchObject({level: 2});
  await page.locator('#task-ap-trip').dragTo(box(page, 'Urgent and important'));
  await expect(page.locator('.aa-toast').last()).toContainText('A task becomes urgent by its day');
  const trip = (await stored<Stored>(page, 'zigoals:tasks:v1'))!.tasks.find(t => t.id === 'ap-trip')!;
  expect([trip.level, trip.due]).toEqual([2, '2026-11-20']);
});
