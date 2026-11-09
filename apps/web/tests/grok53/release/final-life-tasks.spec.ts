import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyDevice, open, toast} from '../l3-helpers';
import {loadShowcase} from '../../ah-helpers';
import {healthView} from '../health/al-health-helpers';
import {goal, seedGoals} from '../goals/goal-fixtures';

/**
 * Session AL final replay fix pass (docs/review/session-al/GROK53_REPLAY_PRIMITIVES_3.md and GROK53_REPLAY_PILLARS_3.md):
 * Habits, the goal's vision and plan, Health, hover states, Tasks' day, Notes' toast, copy and forms, Activity. One test per
 * group, at the replay's width and conditions; fictional data, every /api request answered 503 (l3-helpers), so nothing
 * leaves the browser. The export rows (BN-020, MO-016, MO-031) are unit tests (lib/export/everything.test.ts,
 * lib/health-al-l2-pass2.test.ts).
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});
const desktop = {width: 1280, height: 800};
/** The computed look of an element, for a hover that must change something. */
const look = (page: Page, selector: string) => page.locator(selector).first().evaluate(el => { const s = getComputedStyle(el); return [s.backgroundColor, s.backgroundImage, s.color, s.borderColor, s.boxShadow].join(' | '); });

test('Habits (D-206, B-197, C-DVG-10): Cancel asks before a typed title goes; a target keeps to the limits and reads "1:30"', async ({page}) => {
  await page.setViewportSize(desktop);
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app/habits');
  // D-206: a typed title is not thrown away without a word; the form asks in its own way (no browser dialog).
  page.on('dialog', dialog => { throw new Error(`A browser dialog opened: ${dialog.message()}`); });
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Kbd');
  await page.getByRole('button', {name: 'Cancel', exact: true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Habit title', {exact: true})).toHaveValue('Kbd');
  await expect(page.getByText('This new habit is not created yet. Press “Discard changes” to close without keeping it, or create it.')).toBeVisible();
  await page.getByRole('button', {name: 'Discard changes', exact: true}).click();
  await expect(page.getByLabel('Habit title', {exact: true})).toHaveCount(0);
  // B-197: a billion a day is refused with the count row's range, under the field.
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Many');
  await page.locator('summary').filter({hasText: 'More options'}).click();
  await page.getByRole('combobox', {name: 'Measurement', exact: true}).selectOption('count');
  const target = page.getByLabel('Target value', {exact: true});
  await target.fill('1000000000');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(target).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.field-error').filter({hasText: 'Target value: Enter a whole number from 1 to 1,000,000.'})).toBeVisible();
  await expect(page.getByRole('article', {name: 'Many', exact: true})).toHaveCount(0);
  // C-DVG-10: a time habit's target typed as "1:30" is 90 minutes.
  await page.getByRole('combobox', {name: 'Measurement', exact: true}).selectOption('duration');
  await target.fill('1:30');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: 'Many', exact: true});
  await expect(card).toBeVisible();
  await expect(card).toContainText(/90 minutes|1 h 30 min/);
});

test('Vision and plan (T-079, T-077): one emoji only; a gradient keeps the unsaved if-then plan', async ({page}) => {
  await page.setViewportSize(desktop);
  // The person's own goal (the Showcase's plan fields are read-only).
  await seedGoals(page, [goal('71', {name: 'Fictional rainy-day fund'})], '/app/goals/tracked/71');
  // By its place, not its name: a label around a text box names it with the text typed in it too.
  const plan = page.getByRole('article', {name: 'Why it matters'}).getByPlaceholder('If I want to buy something big, then I wait one day');
  await expect(plan).toBeVisible();
  await plan.fill('If it rains, then I walk indoors.');
  await page.getByRole('button', {name: 'The ocean gradient', exact: true}).click();
  await expect(toast(page)).toContainText('Vision saved.');
  await expect(plan).toHaveValue('If it rains, then I walk indoors.');
  const emoji = page.locator('.vision-emoji-field input');
  await emoji.fill('abcdefgh');
  await emoji.press('Tab');
  await expect(emoji).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.vision-picker .field-error')).toHaveText('Enter one emoji, like 🌟, or leave it empty.');
  await emoji.fill('🌟');
  await emoji.press('Tab');
  await expect(page.locator('.vision-picker .field-error')).toHaveCount(0);
  await expect(emoji).not.toHaveAttribute('aria-invalid', 'true');
});

