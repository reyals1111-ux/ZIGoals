import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AW (X1, LEDGER #438–#440; Due): a task reminder that reminds again until Done or Snooze (in the app, push off;
 * quiet hours hold it), the person's own snooze choices, and named timers — several at once, Pause, +1 min, Stop, a bell at
 * the end that a muted bell keeps silent, the strip on every page while one runs. At 390 (the phone project) and 1440, in
 * Nebula, Light and Dark, axe-clean, still under Motion Off. Playwright's clock drives the repeats and the timers' ends.
 * Fictional data; offline throughout.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-25T07:00:00Z');
const seededTasks = JSON.stringify(addTask(emptyTasks(), {title: 'Call the fictional bank', due: '2026-11-25', time: '09:00', reminders: [{before: 30}]}, {id: 'task_fictional-bank', at, today: '2026-11-25'}));
const tasksOf = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {doneAt?: string; snooze?: {until: number}; reminders?: {again?: unknown}[]}[]);
const prefsOf = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:notify:v1') ?? '{}') as {taskAgain?: unknown; snoozes?: unknown[]});
const noSideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function seed(page: Page, records: Record<string, string>) {
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(r => { for (const [k, v] of Object.entries(r)) localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, records);
}
async function clean(page: Page, scope = page.locator('main')) {
  const findings = await axe(page, scope);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
}
/** Counts the bell's tones (each strike makes oscillators on the page's one audio context). */
const countTones = (page: Page) => page.addInitScript(() => {
  const w = window as unknown as {__tones: number; AudioContext?: {prototype: {createOscillator: () => unknown}}};
  w.__tones = 0;
  const proto = w.AudioContext?.prototype; if (!proto) return;
  const make = proto.createOscillator;
  proto.createOscillator = function (this: unknown) { w.__tones++; return make.call(this); };
});
/**
 * Moves the page's clock on to `iso`, firing each timer that falls due once (`fastForward`): hours of the app's
 * half-minute looks and animation frames one by one would outlast the test, and a toast's own 8 s would pass inside them.
 */
const jumpTo = async (page: Page, iso: string) => page.clock.fastForward(Date.parse(iso) - await page.evaluate(() => Date.now()));
const tones = (page: Page) => page.evaluate(() => (window as unknown as {__tones: number}).__tones);

for (const theme of THEMES) test(`${theme}: a reminder reminds again until Done; own snooze choices`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-25T08:31:00+01:00')});
  await seed(page, {'zigoals:tasks:v1': seededTasks, 'zigoals:notify:v1': JSON.stringify({version: 1, types: {}, taskAgain: {every: 10, times: 3}, snoozes: [{for: 120}, {at: '19:00', day: 'next'}]})});
  await page.goto('/app/tasks?view=today'); await settle(page);
  const rows = page.getByRole('list', {name: 'Reminders that have gone off'});
  await expect(rows.getByRole('listitem')).toHaveCount(1);
  // Dismissed, it comes back at the next repeat (10 minutes on), with its round and a polite word.
  await rows.getByRole('button', {name: 'Dismiss'}).click();
  await expect(rows).toHaveCount(0);
  await jumpTo(page, '2026-11-25T08:41:01+01:00');
  await expect(rows.getByRole('listitem')).toHaveCount(1);
  await expect(rows).toContainText('again, 1 of 3');
  await expect(page.getByText('Reminder again (1 of 3): “Call the fictional bank”. Done or Snooze stops it.')).toBeVisible();
  // The person's own snooze choices, in their words; the first snoozes for two hours.
  const group = rows.getByRole('group', {name: 'Snooze “Call the fictional bank”'});
  await expect(group.getByRole('button')).toHaveText(['2 h', 'This evening 7:00 PM']);
  await clean(page);
  // Two hours from the tap (the page's clock runs on between the reads, so the tap lies between them).
  const before = await page.evaluate(() => Date.now());
  await group.getByRole('button', {name: 'Snooze “Call the fictional bank” for 2 hours'}).click();
  const after = await page.evaluate(() => Date.now());
  await expect.poll(async () => (await tasksOf(page))[0]!.snooze?.until ?? 0).toBeGreaterThanOrEqual(before + 7_200_000);
  expect((await tasksOf(page))[0]!.snooze!.until).toBeLessThanOrEqual(after + 7_200_000);
  await expect(rows).toHaveCount(0);
  // After the snooze it reminds again from there; Done stops it for good.
  await jumpTo(page, '2026-11-25T10:43:00+01:00');
  await expect(rows.getByRole('listitem')).toHaveCount(1);
  await rows.getByRole('button', {name: 'Done'}).click();
  await expect.poll(async () => !!(await tasksOf(page))[0]!.doneAt).toBe(true);
  await jumpTo(page, '2026-11-25T11:20:00+01:00');
  await expect(rows).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 800});
  expect(await noSideways(page)).toBe(true);
});

