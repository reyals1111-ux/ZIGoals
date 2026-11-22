import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';
import {chooseChain} from '../../chain-choice';

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
  // Session AV follow-up 1 (F-TASK-NOTIFY, F-NL-TASKS, deliberate): task reminders as notifications, Dutch in the task line, three good things, journal tags, tasks finished per day, this month vs last, every factor, budget targets, the bill calendar, workouts by week, the review's tasks, running bests, where income went, deadlines, the debt planner's own order, a pasted list of tasks, just the calories, yesterday's open habits, money that asks for a look, money search, a category offered, never missed twice, today's focus habit, a meal in words matched, a habit's symbol, the sleep score's parts, foods high in a nutrient, a meal planned on weekdays, the habit week grid, a watched category, what got in the way, today's journal line, a journal entry's day, move and value alerts, hidden calorie and weight figures, a budget's pace, plan my day, a task's minutes, a set's best, the workout calendar, bills this month, matrix lines and a paused repeat, yearly countdowns, own journal templates, sleep over a year, nutrient ranges, symptoms in the report, a month in short (29 → 77).
  // Session AV follow-up 2 (1d, deliberate test change, equally strict): the session's 53 lines became six, one per pillar
  // (77 → 30). Each line opens its own answer; each answer is checked to name its parts, and every one of the 53 answers
  // it replaced is still on the page, each opening by its own link as before.
  await expect(list.getByRole('link')).toHaveCount(30);
  const groups: [string, string, string[]][] = [["av-new-tasks", "Tasks: ", ["task-notify", "nl-tasks", "tasks-done", "review-tasks", "deadlines", "paste-list", "plan-day", "task-minutes", "matrix-pause", "countdown-yearly"]], ["av-new-money", "Money: ", ["vs-last", "budget-targets", "budget-pace", "bill-calendar", "bills-month", "bills-year", "income-flow", "debt-plan", "money-attention", "money-search", "category-suggest", "watch", "move-alert", "month-recap", "import-categories"]], ["av-new-health", "Health: ", ["quick-kcal", "words-match", "high-in", "repeat-plan", "nutrient-range", "hide-figures", "sleep-score", "sleep-long", "workout-weeks", "workout-calendar", "run-bests", "set-best", "factors", "report-more"]], ["av-new-habits", "Habits: ", ["yesterday", "miss-reason", "two-day", "focus-habit", "habit-look", "week-grid"]], ["av-new-journal", "Journal: ", ["prompt-day", "good-things", "journal-tags", "own-templates", "journal-today", "journal-day"]], ["av-new-data", "Your records: ", ["keep", "updates"]]];
  for (const [id, starts, parts] of groups) {
    await expect(list.getByRole('link', {name: new RegExp(`^${starts}`)})).toHaveAttribute('href', `#help-${id}`);
    await expect(page.locator(`#help-${id}`)).toHaveCount(1);
    // Session AV lane 2 (fixb1b; PK-10, owner decision 21 Nov: chain answers wait for the chain choice, deliberate): on
    // this fresh profile the coin-move and portfolio-value alerts (a chain answer, lib/help/chain-help.ts) are not on the
    // page and the Money group does not name them; every other part is, as before. The end of this test chooses the chain
    // and checks that answer is there and named, so all 53 are still checked.
    for (const part of parts) await expect(page.locator(`#help-av-${part}`), part).toHaveCount(part === 'move-alert' ? 0 : 1);
  }
  expect(groups.flatMap(g => g[2])).toHaveLength(53);
  await expect(page.locator('#help-av-new-money')).not.toContainText('alerts on a percent move');
  await list.getByRole('link', {name: /^Money: /}).click();
  await expect(page).toHaveURL(/#help-av-new-money$/);
  await expect(page.locator('#help-av-new-money')).toHaveAttribute('open', '');
  await expect(page.locator('#help-av-new-money')).toContainText('the debt planner in your own order');
  await expect(list.getByRole('link', {name: /^NOVA answers the question you ask/})).toHaveAttribute('href', '#help-nova-answers');
  await expect(list.getByRole('link', {name: /^Example pictures of the main pages/})).toHaveAttribute('href', '#help-at-screens');
  await expect(list.getByRole('link', {name: /^NOVA makes a widget for what you ask/})).toHaveAttribute('href', '#help-nova-stage');
  for (const name of [/^NOVA: your private command center/, /^Notes that link/, /^Tasks with a calendar import/, /^The Checklist: your day as one path/]) await expect(list.getByRole('link', {name})).toBeVisible();
  for (const link of await list.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await list.getByRole('link', {name: /^Tasks with a calendar import/}).click();
  await expect(page).toHaveURL(/#help-tasks-what$/);
  await expect(page.locator('#help-tasks-what')).toHaveAttribute('open', '');
  // Once the chain is chosen (as Settings → Your pages & buttons does), the alerts answer is on the page and the Money
  // group names it (Session AV lane 2, fixb1b, deliberate).
  await chooseChain(page);
  await page.goto('/app/help'); await hydrated(page);
  await expect(page.locator('#help-av-move-alert')).toHaveCount(1);
  await expect(page.locator('#help-av-new-money')).toContainText('alerts on a percent move and on a portfolio’s value; a month in short');
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
