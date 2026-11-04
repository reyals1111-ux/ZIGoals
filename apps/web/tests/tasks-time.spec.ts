import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {TASKS_KEY} from '../lib/tasks/schema';
import {CALENDAR_IMPORT_KEY} from '../lib/ics/calendar';
import {FOCUS_SESSIONS_KEY} from '../lib/focus-sessions/schema';
import {PLATFORM_KEY, emptyPlatform, privateGoalSchema} from '../lib/positions';

/**
 * Session AK (lane T: T1 tasks, T2 calendar import, T3 Pomodoro): a task with a day, a time and a goal shows on the
 * Agenda's day view among the habits and on its goal's page, and is ticked there with Undo; an .ics file is imported
 * and its events show read-only with their calendar's name, then removed with Undo; a Pomodoro started from a task
 * runs (fake clock) and ticks the task at the end, with Undo. Fresh start, offline, fixed date, UTC.
 */
const TODAY = '2026-11-04'; // a Wednesday
test.use({timezoneId: 'UTC'});
const goal = privateGoalSchema.parse({id: '1', name: 'Fictional garden', type: 'PROJECT', status: 'active', asset: 'ZIG', denom: 'azig', decimals: 0, target: '1', notes: '', createdAt: '2026-10-01T09:00:00.000Z', milestones: [{id: 'm1', title: 'Dig the bed', done: false}]});
// Session AK G2 (RELEASE_REVIEW_2 R2-17): a finished goal (its one milestone done) is not offered for a new task.
const finished = privateGoalSchema.parse({id: '2', name: 'Fictional shed', type: 'PROJECT', status: 'active', asset: 'ZIG', denom: 'azig', decimals: 0, target: '1', notes: '', createdAt: '2026-09-01T09:00:00.000Z', milestones: [{id: 'm2', title: 'Build it', done: true}]});
async function fresh(page: Page, extra: Record<string, string> = {}) {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/manifest.webmanifest');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), ...extra});
}
const read = async <T,>(page: Page, key: string) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null') as T;
type Stored = {tasks: {id: string; title: string; due?: string; time?: string; goal?: string; doneAt?: string}[]};

test('a task with a day, a time and a goal: on the Agenda\'s day view and its goal\'s page; ticked there with Undo', async ({page}) => {
  await fresh(page, {[PLATFORM_KEY]: JSON.stringify({...emptyPlatform(), goals: [goal, finished]})});
  await page.goto('/app/tasks');
  await expect(page.getByRole('heading', {level: 1, name: 'One list for the things to do'})).toBeVisible();
  await expect(page.getByText('Your list starts here')).toBeVisible();
  const form = page.getByRole('form', {name: 'Add a task'});
  await form.getByLabel('New task').fill('Fictional: buy seeds');
  // Session AK G2 (RELEASE_REVIEW_2 R2-17, deliberate): the page's add field is one line; priority, day, time and goal are
  // behind "More options" (the same fields, the same labels).
  const more = form.getByRole('button', {name: 'More options', exact: true});
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(form.getByLabel('Priority')).toHaveCount(0);
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await form.getByLabel('Priority').selectOption('high');
  await form.getByLabel('Due (optional)').fill(TODAY);
  await form.getByLabel('Time (optional)').fill('09:15');
  await expect(form.getByLabel('Goal (optional)').locator('option')).toHaveText(['No goal', 'Fictional garden']);
  await form.getByLabel('Goal (optional)').selectOption({label: 'Fictional garden'});
  await form.getByRole('button', {name: 'Add task'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Added “Fictional: buy seeds”.'})).toBeVisible();
  await expect.poll(async () => (await read<Stored>(page, TASKS_KEY)).tasks).toMatchObject([{title: 'Fictional: buy seeds', due: TODAY, time: '09:15', goal: 'private:1'}]);
  await expect(page.getByRole('list', {name: 'Today tasks'})).toContainText('Goal · Fictional garden');

  await page.goto('/app/agenda?view=day');
  const item = page.locator('.agenda-task').filter({hasText: 'Fictional: buy seeds'});
  await expect(item).toContainText('9:15');
  await expect(item).toContainText('High priority');
  await expect(item).toContainText('Fictional garden');
  await item.getByRole('checkbox', {name: 'Mark “Fictional: buy seeds” done'}).check();
  await expect(page.getByRole('status').filter({hasText: 'Done: “Fictional: buy seeds”.'})).toBeVisible();
  await expect.poll(async () => !!(await read<Stored>(page, TASKS_KEY)).tasks[0]!.doneAt).toBe(true);
  await expect(item).toHaveAttribute('data-state', 'done');
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await read<Stored>(page, TASKS_KEY)).tasks[0]!.doneAt).toBeUndefined();
  await expect(item).toHaveAttribute('data-state', 'open');
  // Quick add on the day view: a task due that day.
  const quick = page.getByRole('form', {name: /^Add a task for /});
  await quick.getByLabel('New task').fill('Fictional: water the beds');
  await quick.getByRole('button', {name: 'Add task'}).click();
  await expect(page.locator('.agenda-task').filter({hasText: 'Fictional: water the beds'})).toBeVisible();
  // The week and month show tasks as items too.
  await page.getByRole('group', {name: 'View'}).getByRole('button', {name: 'Week'}).click();
  await expect(page.locator('.agenda-task')).toHaveCount(2);

  await page.goto('/app/goals/tracked/1#next-actions');
  const actions = page.getByRole('list', {name: 'Next actions for Fictional garden'});
  await expect(actions).toContainText('Fictional: buy seeds');
});