test('quiet hours hold the repeats; the editor and This week set them; own snooze choices are added', async ({page, isMobile}) => {
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-25T21:51:00+01:00')});
  const late = JSON.stringify(addTask(emptyTasks(), {title: 'Lock the fictional shed', due: '2026-11-25', time: '21:50', reminders: [{before: 0, again: {every: 15, times: 2}}]}, {id: 'task_fictional-shed', at, today: '2026-11-25'}));
  await seed(page, {'zigoals:tasks:v1': late});
  await page.goto('/app/tasks?view=today'); await settle(page);
  const rows = page.getByRole('list', {name: 'Reminders that have gone off'});
  await rows.getByRole('button', {name: 'Dismiss'}).click();
  // 22:05 falls inside the quiet hours (22:00–08:00): it waits until 08:00.
  await jumpTo(page, '2026-11-25T22:11:00+01:00');
  await expect(rows).toHaveCount(0);
  await jumpTo(page, '2026-11-26T08:01:00+01:00');
  await expect(rows).toContainText('again, 1 of 2');
  // The task's own repeat in its editor.
  await page.goto('/app/tasks?task=task_fictional-shed'); await settle(page);
  const editor = page.getByRole('form', {name: 'Edit “Lock the fictional shed”'});
  const again = editor.getByRole('group', {name: 'Remind again'});
  await expect(again.getByLabel('Every')).toHaveValue('15');
  await again.getByLabel('Every').selectOption('off');
  await editor.getByRole('button', {name: 'Save'}).click();
  await expect.poll(async () => (await tasksOf(page))[0]!.reminders).toEqual([{before: 0, again: false}]);
  // The device's default and the own snooze choices, in Tasks → This week.
  await page.goto('/app/tasks?view=week'); await settle(page);
  const choices = page.locator('#reminder-choices');
  await expect(choices.getByRole('heading', {name: 'Reminders: remind again and snooze'})).toBeVisible();
  await choices.getByLabel('Remind again').selectOption('5');
  await expect.poll(async () => (await prefsOf(page)).taskAgain).toEqual({every: 5, times: 6});
  await expect(choices.getByRole('list', {name: 'The usual snooze choices'})).toContainText('15 min');
  await choices.getByLabel('Minutes').fill('90');
  await choices.getByRole('button', {name: 'Add the choice'}).click();
  await choices.getByLabel('Snooze', {exact: true}).selectOption('weekday');
  await choices.getByLabel('Weekday').selectOption('1');
  await choices.getByLabel('Time').fill('09:00');
  await choices.getByRole('button', {name: 'Add the choice'}).click();
  await expect.poll(async () => (await prefsOf(page)).snoozes).toEqual([{for: 90}, {at: '09:00', day: 1}]);
  await expect(choices.getByRole('list', {name: 'Your snooze choices'})).toContainText('1 h 30 min · on the notification');
  await clean(page, page.locator('#reminder-choices'));
});

