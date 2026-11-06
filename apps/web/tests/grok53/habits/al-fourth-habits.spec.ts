import {expect, test, type Page} from '@playwright/test';
import {openHabitMoreOptions} from '../../habit-form-helpers';
import {createHabit, emptyDevice, logWaterOnHealth, open, toast} from '../l3-helpers';

/**
 * Session AL fourth pass (lane L3, GROK53_REPLAY_L3_1 "exact steps" 2, 5, 6, 7, 8, 9, 15, 20, 21, 22, 23): Habits as the
 * bots ran it, Brussels before 07:00, 1280×800 (Light where Nairobi used it), a fresh profile unless the Showcase.
 */
test.use({viewport: {width: 1280, height: 800}, locale: 'en-GB', timezoneId: 'Europe/Brussels'});
const card = (page: Page, title: string) => page.getByRole('article', {name: title, exact: true});
async function newHabitForm(page: Page) {
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await expect(page.getByLabel('Habit title', {exact: true})).toBeFocused();
}
async function showcase(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}

test.describe('fresh profile', () => {
  test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-04T02:10:00Z')}); await emptyDevice(page, {theme: 'light'}); });

  test('NB-072/NB-074: "Start from an idea" brings the ideas into view and moves the focus there; Close gives it back', async ({page}) => {
    await newHabitForm(page);
    await page.getByRole('button', {name: 'Start from an idea', exact: true}).click();
    const heading = page.getByRole('heading', {name: 'Habit ideas', exact: true});
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    await page.locator('.habit-ideas').getByRole('button', {name: 'Close', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Start from an idea', exact: true})).toBeFocused();
  });

  test('PR-061/NB-076/NB-158/H-008: a 3× per week habit counts its week and is done for today after Complete; PR-093: a limit says "at most"', async ({page}) => {
    await newHabitForm(page);
    await page.getByLabel('Habit title', {exact: true}).fill('Gym3');
    await page.getByRole('combobox', {name: 'Schedule', exact: true}).selectOption('frequency');
    await page.getByRole('textbox', {name: 'Times per period', exact: true}).fill('3');
    await page.getByRole('button', {name: 'Create habit', exact: true}).click();
    const gym = card(page, 'Gym3');
    await expect(gym.locator('.habit-count')).toHaveText('0 / 3 this week');
    await expect(gym.locator('.habit-result')).toHaveText('Not done today');
    await gym.getByRole('button', {name: 'Complete Gym3', exact: true}).click();
    await expect(gym.locator('.habit-count')).toHaveText('1 / 3 this week');
    await expect(gym.locator('.habit-result')).toHaveText('Done today');
    const done = gym.getByRole('button', {name: 'Undo completion for Gym3', exact: true});
    await expect(done).toHaveAttribute('aria-pressed', 'true');
    await expect(gym).not.toContainText('time today');
    await expect(gym).not.toContainText('Partial');
    await done.click();
    await expect(gym.locator('.habit-count')).toHaveText('0 / 3 this week');

    await newHabitForm(page);
    await page.getByLabel('Habit title', {exact: true}).fill('Snacks');
    await page.getByRole('combobox', {name: 'Schedule', exact: true}).selectOption('frequency');
    await page.getByRole('textbox', {name: 'Times per period', exact: true}).fill('3');
    await openHabitMoreOptions(page);
    await page.getByRole('combobox', {name: 'Habit type', exact: true}).selectOption('limit');
    await page.getByRole('textbox', {name: 'Target value', exact: true}).fill('2');
    await page.getByRole('button', {name: 'Create habit', exact: true}).click();
    const snacks = card(page, 'Snacks');
    await expect(snacks.locator('.habit-count')).toHaveText('0 of at most 2 times today');
    await expect(snacks.locator('.habit-period-progress')).toHaveText('0 of 3 days within the limit this week');
  });

  test('N-056/NB-082/NB-142/NB-200: an automatic water tick counts what Health holds, on the card and in its note', async ({page}) => {
    await logWaterOnHealth(page, 2000);
    await newHabitForm(page);
    await page.getByLabel('Start from template').selectOption('water');
    await page.getByRole('button', {name: 'Create habit', exact: true}).click();
    const water = card(page, 'Drink water');
    await expect(water.locator('.habit-auto-badge')).toContainText('from your water journal · 2,000 mL');
    // The card's counter ends with the habit's period, as every daily card reads ("0.5 / 2 liters per day" below).
    await expect(water.locator('.habit-count')).toHaveText('2 / 2 liters per day');
    await logWaterOnHealth(page, 250);
    await open(page, '/app/habits');
    await expect(water.locator('.habit-auto-badge')).toContainText('2,250 mL');
    await expect(water.locator('.habit-count')).toHaveText('2.25 / 2 liters per day');
  });

  test('MO-123 (L2 request): a one-tap "Drink water" reads the water already logged and says where it comes from', async ({page}) => {
    await logWaterOnHealth(page, 500);
    await open(page, '/app/habits');
    await page.getByRole('group', {name: 'Start with an idea'}).getByRole('button', {name: /^Add Drink water:/}).click();
    const water = card(page, 'Drink water');
    await expect(water.locator('.habit-count')).toHaveText('0.5 / 2 liters per day');
    await expect(water.locator('.habit-health-so-far')).toHaveText('Counting from your water journal · 500 mL so far; it ticks itself off at the target.');
  });

  test('N-085 (L2 request): the Exercise habit offers Health\'s activity types and keeps the choice in the day\'s note', async ({page}) => {
    await newHabitForm(page);
    await page.getByLabel('Start from template').selectOption('exercise');
    await page.getByRole('button', {name: 'Create habit', exact: true}).click();
    const exercise = card(page, 'Exercise');
    await exercise.locator('summary[aria-label="Details for Exercise"]').click();
    await exercise.locator('summary[aria-label="Exercise: set or add a value"]').click();
    const activity = exercise.getByLabel('Activity (optional)');
    const options = await page.locator(`datalist#${await activity.getAttribute('list')} option`).evaluateAll(list => list.map(o => (o as HTMLOptionElement).value));
    expect(options).toEqual(expect.arrayContaining(['Run', 'Cycling', 'Yoga', 'Strength training']));
    await exercise.getByLabel('Value for Exercise').fill('30');
    await activity.fill('Run');
    await exercise.getByRole('button', {name: 'Set value', exact: true}).click();
    await expect(exercise.locator('.habit-count')).toContainText('30');
    const note = await page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:habits:v1') ?? 'null')?.habits ?? []).find((h: {title: string}) => h.title === 'Exercise')?.entries?.at(-1)?.note);
    expect(note).toBe('Activity: Run');
  });

  test('NB-201: the page rules offer only what a habit cannot watch itself, and say where the rest is', async ({page}) => {
    await createHabit(page, 'Gym');
    await page.getByRole('button', {name: 'Set up rules', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Workout and contribution rules'})).toBeVisible();
    await expect(page.locator('.habit-auto-rules')).toContainText('edit the habit and choose “Done automatically when”');
    const when = page.locator('.auto-rules-form select').first();
    await expect(when.locator('option')).toHaveText(['A workout', 'A contribution to a goal']);
  });

  test('NB-133: Duplicate habit adds a copy with no history; its Undo takes the copy away', async ({page}) => {
    const read = await createHabit(page, 'Read');
    await read.getByRole('button', {name: 'Complete Read', exact: true}).click();
    await read.getByRole('button', {name: 'Options for Read'}).click();
    await read.getByRole('group', {name: 'Read options'}).getByRole('button', {name: 'Duplicate Read'}).click();
    const copy = card(page, 'Read (copy)');
    await expect(copy).toBeVisible();
    await expect(copy.locator('.habit-result')).toHaveText('Due');
    await expect(toast(page)).toContainText('“Read (copy)” added');
    await toast(page).getByRole('button', {name: /^Undo/}).click();
    await expect(copy).toHaveCount(0);
    await expect(read.locator('.habit-result')).toHaveText('Complete');
  });

  test('NB-177: a 200-character title is cut to 100 and the cut is said; DV-242: a quit habit has no Measurement to choose', async ({page}) => {
    await newHabitForm(page);
    const title = page.getByLabel('Habit title', {exact: true});
    await title.fill('a'.repeat(200));
    await expect(title).toHaveValue('a'.repeat(100));
    await expect(page.locator('.habit-title-cut')).toContainText('Your title had 200 characters');
    await title.fill('No sugar');
    await openHabitMoreOptions(page);
    await page.getByRole('combobox', {name: 'Habit type', exact: true}).selectOption('quit');
    await expect(page.getByRole('combobox', {name: 'Measurement', exact: true})).toHaveCount(0);
    await expect(page.getByText('counted in the unit above')).toBeVisible();
  });

  test('D-107/NB-071: the History calendar keeps a reading width (no 119 px cells); DV-187: the delete text is short and keeps nothing', async ({page}) => {
    const stretch = await createHabit(page, 'Stretch');
    await stretch.locator('summary[aria-label="Details for Stretch"]').click();
    // D-107: with no area chosen, the area chip says what it does.
    await expect(stretch.getByRole('button', {name: 'Area for Stretch: none'})).toHaveText('◈ Choose an area');
    await stretch.getByText('History & reflection', {exact: true}).click();
    const day = stretch.locator('.habit-calendar-day').first();
    await expect(day).toBeVisible();
    const box = (await day.boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(72);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await stretch.getByRole('button', {name: 'Options for Stretch'}).click();
    await stretch.getByRole('group', {name: 'Stretch options'}).getByRole('button', {name: 'Archive habit…'}).click();
    await stretch.getByRole('alertdialog').getByRole('button', {name: 'Archive habit', exact: true}).click();
    await expect(toast(page)).toContainText('Stretch is archived today.');
    await page.getByRole('group', {name: 'Filter habits'}).getByRole('button', {name: 'Archived', exact: true}).click();
    if (!await stretch.locator('details.habit-more').evaluate(el => (el as HTMLDetailsElement).open)) await stretch.locator('summary[aria-label="Details for Stretch"]').click();
    await stretch.getByRole('button', {name: 'Delete for good…', exact: true}).click();
    const confirm = stretch.getByRole('form', {name: 'Delete Stretch for good'});
    await expect(confirm).toContainText('Backups you made earlier, your notes and ZIGi’s past chats still hold what they had.');
    await expect(confirm).not.toContainText('placeholder');
  });
});

test.describe('Showcase at 01:26', () => {
  test.use({viewport: {width: 1440, height: 900}});
  test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-04T00:26:00Z')}); await showcase(page); await open(page, '/app/habits'); });

  test('D-220/B-163/N-086: Walk counts the steps Health holds, the same number as its note', async ({page}) => {
    const walk = card(page, 'Walk');
    const note = walk.locator('.habit-auto-badge');
    await expect(note).toBeVisible();
    const noted = (await note.textContent())!.match(/· ([\d,]+) steps/)?.[1];
    expect(noted).toBeTruthy();
    await expect(walk.locator('.habit-count strong')).toHaveText(noted!);
  });

  test('PR-010: a streak beside a day still open says today is still open', async ({page}) => {
    const exercise = card(page, 'Exercise');
    await exercise.locator('summary[aria-label="Details for Exercise"]').click();
    await exercise.locator('summary[aria-label="Consistency & trends for Exercise"]').click();
    await expect(exercise.locator('.habit-result')).toHaveText('Partial');
    await expect(exercise.locator('.habit-streak-open')).toHaveText('Up to yesterday; today is still open and counts once it is done.');
  });

  test('N-171: a habit that supports a goal names it on its card, without opening Details', async ({page}) => {
    // The bot's step: a goal's "Add weekly Goal review habit", then the habit's card. No Showcase habit carries a goal
    // link of its own (lib/showcase-data.ts), so the spec adds the review habit as the bot did.
    await open(page, '/app/goals');
    await page.getByRole('link', {name: 'Open Goal →'}).first().click();
    await page.waitForURL(/\/app\/goals\/tracked\/[^/?#]+$/, {waitUntil: 'commit'});
    await expect(page.locator('main h1').first()).not.toHaveText('Your Goals');
    const goalName = (await page.locator('main h1').first().textContent())!.trim();
    const supporting = page.locator('#supporting-habits');
    if (!await supporting.evaluate(el => el instanceof HTMLDetailsElement ? el.open : true)) await supporting.locator('summary').first().click();
    await supporting.getByRole('button', {name: 'Add weekly Goal review habit', exact: true}).click();
    await expect(supporting.getByRole('heading', {name: `Review ${goalName}`})).toBeVisible();
    await open(page, '/app/habits');
    // A Monday habit is not due on this Wednesday, so the Today filter leaves it out; "Goal linked" lists it.
    await page.getByRole('group', {name: 'Filter habits'}).getByRole('button', {name: 'Goal linked', exact: true}).click();
    const linked = card(page, `Review ${goalName}`);
    await expect(linked).toBeVisible();
    await expect(linked.locator('.habit-goal-link a')).toBeVisible();
    await expect(linked.locator('.habit-goal-link a')).toHaveText(`Supports ${goalName} ↗`);
  });
});
