import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL third pass (lane L6): Professor PR-032 / PR-034 / X3-27 (AL-HELP-006, P-PR-30), Lisbon N-LA-07 (P-LA-31) and
// the Help part of Denver C-DVG-87 (GAP-165). Fresh profile (the notice shows), desktop 1280. Fails on main, passes on the branch.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('X3-27: Help quotes the notice the top of the page shows', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const notice = page.getByRole('complementary', {name: 'Alpha notice'});
  await expect(notice).toContainText('PUBLIC ALPHA');
  await expect(notice).toContainText('Your records stay in this browser and are not a backup.');
  await page.goto('/app/help#help-z-alpha');
  const answer = page.locator('#help-z-alpha');
  await expect(answer).toHaveAttribute('open', '');
  await expect(answer).toContainText('The notice reads PUBLIC ALPHA “Your records stay in this browser and are not a backup.”');
});

test('PR-032: Known limitations says the Lichess limit is about starting a game, and blitz ratings still show', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const limits = page.locator('#known-limitations');
  await expect(limits).not.toContainText('Lichess games found from ZIGoals are rapid or classical only');
  await expect(limits).toContainText('A new Lichess game started from ZIGoals is rapid or classical only');
  await expect(limits).toContainText('Your blitz and bullet ratings and finished games are still read and shown in Chess');
});