test('Health (D-222, D-076): "+" keeps its fill on hover, an empty counter says so in words; the zone and the water target are checked', async ({page}) => {
  await page.setViewportSize(desktop);
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app/health');
  const pullUps = page.getByRole('article', {name: 'Pull-ups', exact: true});
  await expect(pullUps.locator('.exercise-count')).toContainText('none yet');
  await expect(pullUps.locator('.exercise-count')).not.toContainText('—');
  const plus = page.getByRole('button', {name: 'Increase Push-ups', exact: true});
  await page.mouse.move(0, 0);
  const before = await plus.evaluate(el => getComputedStyle(el).backgroundImage);
  expect(before).toContain('linear-gradient');
  await plus.hover();
  await expect.poll(() => plus.evaluate(el => getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
  expect(await plus.evaluate(el => getComputedStyle(el).backgroundImage)).not.toBe(before);
  // D-076: Journal settings.
  await healthView(page, 'Journal settings').click();
  const form = page.getByRole('form', {name: 'Health preferences'});
  const zone = form.getByLabel('Journal timezone', {exact: true});
  await zone.fill('Mars/Phobos');
  await form.getByRole('button', {name: 'Save journal preferences'}).click();
  await expect(zone).toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('.field-error').first()).toHaveText('“Mars/Phobos” is not a time zone this device knows. Enter one like Europe/Brussels or America/New_York.');
  await expect(page.getByText(/Check the numbers/)).toHaveCount(0);
  await zone.fill('Europe/Brussels');
  const water = form.getByLabel('Personal water target (mL, optional)', {exact: true});
  await water.fill('1');
  await form.getByRole('button', {name: 'Save journal preferences'}).click();
  await expect(form.getByRole('alert')).toHaveText('1 mL a day is less than one glass of water. If it is right, press Save journal preferences again to keep it.');
  await expect(page.getByText('Journal preferences saved.', {exact: false})).toHaveCount(0);
  await water.fill('20000');
  await form.getByRole('button', {name: 'Save journal preferences'}).click();
  await expect(water).toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('.field-error').first()).toContainText('10,000');
  await water.fill('2000');
  await form.getByRole('button', {name: 'Save journal preferences'}).click();
  await expect(page.getByText('Journal preferences saved.', {exact: false}).first()).toBeVisible();
});

test('Hover (D-212, D-223): the Goals filter chip and Markets\' chip and star answer the pointer', async ({page}) => {
  await page.setViewportSize(desktop);
  await emptyDevice(page, {theme: 'nebula'});
  await loadShowcase(page);
  await open(page, '/app/goals');
  const completed = '.goal-view-filters button:not([aria-pressed="true"])';
  await page.mouse.move(0, 0);
  const rest = await look(page, completed);
  await page.locator(completed).first().hover();
  await expect.poll(() => look(page, completed)).not.toBe(rest);
  const pressed = '.goal-view-filters button[aria-pressed="true"]';
  await page.mouse.move(0, 0);
  const pressedRest = await look(page, pressed);
  await page.locator(pressed).first().hover();
  await expect.poll(() => look(page, pressed)).not.toBe(pressedRest);
  await open(page, '/app/markets');
  const chip = '.markets-page .picker-tabs button:not([aria-pressed="true"])';
  await page.mouse.move(0, 0);
  const chipRest = await look(page, chip);
  await page.locator(chip).first().hover();
  await expect.poll(() => look(page, chip)).not.toBe(chipRest);
  const star = '.markets-page .market-favourite[aria-pressed="false"]:not([aria-disabled="true"])';
  await page.mouse.move(0, 0);
  const starRest = await look(page, star);
  await page.locator(star).first().hover();
  await expect.poll(() => look(page, star)).not.toBe(starRest);
});

test('Tasks (LS-031, LS-066): Tasks counts the day in the saved time zone, as the Checklist does', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await page.clock.install({time: new Date('2026-11-04T22:30:00Z')}); // Wed 4 Nov 23:30 in Brussels; Thu 5 Nov in Auckland
  await emptyDevice(page, {theme: 'nebula'});
  await page.evaluate(() => localStorage.setItem('zigoals:tasks:v1', JSON.stringify({version: 1, projects: [], tasks: [{id: 't-bill', title: 'Pay the electricity bill', priority: 'normal', due: '2026-11-04', createdAt: '2026-11-01T08:00:00.000Z'}]})));
  await open(page, '/app/tasks');
  await expect(page.locator('.tasks-group[data-state="today"]')).toContainText('Pay the electricity bill');
  await open(page, '/app/settings#time-zone');
  const section = page.getByRole('region', {name: 'Your time zone', exact: true});
  await section.getByRole('combobox', {name: 'Your time zone', exact: true}).fill('Pacific/Auckland');
  await section.getByRole('button', {name: 'Save my time zone', exact: true}).click();
  await expect(section).toContainText('Your days follow Pacific/Auckland.');
  // A fresh load of Tasks: the saved zone arrives after the settings load, and the day is read again then.
  await open(page, '/app/tasks');
  await expect(page.locator('.tasks-group[data-state="overdue"]')).toContainText('Pay the electricity bill');
  await expect(page.locator('.tasks-group[data-state="today"]')).toHaveCount(0);
  await expect(page.getByText('Due today')).toHaveCount(0);
});

