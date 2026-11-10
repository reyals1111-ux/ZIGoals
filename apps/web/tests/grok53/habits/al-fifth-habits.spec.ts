import {expect, test, type Page} from '@playwright/test';
import {openHabitMoreOptions} from '../../habit-form-helpers';
import {createHabit, emptyDevice, open} from '../l3-helpers';

/**
 * Session AL fifth pass (lane L3, GROK53_REPLAY_L3_2 "STILL OPEN" 1 and "CHANGED" 4, 6): the bot's steps on Habits. DL =
 * 1280×800 Light, a fresh profile, Brussels, clock 4 Nov 2026 before 07:00. Fictional habits only.
 */
test.use({viewport: {width: 1280, height: 800}, locale: 'en-GB', timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-04T02:10:00Z')}); await emptyDevice(page, {theme: 'light'}); });
const card = (page: Page, title: string) => page.getByRole('article', {name: title, exact: true});

test('PR-093: a limit on 3× per week counts its week; three taps read "3 of at most 2 … Over the limit", never Partial or Within limit', async ({page}) => {
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Snacks');
  await page.getByRole('combobox', {name: 'Schedule', exact: true}).selectOption('frequency');
  await page.getByRole('textbox', {name: 'Times per period', exact: true}).fill('3');
  await openHabitMoreOptions(page);
  await page.getByRole('combobox', {name: 'Habit type', exact: true}).selectOption('limit');
  await page.getByRole('textbox', {name: 'Target value', exact: true}).fill('2');
  await expect(page.locator('.habit-editor')).toContainText('A limit counts the whole week: at most 2 times in all, however many days you log.');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const snacks = card(page, 'Snacks');
  await expect(snacks).toContainText('Limit 2 times per week');
  await expect(snacks.locator('.habit-count')).toHaveText('0 of at most 2 times this week');
  await expect(snacks.locator('.habit-result')).toHaveText('Within the limit so far');
  for (let n = 1; n <= 3; n++) {
    await snacks.getByRole('button', {name: 'Add one to Snacks', exact: true}).click();
    await expect(snacks.locator('.habit-count')).toHaveText(`${n} of at most 2 times this week`);
  }
  await expect(snacks.locator('.habit-result')).toHaveText('Over the limit this week');
  await expect(snacks.getByRole('button', {name: 'Stayed within limit for Snacks'})).toHaveCount(0);
  await expect(snacks).not.toContainText('Partial');
  // "−" corrects a wrong tap: back within the limit, the verdict and the button come back.
  await snacks.getByRole('button', {name: 'Remove one from Snacks', exact: true}).click();
  await expect(snacks.locator('.habit-count')).toHaveText('2 of at most 2 times this week');
  await expect(snacks.locator('.habit-result')).toHaveText('Within the limit so far');
  await expect(snacks.getByRole('button', {name: 'Stayed within limit for Snacks'})).toBeVisible();
});

test('D-044: on a day with a check-in, "Changes effective from" shows today for a schedule edit, as the save uses', async ({page}) => {
  const sched = await createHabit(page, 'Sched');
  await sched.getByRole('button', {name: 'Complete Sched', exact: true}).click();
  await sched.getByRole('button', {name: 'Edit Sched'}).click();
  const from = page.getByLabel('Changes effective from');
  await expect(from).toHaveValue('2026-11-04');
  await page.getByRole('combobox', {name: 'Schedule', exact: true}).selectOption('weekdays');
  await expect(from).toHaveValue('2026-11-04');
  await page.getByRole('button', {name: 'Save habit', exact: true}).click();
  await expect(sched).not.toContainText('Scheduled change from');
});

test('DV-132/DV-243: the fold (FR-17) comes right after the schedule and area, so Habit type is asked before Reminder time', async ({page}) => {
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await openHabitMoreOptions(page);
  const order = await page.locator('.habit-editor').evaluate(form => {
    const type = [...form.querySelectorAll('label')].find(l => l.firstChild?.textContent?.trim() === 'Habit type')!;
    const reminder = [...form.querySelectorAll('label, legend')].find(l => /^Reminder time/.test(l.textContent?.trim() ?? ''))!;
    return {before: !!(type.compareDocumentPosition(reminder) & Node.DOCUMENT_POSITION_FOLLOWING), inFold: !!type.closest('details.habit-more-options'), reminderInFold: !!reminder.closest('details.habit-more-options')};
  });
  expect(order).toEqual({before: true, inFold: true, reminderInFold: false});
});

// (Production build only: under `next dev` React's strict mode runs the phone sheet's Back handler twice, and its
// history.back() closes the sheet as it opens; the production build, as CI runs it, has no double effects.)
test('DV-243: at 388 px the fold\'s list of contents sits on its own line under "More options"', async ({page}) => {
  await page.setViewportSize({width: 388, height: 800});
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  const summary = page.locator('.habit-editor details.habit-more-options > summary');
  const [label, hint] = await summary.evaluate(s => { const small = s.querySelector('small')!; const range = document.createRange(); range.selectNodeContents(s.firstChild!); return [range.getBoundingClientRect().bottom, small.getBoundingClientRect().top]; });
  expect(hint).toBeGreaterThanOrEqual(label - 1);
});