test('PR-034: What\'s new opens with this version — NOVA, Notes, Tasks, the Checklist — and each link opens its answer', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const list = page.locator('#whats-new-alpha .help-whats-new-now');
  // Session AP (deliberate): this release's nine lines come first (the first five, the day rule, Bento, the floating
  // buttons, Settings folded, planning, money, Health, Send feedback's details); Session AM's NOVA stage line follows;
  // the twelve before them stay, each still opening its answer (12 → 22 with both sessions).
  // Session AT (ADR-043 D15, deliberate): two lines first, NOVA's answers and the example pictures, each opening its answer (22 → 24).
  // Session AV (ADR-045 Part 8, deliberate): three lines first, keeping your records on your phone, new versions and the
  // import's categories, each opening its answer (24 → 27); Part 7 adds the Journal's question of the day and the bills' yearly total (27 → 29).
  // Session AV follow-up 1 (F-TASK-NOTIFY, F-NL-TASKS, deliberate): task reminders as notifications, Dutch in the task line, three good things, journal tags, tasks finished per day, this month vs last, every factor, budget targets, the bill calendar, workouts by week, the review's tasks, running bests, where income went, deadlines, the debt planner's own order, a pasted list of tasks, just the calories, yesterday's open habits, money that asks for a look, money search, a category offered, never missed twice, today's focus habit, a meal in words matched, a habit's symbol, the sleep score's parts, foods high in a nutrient, a meal planned on weekdays, the habit week grid, a watched category, what got in the way, today's journal line (29 → 61).
  await expect(list.getByRole('link')).toHaveCount(61);
  await expect(list.getByRole('link', {name: /^Today’s journal card says what you wrote/})).toHaveAttribute('href', '#help-av-journal-today');
  await expect(list.getByRole('link', {name: /^What got in the way of yesterday/})).toHaveAttribute('href', '#help-av-miss-reason');
  await expect(list.getByRole('link', {name: /^Watch a category without a budget/})).toHaveAttribute('href', '#help-av-watch');
  await expect(list.getByRole('link', {name: /^Your habits this week, Monday to Sunday/})).toHaveAttribute('href', '#help-av-week-grid');
  await expect(list.getByRole('link', {name: /^Plan a meal on chosen weekdays/})).toHaveAttribute('href', '#help-av-repeat-plan');
  await expect(list.getByRole('link', {name: /^Foods high in iron, fibre or calcium/})).toHaveAttribute('href', '#help-av-high-in');
  await expect(list.getByRole('link', {name: /^The sleep score counts wake times/})).toHaveAttribute('href', '#help-av-sleep-score');
  await expect(list.getByRole('link', {name: /^A symbol and a colour for each habit/})).toHaveAttribute('href', '#help-av-habit-look');
  await expect(list.getByRole('link', {name: /^A meal in words, turned into foods/})).toHaveAttribute('href', '#help-av-words-match');
  await expect(list.getByRole('link', {name: /^Pick one habit as today’s focus/})).toHaveAttribute('href', '#help-av-focus-habit');
  await expect(list.getByRole('link', {name: /^Never missed twice/})).toHaveAttribute('href', '#help-av-two-day');
  await expect(list.getByRole('link', {name: /^The category a payee had before/})).toHaveAttribute('href', '#help-av-category-suggest');
  await expect(list.getByRole('link', {name: /^Search all your money entries/})).toHaveAttribute('href', '#help-av-money-search');
  await expect(list.getByRole('link', {name: /^Today says what in your money asks/})).toHaveAttribute('href', '#help-av-money-attention');
  await expect(list.getByRole('link', {name: /^Yesterday’s open habits/})).toHaveAttribute('href', '#help-av-yesterday');
  await expect(list.getByRole('link', {name: /^Log just the calories/})).toHaveAttribute('href', '#help-av-quick-kcal');
  await expect(list.getByRole('link', {name: /^Paste a list in Tasks/})).toHaveAttribute('href', '#help-av-paste-list');
  await expect(list.getByRole('link', {name: /^The debt planner: your own order/})).toHaveAttribute('href', '#help-av-debt-plan');
  await expect(list.getByRole('link', {name: /^A deadline on a task/})).toHaveAttribute('href', '#help-av-deadlines');
  await expect(list.getByRole('link', {name: /^Where this month’s income went/})).toHaveAttribute('href', '#help-av-income-flow');
  await expect(list.getByRole('link', {name: /^Your running bests/})).toHaveAttribute('href', '#help-av-run-bests');
  await expect(list.getByRole('link', {name: /^The weekly review looks at Tasks/})).toHaveAttribute('href', '#help-av-review-tasks');
  await expect(list.getByRole('link', {name: /^Your last 12 weeks of workouts/})).toHaveAttribute('href', '#help-av-workout-weeks');
  await expect(list.getByRole('link', {name: /^Your bills on a calendar/})).toHaveAttribute('href', '#help-av-bill-calendar');
  await expect(list.getByRole('link', {name: /^A budget can save towards an amount/})).toHaveAttribute('href', '#help-av-budget-targets');
  await expect(list.getByRole('link', {name: /^What goes with your mood, sleep and energy/})).toHaveAttribute('href', '#help-av-factors');
  await expect(list.getByRole('link', {name: /^Each spending category against last month/})).toHaveAttribute('href', '#help-av-vs-last');
  await expect(list.getByRole('link', {name: /^How many tasks you finished/})).toHaveAttribute('href', '#help-av-tasks-done');
  await expect(list.getByRole('link', {name: /^Tags on journal entries/})).toHaveAttribute('href', '#help-av-journal-tags');
  await expect(list.getByRole('link', {name: /^Three good things in one go/})).toHaveAttribute('href', '#help-av-good-things');
  await expect(list.getByRole('link', {name: /^Write a task in Dutch/})).toHaveAttribute('href', '#help-av-nl-tasks');
  await expect(list.getByRole('link', {name: /^Task reminders as notifications/})).toHaveAttribute('href', '#help-av-task-notify');
  await expect(list.getByRole('link', {name: /^What your bills come to in a year/})).toHaveAttribute('href', '#help-av-bills-year');
  await expect(list.getByRole('link', {name: /^A question a day in your Journal/})).toHaveAttribute('href', '#help-av-prompt-day');
  await expect(list.getByRole('link', {name: /^Keep your records safe on your phone/})).toHaveAttribute('href', '#help-av-keep');
  await expect(list.getByRole('link', {name: /^A new version arrives without losing your place/})).toHaveAttribute('href', '#help-av-updates');
  await expect(list.getByRole('link', {name: /^Check each category before an import/})).toHaveAttribute('href', '#help-av-import-categories');
  await expect(list.getByRole('link', {name: /^NOVA answers the question you ask/})).toHaveAttribute('href', '#help-nova-answers');
  await expect(list.getByRole('link', {name: /^Example pictures of the main pages/})).toHaveAttribute('href', '#help-at-screens');
  await expect(list.getByRole('link', {name: /^NOVA makes a widget for what you ask/})).toHaveAttribute('href', '#help-nova-stage');
  for (const name of [/^NOVA: your private command center/, /^Notes that link/, /^Tasks with a calendar import/, /^The Checklist: your day as one path/]) await expect(list.getByRole('link', {name})).toBeVisible();
  for (const link of await list.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await list.getByRole('link', {name: /^Tasks with a calendar import/}).click();
  await expect(page).toHaveURL(/#help-tasks-what$/);
  await expect(page.locator('#help-tasks-what')).toHaveAttribute('open', '');
});

test('N-LA-07: Help lists the private screens that pause ZIGi, and why', async ({page}) => {
  await page.goto('/app/help#help-your-ai-private'); await hydrated(page);
  const answer = page.locator('#help-your-ai-private');
  await expect(answer).toHaveAttribute('open', '');
  for (const words of ['the Checklist', 'the screen cover', 'your recovery secret', 'a one-time code', 'Why:', 'Show my checklist']) await expect(answer).toContainText(words);
});

test('C-DVG-87: every Help topic says when it was last updated', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const topics = page.locator('section.help-section');
  const count = await topics.count();
  expect(count).toBeGreaterThan(15);
  await expect(page.locator('section.help-section .help-updated')).toHaveCount(count);
  await expect(page.locator('#known-limitations .help-updated')).toHaveText(/^Last updated (Nov|Oct|Dec) \d{1,2}, 2026( or earlier)?$/);
});