test('Notes (PR-106): the "deleted · Undo" toast ends with the Notes view it belongs to', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app/notes?view=notes');
  await page.getByLabel('New note', {exact: true}).fill('Trip ideas');
  await page.getByRole('button', {name: 'Make note', exact: true}).click();
  await page.getByRole('button', {name: 'Delete note', exact: true}).click();
  await expect(toast(page)).toContainText('“Trip ideas” deleted.');
  await expect(toast(page).getByRole('button', {name: /Undo/})).toBeVisible();
  const views = page.getByRole('navigation', {name: 'Notes views'});
  await views.getByRole('button', {name: 'Days', exact: true}).click();
  await expect(page.locator('.aa-toast').filter({hasText: 'Trip ideas'})).toHaveCount(0);
  await views.getByRole('button', {name: 'Graph', exact: true}).click();
  await expect(page.locator('.aa-toast').filter({hasText: 'Trip ideas'})).toHaveCount(0);
});

test('Copy and forms (N-NB-04, D-173, D-172, N-TK-18): plurals, field errors under the fields, a return that does not read', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await emptyDevice(page, {theme: 'dark'});
  // N-NB-04: one check-in, a streak of 1 day.
  const card = await createHabit(page, 'Drink water');
  await card.getByRole('button', {name: /^Complete/}).first().click();
  await open(page, '/app/review');
  await expect(page.locator('main')).toContainText('longest streak 1 day');
  await expect(page.locator('main')).not.toContainText('1 days');
  // D-173: an empty "From" is said under the field.
  await open(page, '/app/settings#wrap-up');
  const wrap = page.getByRole('region', {name: 'Evening wrap-up', exact: true});
  const from = wrap.getByLabel('From', {exact: true});
  await from.fill('');
  await from.press('Enter');
  await expect(from).toHaveAttribute('aria-invalid', 'true');
  await expect(wrap.locator('.field-error')).toHaveText('Choose a time, like 18:00. The wrap-up shows from that time.');
  // D-172: an empty link names what is missing.
  const links = page.getByRole('region', {name: 'My links', exact: true});
  await links.getByRole('button', {name: 'Add a link', exact: true}).click();
  await links.getByRole('button', {name: 'Add link', exact: true}).click();
  await expect(links.getByLabel('Name', {exact: true})).toHaveAttribute('aria-invalid', 'true');
  await expect(links.getByLabel('Name', {exact: true})).toBeFocused();
  await expect(links.locator('.field-error').first()).toHaveText('Give the link a name.');
  await expect(links.getByLabel('Address (https://)', {exact: true})).toHaveAttribute('aria-invalid', 'true');
  // N-TK-18: "-abc5" in "Another return".
  await open(page, '/app/wealth/calculator');
  const another = page.getByLabel('Another yearly return to compare, in percent', {exact: true});
  await another.fill('-abc5');
  await expect(another).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.calc-custom-error')).toHaveText('Enter a yearly return in percent, like 7 or -2.5.');
  await another.fill('7');
  await expect(page.locator('.calc-custom-error')).toHaveCount(0);
});

test('Activity (DV-115): a Today card\'s check-in removed on Habits leaves "Actions by ZIGi" too', async ({page}) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await emptyDevice(page, {theme: 'nebula'});
  const card = await createHabit(page, 'Floss');
  const habitId = await page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:habits:v1')!) as {habits: {id: string; title: string}[]}).habits.find(h => h.title === 'Floss')!.id);
  // The note a confirmed Today card leaves (kind checklist-tick, as the replay found it), with the check-in itself.
  await card.getByRole('button', {name: /^Complete/}).first().click();
  const day = await page.evaluate(() => new Date().toLocaleDateString('en-CA', {timeZone: 'Europe/Brussels'}));
  await page.evaluate(({habitId, day}) => localStorage.setItem('zigoals:ai-actions:v1', JSON.stringify({version: 1, actions: [{activityId: `habit:${habitId}:${day}`, kind: 'checklist-tick', title: 'Check-in: Floss', at: new Date().toISOString()}]})), {habitId, day});
  await open(page, '/app/activity');
  const chips = page.getByRole('navigation', {name: 'Activity categories'});
  await expect(chips.getByRole('button', {name: /^Actions by ZIGi/})).toContainText('1');
  await open(page, '/app/habits');
  await page.getByRole('article', {name: 'Floss', exact: true}).getByRole('button', {name: 'Remove one from Floss', exact: true}).click();
  await open(page, '/app/activity');
  await expect(chips.getByRole('button', {name: /^All/})).toContainText('0');
  await expect(chips.getByRole('button', {name: /^Actions by ZIGi/})).toContainText('0');
  await chips.getByRole('button', {name: /^Actions by ZIGi/}).click();
  await expect(page.getByRole('region', {name: 'Unified private activity'})).not.toContainText('Check-in: Floss');
});
