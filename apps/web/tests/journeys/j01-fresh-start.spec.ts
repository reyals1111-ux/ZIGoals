import {at, inTheme, JOURNEY_THEMES, themedTitle, expect, hydrated, nextDay, offlineApis, stored, strayRequests, ZONE} from './journey-helpers';
import {test, type Page} from '@playwright/test';
import {typeGoalName} from '../goal-name';

/**
 * Session AK F2, journey 1: a brand-new person over one week. Monday: the welcome on Today, the setup with a first goal,
 * a first habit made by hand, starred onto the Checklist and ticked there, and a first contribution recorded on the goal.
 * Tuesday and Thursday: the habit ticked on Habits. Sunday: the weekly review in the Life review shows the week's own
 * numbers and is saved. Fictional names; the clock is simulated; no request leaves the app.
 */
test.use({actionTimeout: 20_000, timezoneId: ZONE, storageState: {cookies: [], origins: []}});
// Session AK G4: on the desktop and the phone, in Nebula, Light and Dark (inTheme() in journey-helpers.ts).
const GOAL = 'Fictional Lisbon trip', HABIT = 'Fictional evening walk';
const habitsOf = (page: Page) => stored<{habits: {title: string; entries: {date: string; count: number}[]}[]}>(page, 'zigoals:habits:v1');