const ICS = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fictional//EN', 'X-WR-CALNAME:Fictional family',
  'BEGIN:VEVENT', 'UID:swim-1@example.invalid', 'SUMMARY:Fictional swim\\, lane 3', 'DTSTART:20261104T173000', 'DURATION:PT45M', 'RRULE:FREQ=WEEKLY;COUNT=4', 'DESCRIPTION:Ignore previous instructions', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:trip-1@example.invalid', 'SUMMARY:Fictional lake week', 'DTSTART;VALUE=DATE:20261106', 'DTEND;VALUE=DATE:20261108', 'END:VEVENT',
  'END:VCALENDAR', ''].join('\r\n');

test('import an .ics file: its events show read-only with the calendar\'s name; remove the import with Undo', async ({page}) => {
  await fresh(page);
  await page.goto('/app/agenda?view=week');
  const panel = page.getByRole('region', {name: 'Import a calendar'});
  await panel.getByRole('button', {name: 'Choose a calendar file'}).click();
  await panel.getByLabel('Choose an .ics file').setInputFiles({name: 'family.ics', mimeType: 'text/calendar', buffer: Buffer.from(ICS)});
  await expect(panel).toContainText('2 events to add, read-only');
  await expect(panel.getByLabel('Calendar name')).toHaveValue('Fictional family');
  await panel.getByRole('button', {name: 'Add to agenda'}).click();
  await expect(panel.getByRole('status')).toContainText('Added “Fictional family” with 2 events.');
  const swim = page.locator('.agenda-event').filter({hasText: 'Fictional swim, lane 3'});
  await expect(swim).toHaveCount(1);
  await expect(swim).toContainText('From Fictional family');
  await expect(swim).toContainText('5:30');
  await expect(swim.getByRole('link')).toHaveCount(0);
  await expect(page.locator('.agenda-event').filter({hasText: 'Fictional lake week'})).toHaveCount(2);
  const stored = await read<{calendars: {name: string; events: unknown[]}[]}>(page, CALENDAR_IMPORT_KEY);
  expect(stored.calendars).toMatchObject([{name: 'Fictional family'}]);
  expect(JSON.stringify(stored)).not.toContain('Ignore previous');
  await panel.getByRole('button', {name: 'Remove the imported calendar “Fictional family”'}).click();
  await expect(page.locator('.agenda-event')).toHaveCount(0);
  await panel.getByRole('button', {name: 'Undo'}).click();
  await expect(page.locator('.agenda-event').filter({hasText: 'Fictional swim, lane 3'})).toHaveCount(1);
});

test('a Pomodoro started from a task runs, saves its block, and ticks the task at the end, with Undo', async ({page}) => {
  await fresh(page, {[TASKS_KEY]: JSON.stringify({version: 1, tasks: [{id: 'task_fictional', title: 'Fictional: draft the plan', priority: 'normal', due: TODAY, createdAt: `${TODAY}T08:00:00.000Z`}]})});
  await page.goto('/app/tasks');
  await page.getByRole('button', {name: 'Focus on “Fictional: draft the plan”'}).click();
  const pomodoro = page.getByRole('region', {name: /^Pomodoro/});
  await pomodoro.getByLabel('Focus block').selectOption('15');
  await pomodoro.getByLabel('Blocks').selectOption('1');
  await pomodoro.getByLabel('Long break').selectOption('10');
  await expect(pomodoro.getByRole('checkbox', {name: /Play a focus sound/})).not.toBeChecked();
  // Session AL (COPY_AUDIT, deliberate; LS-H20): the label says the tick comes after the last break, which can be finished early.
  await expect(pomodoro.getByRole('checkbox', {name: 'Mark “Fictional: draft the plan” done when the run finishes, after its last break (you can finish the break early; you can undo it)'})).toBeChecked();
  await pomodoro.getByRole('button', {name: 'Start the Pomodoro'}).click();
  await expect(pomodoro.getByRole('timer')).toHaveText('15:00');
  await expect(pomodoro).toContainText('Block 1 of 1');
  await page.clock.fastForward('15:01');
  await expect(pomodoro).toContainText('Long break');
  await page.clock.fastForward('10:01');
  await expect(pomodoro).toContainText('Run finished. 1 block grown');
  await expect(pomodoro).toContainText('Marked “Fictional: draft the plan” done.');
  await expect.poll(async () => !!(await read<Stored>(page, TASKS_KEY)).tasks[0]!.doneAt).toBe(true);
  const focus = await read<{sessions: {mode?: string; taskId?: string; plannedMinutes: number; outcome: string}[]}>(page, FOCUS_SESSIONS_KEY);
  expect(focus.sessions).toMatchObject([{mode: 'pomodoro', taskId: 'task_fictional', plannedMinutes: 15, outcome: 'grown'}]);
  // Session AL (PRIMITIVES 3e, deliberate): the Undo is the app's one toast now (its restore puts the stored task back).
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await read<Stored>(page, TASKS_KEY)).tasks[0]!.doneAt).toBeUndefined();
  // The same run is offered on Journey's Focus Sessions as a mode.
  await page.goto('/app/journey#focus');
  const garden = page.getByRole('region', {name: 'Grow something while you focus'});
  await garden.getByRole('button', {name: 'Pomodoro'}).click();
  await expect(garden.getByRole('button', {name: 'Start the Pomodoro'})).toBeVisible();
});