for (const theme of THEMES) test(`${theme}: named timers, several at once; Pause, +1 min, Stop; the bell at the end`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  await countTones(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-25T18:00:00+01:00')});
  await seed(page, {});
  await page.goto('/app/tasks'); await settle(page);
  // No first-screen card: nothing shows until a timer runs; Timers sits in Tasks' views (behind More views on a phone).
  await expect(page.getByRole('group', {name: 'Timers running'})).toHaveCount(0);
  if (isMobile) await page.getByRole('button', {name: 'More views'}).click();
  await page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: 'Timers'}).click();
  const sheet = page.getByRole('dialog', {name: 'Timers'});
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('No timers yet.');
  await clean(page, sheet);
  for (const [name, minutes] of [['Fictional pasta', '9'], ['Fictional laundry', '45']] as const) {
    await sheet.getByLabel('Name').fill(name);
    await sheet.getByLabel('Minutes').fill(minutes);
    await sheet.getByRole('button', {name: 'Start', exact: true}).click();
  }
  await expect(sheet.getByRole('list', {name: 'Timers running'}).getByRole('listitem')).toHaveCount(2);
  await sheet.getByRole('button', {name: 'Close'}).click();
  // The strip, on every page while one runs (Today here, after a reload).
  const strip = page.getByRole('group', {name: 'Timers running'});
  await expect(strip).toContainText('Fictional pasta');
  await page.goto('/app'); await settle(page);
  await expect(strip).toContainText('Fictional pasta');
  // The numbers move once a second (the page's clock may have run on while it loaded).
  const pasta = strip.getByRole('listitem').filter({hasText: 'Fictional pasta'}).locator('.aw-timer-digits');
  await expect(pasta).toHaveText(/^(?:9:00|8:[0-5]\d)$/);
  const before = await pasta.textContent();
  await page.clock.runFor(1000);
  await expect(pasta).not.toHaveText(before!);
  await strip.getByRole('button', {name: 'Pause Fictional laundry'}).click();
  await expect(strip.getByRole('button', {name: 'Resume Fictional laundry'})).toBeVisible();
  await strip.getByRole('button', {name: '+1 min to Fictional pasta'}).click();
  await expect(pasta).toHaveText(/^9:[0-5]\d$/);
  await clean(page, strip);
  // Its end: said once, the bell rung (made on the device).
  await page.clock.fastForward(10 * 60_000);
  await expect(strip).toContainText('Done');
  await expect(page.getByText('Timer done: “Fictional pasta”.')).toBeVisible();
  await expect.poll(() => tones(page)).toBeGreaterThan(0);
  await strip.getByRole('button', {name: 'Stop Fictional pasta'}).click();
  await strip.getByRole('button', {name: 'Stop Fictional laundry'}).click();
  await expect(strip).toHaveCount(0);
  const kept = await page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:timers:v1')!) as {timers: {name: string; endsAt?: number}[]}).timers);
  expect(kept.map(t => [t.name, t.endsAt])).toEqual([['Fictional pasta', undefined], ['Fictional laundry', undefined]]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await noSideways(page)).toBe(true);
});

test('a muted bell stays silent; the command menu opens Timers; Motion Off keeps the strip still', async ({page, isMobile}) => {
  await offline(page);
  await countTones(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-25T18:00:00+01:00')});
  await seed(page, {'zigoals:motion:v1': 'off', 'zigoals:timers:v1': JSON.stringify({version: 1, bell: false, timers: [{id: 'tm-fictional-tea', name: 'Fictional tea', seconds: 240, used: 1}]})});
  await page.goto('/app'); await settle(page);
  await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
  if (!isMobile) {
    await page.keyboard.press('Control+k');
    const menu = page.getByRole('dialog', {name: 'Command menu'});
    await menu.getByRole('combobox').or(menu.getByRole('textbox')).first().fill('timers');
    await menu.getByRole('option', {name: /^Timers/}).click();
  } else await page.goto('/app?timers=1');
  const sheet = page.getByRole('dialog', {name: 'Timers'});
  await expect(sheet.getByRole('checkbox', {name: /Ring a bell when a timer ends/})).not.toBeChecked();
  await sheet.getByRole('button', {name: 'Start Fictional tea, 4 min'}).click();
  await sheet.getByRole('button', {name: 'Close'}).click();
  const strip = page.getByRole('group', {name: 'Timers running'});
  await expect(strip.locator('.aw-timer-digits')).toHaveText(/^(?:4:00|3:[0-5]\d)$/);
  expect(await strip.evaluate(el => el.getAnimations({subtree: true}).length)).toBe(0);
  await page.clock.fastForward(4 * 60_000 + 2000);
  await expect(strip).toContainText('Done');
  await expect(page.getByText('Timer done: “Fictional tea”.')).toBeVisible();
  expect(await tones(page)).toBe(0);
});