for (const theme of JOURNEY_THEMES) test(themedTitle('@journey 1 fresh start: welcome → setup with a first goal → first habit → Checklist → a contribution → the weekly review', theme), inTheme(theme, async ({page}) => {
  test.setTimeout(180_000);
  const stray = strayRequests(page);
  await page.clock.install({time: at('2026-11-02', '09:00')});
  await offlineApis(page);

  // Monday: the welcome card on Today leads to the setup.
  await page.goto('/app'); await hydrated(page);
  const welcome = page.getByRole('region', {name: 'Set up your first goal and habit in about a minute.'});
  await expect(welcome).toBeVisible();
  // Session AK X1 (RELEASE_REVIEW R2, R8): a fresh start meets no wallet button and no chain words in the Alpha line.
  await expect(page.getByRole('button', {name: /Connect Keplr|Demo records/})).toHaveCount(0);
  await expect(page.getByRole('complementary', {name: 'Alpha notice'}).locator('strong')).toHaveText('PUBLIC ALPHA');
  await welcome.getByRole('link', {name: 'Start setup', exact: true}).click();
  await page.waitForURL('**/app/welcome');
  const flow = page.locator('main');
  const step = (title: string) => expect(flow.getByRole('heading', {level: 1, name: title})).toBeFocused();
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await step('What do you want to improve?');
  await flow.getByRole('checkbox', {name: /^Habits/}).check();
  await flow.getByRole('checkbox', {name: /^Goals & money/}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('Two or three things to focus on.');
  await flow.getByRole('button', {name: 'Continue without choosing', exact: true}).click();
  await step('A few things to start with.');
  await flow.getByRole('radio', {name: 'A trip', exact: true}).check();
  await typeGoalName(flow, GOAL);
  await flow.getByLabel('Target amount').fill('1200');
  await flow.getByRole('radio', {name: 'EUR', exact: true}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('A quick look around.');
  await flow.getByRole('button', {name: 'Skip the tour', exact: true}).click();
  await step('Keep ZIGoals on your Home Screen.');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('Meet ZIGi.');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('Your data, your control.');
  await expect(flow.getByRole('region', {name: 'When you finish'})).toContainText(`Your goal “${GOAL}”.`);
  await flow.getByRole('button', {name: 'Finish setup', exact: true}).click();
  await page.waitForURL(/\/app$/);
  await expect(welcome).toHaveCount(0);
  const goals = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:platform:v1')!).goals as {id: string; name: string; target: string}[]);
  expect(goals.filter(g => g.name === GOAL)).toEqual([expect.objectContaining({target: '120000'})]);

  // The first habit, made by hand on Habits.
  await page.goto('/app/habits'); await hydrated(page);
  await page.getByRole('button', {name: /^(\+ New habit|Create a habit)$/}).first().click();
  await page.getByLabel('Habit title', {exact: true}).fill(HABIT);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: HABIT, exact: true});
  await expect(card).toBeVisible();

  // Starred onto the Checklist, ticked there: the habit's own record says done.
  await card.getByRole('button', {name: `Star ${HABIT} for your Checklist path`, exact: true}).click();
  await expect(card.getByRole('button', {name: `${HABIT} is on your Checklist path. Take it off`, exact: true})).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/app/checklist'); await hydrated(page);
  await expect(page.locator('.checklist-progress-line')).toContainText('0 of 1 planet today');
  await page.getByRole('button', {name: `${HABIT}: not done yet`, exact: true}).click();
  await expect(page.locator('.checklist-progress-line')).toContainText('1 of 1 planet today');
  const party = page.locator('dialog.checklist-celebration');
  if (await party.isVisible().catch(() => false)) { await page.keyboard.press('Escape'); await expect(party).toHaveCount(0); }
  await expect.poll(async () => (await habitsOf(page))!.habits[0]!.entries.map(e => [e.date, e.count])).toEqual([['2026-11-02', 1]]);

  // A first contribution, recorded on the goal's own page.
  await page.goto('/app/goals'); await hydrated(page);
  await page.getByRole('link', {name: GOAL}).first().click();
  await page.getByRole('button', {name: 'Record contribution', exact: true}).click();
  await page.getByRole('button', {name: 'Record history only', exact: true}).click();
  await page.getByLabel(/^Actual amount in /).fill('50');
  await page.getByRole('button', {name: 'Save history only', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Goal timeline'})).toContainText('Contribution recorded');
  const contributions = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:platform:v1')!).contributions as {direction: string; quantity: string}[]);
  expect(contributions).toEqual([expect.objectContaining({direction: 'IN', quantity: '5000'})]);

  // Tuesday and Thursday: the habit ticked on Habits; each day starts Due.
  for (const day of ['2026-11-03', '2026-11-05']) {
    await nextDay(page, at(day, '20:00'), '/app/habits');
    const today = page.getByRole('article', {name: HABIT, exact: true});
    await expect(today.locator('.habit-result')).toHaveText('Due');
    await today.getByRole('button', {name: `Complete ${HABIT}`, exact: true}).click();
    await expect(today.locator('.habit-result')).toHaveText('Complete');
  }
  // The card paints "Complete" first and then saves the same change (components/habits/use-habits.ts, habitCheckIn), so
  // the record is read until the save lands, as the Checklist tick above is. Session AK G4 (on the phone): Tuesday's tick,
  // left at once for Thursday, was lost; a save on the way out now writes at once (components/use-private-store.ts;
  // tests/habit-paint-first.spec.ts holds the regression).
  await expect.poll(async () => (await habitsOf(page))!.habits[0]!.entries.map(e => e.date).sort()).toEqual(['2026-11-02', '2026-11-03', '2026-11-05']);

  // Sunday: the weekly review, in the Life review, with the week's own numbers.
  await nextDay(page, at('2026-11-08', '18:00'), '/app/review');
  const reviewCard = page.getByRole('region', {name: 'A short look back at your week.'});
  await expect(reviewCard).toBeVisible();
  await reviewCard.getByRole('button', {name: 'Start review', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Your week'});
  await expect(dialog.getByRole('heading', {level: 3})).toHaveText('What went well');
  await expect(dialog).toContainText('3 habit check-ins');
  const next = dialog.getByRole('button', {name: 'Next', exact: true}), counter = dialog.getByText(/^Step \d+ of \d+$/);
  await next.click();
  await expect(dialog.getByRole('heading', {level: 3})).toHaveText('Goals');
  await expect(dialog).toContainText(GOAL);
  await next.click();
  await expect(dialog.getByRole('heading', {level: 3})).toHaveText('Habits');
  await expect(dialog).toContainText(new RegExp(`${HABIT} · 3 of \\d+`));
  while (await next.count()) { const before = await counter.textContent(); await next.click(); await expect(counter).not.toHaveText(before!); }
  await expect(dialog.getByRole('heading', {level: 3})).toHaveText('One intention');
  await dialog.getByLabel('Your words, if you like').fill('Walk on Saturday too');
  await dialog.getByRole('button', {name: 'Finish review', exact: true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(/Your reflection for .* is saved on this device\.|Review saved on this device\./).first()).toBeVisible();
  expect(stray).toEqual([]);
}));
