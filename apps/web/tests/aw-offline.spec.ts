import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {expect, test, type BrowserContext, type Page} from '@playwright/test';
import {hydrated} from './ah-helpers';
import {moreViews} from './fr-layout-helpers';
import {openDeskFold} from './ao/folds';
import {openPhoneRow} from './phone-length-folds';
import {entry, moneyLog, openWealthSection, spending} from './ap/ap-money-fixtures';
import {health, healthRecord, AT as HEALTH_AT, TODAY as HEALTH_TODAY, back} from './ap/ap-health-fixtures';
import {createEmptyHealth, saveActivity, saveFood, saveRecipe, HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {planFromRecipe} from '../lib/health-aa/planner';
import {withHealthGroup, healthGroupIn} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import {vitalDaySchema} from '../lib/vitals/schema';
import {addLocalDays} from '../lib/local-date';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {tasksSchema, TASKS_KEY, type Tasks} from '../lib/tasks/schema';
import {TASK_PLAN_KEY} from '../lib/tasks/plan-key';
import {TASK_TEMPLATES_KEY} from '../lib/tasks/templates';
import {FOCUS_SESSIONS_KEY} from '../lib/focus-sessions/schema';
import {TIMERS_KEY} from '../lib/timers/store';
import {NOTIFY_KEY} from '../lib/notify/prefs';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {MONEY_REMOVED_KEY, type MoneyRemoved} from '../lib/money-log/removed';
import {BILLS_KEY, type BillsRecord} from '../lib/bills/schema';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {WEALTH_SHEET_KEY} from '../lib/wealth-sheet/schema';
import {STORE_CARDS_KEY, type StoreCards} from '../lib/store-cards/schema';
import {BODY_EXTRAS_KEY} from '../lib/body-extras/schema';
import {SLEEP_GOAL_PERIOD_KEY} from '../lib/sleep/goal-period';
import {EVENING_PLAN_KEY} from '../lib/evening-plan/schema';
import {ACTIVITY_EXTRAS_KEY} from '../lib/aw-kcal/activity-extras';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {PLANNED_KEY} from '../lib/workouts/planned';
import {RACES_KEY} from '../lib/workouts/races';
import {LOW_DAY_KEY} from '../lib/calm/low-day';
import {FOOD_PLUS_KEY} from '../lib/food-plus/schema';
import {GROCERY_KEY} from '../lib/grocery/schema';
import {GUIDED_JOURNEYS_KEY} from '../lib/guided/schema';
import {NOTES_KEY} from '../lib/notes/schema';
import {NOTE_SEARCHES_KEY} from '../lib/notes/saved-searches';
import {NOTE_CARDS_KEY} from '../lib/notes/cards';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {JOURNAL_DISPLAY_KEY} from '../lib/on-this-day/store';
import {emptyPlatform, privateGoalSchema, PLATFORM_KEY, type Platform} from '../lib/positions';
import {fundGoal} from '../lib/contribution-funding';
import {newOwnUnitPosition} from '../lib/goals/goal-units';
import {GOAL_REPEAT_KEY} from '../lib/goals/repeat';
import {BRING_UP_KEY} from '../lib/clinician-report/bring-up';

/**
 * Session AW Part 6 (owner amendment 7): the new records and screens of Sessions AV (lanes 1 and 2) and AW, offline. A
 * person has installed the app (this build's service worker controls the page; it has kept the parts the app's pages
 * load after their first paint, `/__zigoals-warm-done`) and opened each page once while online — only the page, no fold,
 * sheet or form of it — until it settled (the page asked the worker to keep what it opens on a tap: public/sw.js
 * warmPage, its marker `/__zigoals-warm-done?page=<address>`). Then the connection goes, and each page opens from the device: no "This page could not be shown",
 * no "… needs a connection to open", the new feature's control is there, one thing is written with it, and after a reload
 * (still offline) the record is on the device. The same steps as tests/av-offline-later-parts.spec.ts (the worker
 * allowed, every /api call answered 503, the controller and the warm-done marker waited for, then the context offline).
 * Several pages per test, each test well under its 120 s with tracing. Desktop and the phone project; Nebula only.
 * Fictional data; nothing leaves 127.0.0.1.
 */
test.use({serviceWorkers: 'allow', timezoneId: 'UTC'});

const stored = <T = unknown>(page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key) as Promise<T>;
const orEmpty = <T>(value: T | null | undefined): T => value ?? ({} as T);

/** Installed, the clock at `at`: the worker controls the page and has kept this version's later parts. */
async function installed(page: Page, context: BrowserContext, isMobile: boolean, at: string) {
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  // A step that cannot act says which step it was (rather than the test's 120 s).
  page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(45_000);
  await context.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.clock.install({time: new Date(at)});
  await page.addInitScript(() => { if (!localStorage.getItem('zigoals:onboarding:v1')) localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.goto('/app');
  await hydrated(page);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {timeout: 20_000}).toBe(true);
  await expect.poll(() => page.evaluate(async () => {
    for (const key of await caches.keys()) if (key.startsWith('zigoals-lazy-') && await (await caches.open(key)).match('/__zigoals-warm-done')) return true;
    return false;
  }), {timeout: 60_000, intervals: [1000]}).toBe(true);
}
/** Records written straight into this device's storage (strings as they are, anything else as JSON). */
async function seed(page: Page, records: Record<string, unknown>) {
  await page.evaluate(list => { for (const [k, v] of list) localStorage.setItem(k, v); }, Object.entries(records).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)] as [string, string]));
}
/** Each page opened once while online, as a person would: the page only, until it settled (its worker marker is there). */
async function openedOnline(page: Page, paths: readonly string[]) {
  for (const path of paths) {
    await page.goto(path);
    await hydrated(page);
    await expect(page.locator('main').first()).toBeVisible();
    await expect.poll(() => page.evaluate(async () => {
      const marker = '/__zigoals-warm-done?page=' + encodeURIComponent(location.pathname + location.search);
      for (const key of await caches.keys()) if (key.startsWith('zigoals-lazy-') && await (await caches.open(key)).match(marker)) return true;
      return false;
    }), {timeout: 45_000, intervals: [1000], message: `${path}: the worker kept what the page opens on a tap`}).toBe(true);
  }
}
/** The page drew from the device: not the worker's "You are offline" page, not the app's error page. */
async function shown(page: Page) {
  await expect(page.getByRole('heading', {name: 'You are offline', exact: true}), `${page.url()}: the page was kept on the device`).toHaveCount(0);
  await hydrated(page);
  await expect(page.getByRole('heading', {name: 'This page could not be shown.'})).toHaveCount(0);
  await expect(page.locator('main').first()).toBeVisible();
}
async function openOffline(page: Page, path: string) {
  await page.goto(path);
  await shown(page);
}
/** No part of the page that was opened offline said it needs a connection (its code was kept for offline use). */
async function kept(page: Page) {
  await expect(page.locator('main').getByText(/needs a connection to open\./), `${page.url()}: every part opened offline was kept`).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'This page could not be shown.'})).toHaveCount(0);
}
async function reloadOffline(page: Page) {
  await page.reload();
  await shown(page);
}

// ---- Tasks and Today (round 7 X1, X2; AV lane 2's repeating projects) -----------------------------------------------
const MON = '2026-11-23';
function tasksRecord(): Tasks {
  const at = '2026-11-16T08:00:00.000Z';
  return tasksSchema.parse({version: 1, projects: [{id: 'project_book', name: 'Fictional book', colour: 'teal', order: 0}], tasks: [
    {id: 'task_tax', title: 'Fictional tax form', priority: 'normal', due: MON, createdAt: at, dread: 3},
    {id: 'task_email', title: 'Fictional email', priority: 'normal', due: MON, createdAt: at},
    {id: 'task_stamps', title: 'Fictional stamps', priority: 'normal', due: MON, createdAt: at, doneAt: `${MON}T08:00:00.000Z`},
    {id: 'task_letter', title: 'Fictional letter', priority: 'normal', due: '2026-11-26', createdAt: at, moved: 3},
    {id: 'task_shed', title: 'Fictional shed', priority: 'low', createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z'},
    {id: 'task_chapter', title: 'Fictional chapter', priority: 'normal', due: '2026-11-27', createdAt: at, projectId: 'project_book', labels: ['writing']},
  ]});
}
const TASK_PLAN = {version: 1, timeTargets: [{id: 'tt_writing', kind: 'label', of: 'writing', minutes: 300, per: 'week'}]};
const FOCUS = {version: 1, sessions: [{id: 'focus_x2-aaaaaaaa', startedAt: `${MON}T08:00:00.000Z`, endedAt: `${MON}T08:25:00.000Z`, day: MON, plannedMinutes: 25, focusedSeconds: 1500, awaySeconds: 0, outcome: 'grown', taskId: 'task_chapter'}]};
const taskRow = (page: Page, title: string) => page.locator('li.task').filter({has: page.locator('.task-title', {hasText: title})}).first();
const tasksReady = (page: Page) => page.locator('.tasks-page[data-tasks="ready"]').waitFor();
const taskViews = (page: Page) => page.getByRole('navigation', {name: 'Task views'});

test('Tasks and Today offline: a dreaded task, Pick one, a named timer and its strip, remind again, a long-open task kept, a repeating project', async ({page, context, isMobile}) => {
  test.setTimeout(120_000);
  await installed(page, context, isMobile, `${MON}T12:30:00Z`);
  await seed(page, {[TASKS_KEY]: tasksRecord(), [TASK_PLAN_KEY]: TASK_PLAN, [FOCUS_SESSIONS_KEY]: FOCUS});
  await openedOnline(page, ['/app/tasks', '/app/tasks?view=today', '/app/tasks?view=week', '/app/tasks?view=review']);
  await context.setOffline(true);
  try {
    // X2: the dread mark, today's progress line and Pick one.
    await openOffline(page, '/app/tasks?view=today'); await tasksReady(page);
    await expect(taskRow(page, 'Fictional tax form').locator('.task-dread')).toHaveText('Dreading · a lot');
    await expect(page.locator('.tasks-main .tasks-day-progress')).toContainText('1 of 3 of today’s tasks done');
    const pick = page.locator('details.tasks-pick');
    await pick.locator('summary').click();
    await pick.getByRole('button', {name: 'Pick one', exact: true}).click();
    await expect(pick.locator('.tasks-pick-one')).toHaveText(/^\s*(Fictional tax form|Fictional email)\s*$/);
    // X1: a named timer started offline; its strip on Today.
    await moreViews(page);
    await taskViews(page).getByRole('button', {name: 'Timers'}).click();
    const sheet = page.getByRole('dialog', {name: 'Timers'});
    await expect(sheet).toContainText('No timers yet.');
    await sheet.getByLabel('Name').fill('Fictional offline soup');
    await sheet.getByLabel('Minutes').fill('9');
    await sheet.getByRole('button', {name: 'Start', exact: true}).click();
    await expect(sheet.getByRole('list', {name: 'Timers running'}).getByRole('listitem')).toHaveCount(1);
    await sheet.getByRole('button', {name: 'Close'}).click();
    await kept(page);
    await openOffline(page, '/app');
    await expect(page.getByRole('group', {name: 'Timers running'})).toContainText('Fictional offline soup');
    // X2's time target and X1's remind again, in This week.
    await openOffline(page, '/app/tasks?view=week'); await tasksReady(page);
    await expect(page.getByRole('list', {name: 'Time targets'})).toContainText('25 min of 5 h this week');
    const choices = page.locator('#reminder-choices');
    await expect(choices.getByRole('heading', {name: 'Reminders: remind again and snooze'})).toBeVisible();
    await choices.getByLabel('Remind again').selectOption('5');
    await expect.poll(async () => orEmpty(await stored<{taskAgain?: unknown}>(page, NOTIFY_KEY)).taskAgain).toEqual({every: 5, times: 6});
    // X1 #439: an own snooze choice.
    await choices.getByLabel('Minutes', {exact: true}).fill('90');
    await choices.getByRole('button', {name: 'Add the choice'}).click();
    await expect.poll(async () => orEmpty(await stored<{snoozes?: unknown}>(page, NOTIFY_KEY)).snoozes).toEqual([{for: 90}]);
    // X2: Review's moved most, and a task open a long time kept.
    await openOffline(page, '/app/tasks?view=review'); await tasksReady(page);
    await expect(page.getByRole('list', {name: 'Tasks moved most'})).toContainText('Moved 3 times');
    await page.getByRole('list', {name: 'Tasks unchanged for 60 days or more'}).getByRole('button', {name: 'Keep “Fictional shed”'}).click();
    await expect.poll(async () => orEmpty(await stored<Tasks>(page, TASKS_KEY)).tasks?.find(t => t.id === 'task_shed')?.updatedAt?.slice(0, 10)).toBe(MON);
    // AV lane 2: a repeating project made from a template.
    await moreViews(page);
    await taskViews(page).getByRole('button', {name: /^Areas and templates/}).click();
    await page.getByRole('combobox', {name: 'Template', exact: true}).selectOption({label: 'A trip'});
    await page.getByRole('textbox', {name: 'Project name'}).fill('Fictional offline trip');
    await page.getByRole('combobox', {name: 'Repeats'}).selectOption({label: 'Every month'});
    await page.getByRole('button', {name: 'Make it and repeat'}).click();
    await expect.poll(async () => (orEmpty(await stored<{repeats?: {name: string; every: string}[]}>(page, TASK_TEMPLATES_KEY)).repeats ?? []).map(r => `${r.name}:${r.every}`)).toContain('Fictional offline trip:month');
    await kept(page);

    // Still offline, after a reload: every record is on the device.
    await reloadOffline(page);
    const timers = await stored<{timers: {name: string}[]}>(page, TIMERS_KEY);
    expect(timers.timers.map(t => t.name)).toContain('Fictional offline soup');
    expect(await stored(page, NOTIFY_KEY)).toMatchObject({taskAgain: {every: 5, times: 6}, snoozes: [{for: 90}]});
    expect((await stored<{repeats: {name: string; every: string}[]}>(page, TASK_TEMPLATES_KEY)).repeats.map(r => `${r.name}:${r.every}`)).toContain('Fictional offline trip:month');
    const tasks = await stored<Tasks>(page, TASKS_KEY);
    expect(tasks.tasks.find(t => t.id === 'task_shed')?.updatedAt?.slice(0, 10)).toBe(MON);
    expect(tasks.projects?.map(p => p.name)).toContain('Fictional offline trip · Nov 23, 2026');
  } finally { await context.setOffline(false); }
});

// ---- Wealth (round 7 X7; AV lane 2's store cards and card statement days) -------------------------------------------
const MONEY_AT = '2026-01-01T09:00:00.000Z';
const CARD = '00000000-0000-4000-8000-0000000e7101';

test('Wealth offline: copy an entry, Removed recently, a store card, a card’s next payment, a bill that ends', async ({page, context, isMobile}) => {
  test.setTimeout(120_000);
  await installed(page, context, isMobile, '2026-11-14T10:00:00.000Z');
  const split = {...entry('2026-11-13', '12.50', 'Groceries', 'expense', 'Market', 'EUR', 'aw-off-split'), parts: [{amount: '8.00', category: 'Groceries'}, {amount: '4.50', category: 'Home'}]};
  const onCard = (date: string, amount: string, id: string) => ({...entry(date, amount, 'Shopping', 'expense', 'Shop', 'EUR', id), account: 'Everyday Card'});
  await seed(page, {
    [DASHBOARD_SETTINGS_KEY]: {...presetSettings('balanced'), onboarded: true},
    [MONEY_LOG_KEY]: moneyLog([split, onCard('2026-10-05', '999.00', 'aw-off-c1'), onCard('2026-10-10', '300.00', 'aw-off-c2'), onCard('2026-11-02', '112.30', 'aw-off-c3'), onCard('2026-11-10', '40.00', 'aw-off-c4')]),
    [ACCOUNTS_KEY]: {version: 1, items: [{id: CARD, kind: 'credit-card', name: 'Everyday Card', currency: 'EUR', snapshots: [{id: CARD.replace(/.{4}$/, '9999'), date: '2026-11-10', value: '45000', decimals: 2}], payments: [], createdAt: MONEY_AT, updatedAt: MONEY_AT}]},
    [WEALTH_SHEET_KEY]: {version: 1, cards: {[CARD]: {statementDay: 5, dueDay: 25}}},
    [BILLS_KEY]: {version: 1, dismissed: [], bills: [{id: 'phone', title: 'Phone contract', amount: '25.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-20', origin: 'manual', createdAt: MONEY_AT}]},
  });
  await openedOnline(page, ['/app/wealth']);
  await context.setOffline(true);
  try {
    await openOffline(page, '/app/wealth');
    const section = spending(page);
    // #463 Copy an entry, dated today.
    await section.getByRole('button', {name: 'Copy Groceries 12.50 EUR on 2026-11-13'}).click();
    const copyForm = section.getByRole('form', {name: 'Copy Groceries €12.50'});
    await expect(copyForm.getByLabel('Copy to the day')).toHaveValue('2026-11-14');
    await copyForm.getByRole('button', {name: 'Copy', exact: true}).click();
    await expect(section.locator('.spending-status')).toHaveText('Copied: Groceries €12.50 on Sat, Nov 14.');
    // #461 Removed recently: the entry removed offline is kept there with its split.
    await section.getByRole('button', {name: 'Remove Groceries 12.50 EUR on 2026-11-13'}).click();
    await expect(page.getByText('Removed: Groceries €12.50.')).toBeVisible();
    await openPhoneRow(page, 'More about your money', section);
    const fold = section.locator('.money-removed-fold');
    if (await fold.getAttribute('open') === null) await fold.locator('summary').click();
    await expect(fold.locator('.money-removed-list li').filter({hasText: 'Market'})).toContainText('kept 30 more days, until Dec 14, 2026 · split in 2');
    // AV lane 2: a store card kept offline.
    await openPhoneRow(page, 'Store and club cards', section);
    const cards = section.locator('.store-cards');
    await cards.getByRole('button', {name: '+ Add a card'}).click();
    const cardForm = cards.getByRole('form', {name: 'Add a store card'});
    await cardForm.getByLabel('Name').fill('Fictional bonus card');
    await cardForm.getByLabel('Card number').fill('400638133393');
    await cardForm.getByLabel('Shown as').selectOption('ean13');
    await cardForm.getByRole('button', {name: 'Keep the card'}).click();
    await expect(cards.getByRole('button', {name: 'Show Fictional bonus card at the till'})).toBeVisible();
    // #464 a credit card's next payment, from the person's own entries (AV's statement days).
    if (isMobile) await openDeskFold(page, 'Accounts, debts & net worth');
    await expect(page.locator('.accounts-row').filter({hasText: 'Everyday Card'}).locator('.accounts-card-statement')).toHaveText(/^Next payment on Nov 25: €412\.30 \(statement of Nov 5\)/);
    // #462 a bill that ends after 24 payments.
    const bills = await openWealthSection(page, 'bills', 'Upcoming bills');
    await bills.locator('.bill-tracker-fold summary').click();
    const phone = bills.locator('.bill-tracker-bill').filter({hasText: 'Phone contract'});
    await phone.getByRole('button', {name: 'Edit Phone contract'}).click();
    const billForm = phone.getByRole('form', {name: 'Edit Phone contract'});
    await billForm.getByLabel('When it ends').selectOption('after');
    await billForm.getByRole('textbox', {name: 'Number of payments'}).fill('24');
    await billForm.getByLabel('First payment on').fill('2025-02-20');
    await billForm.getByRole('button', {name: 'Save bill'}).click();
    await expect(bills.locator('.bill-tracker .bills-status')).toHaveText('Phone contract saved. 3 of 24 left · the last on Jan 20, 2027');
    await kept(page);

    await reloadOffline(page);
    const log = await stored<MoneyLog>(page, MONEY_LOG_KEY);
    expect(log.entries.filter(e => e.date === '2026-11-14' && e.category === 'Groceries' && e.amount === '12.50')).toHaveLength(1);
    expect(log.entries.find(e => e.id === 'aw-off-split')).toBeUndefined();
    expect((await stored<MoneyRemoved>(page, MONEY_REMOVED_KEY)).items.map(i => (i as {entry?: {id: string}}).entry?.id)).toContain('aw-off-split');
    expect((await stored<StoreCards>(page, STORE_CARDS_KEY)).cards[0]).toMatchObject({name: 'Fictional bonus card', number: '4006381333931', format: 'ean13'});
    expect((await stored<BillsRecord>(page, BILLS_KEY)).bills.find(b => b.id === 'phone')!.ends).toEqual({after: 24, from: '2025-02-20'});
  } finally { await context.setOffline(false); }
});

// ---- Health and Guided: weight, sleep, a programme (round 7 X6; AW programmes and Read aloud; AV lane 2's evening plan) ---
const BODY_TODAY = '2026-11-20', BODY_AT = '2026-11-01T08:00:00.000Z';
const weights = Array.from({length: 22}, (_, i) => { const date = addLocalDays(BODY_TODAY, -42 + i * 2); return {id: `health_fictional-${date}`, date, grams: Math.round(84_000 - i * 2 * 500 / 7), createdAt: BODY_AT, updatedAt: BODY_AT}; });
const nights = Array.from({length: 20}, (_, i) => { const wake = addLocalDays(BODY_TODAY, -i), prev = addLocalDays(wake, -1);
  const tags = [...(i % 3 === 0 ? ['caffeine'] : []), ...(i % 4 === 1 ? ['screens'] : []), ...(i === 6 ? ['coffee'] : [])];
  return {id: `health_sleep-x6-fictional-${wake}`, kind: 'night', source: 'manual', start: `${prev}T${i % 2 ? '23:10' : '22:50'}:00.000Z`, end: `${wake}T06:50:00.000Z`, latencyMin: 15, awakeMin: 10, timeZone: 'UTC', ...(tags.length ? {tags} : {}), createdAt: BODY_AT, updatedAt: BODY_AT}; });
const sleepTags = async (page: Page) => (healthGroupIn(await stored<HealthData>(page, HEALTH_STORAGE_KEY), 'sleep') as Sleep).nights.flatMap(n => n.tags ?? []);

test('Health and Guided offline: a weigh-in note and a day you name, the sleep goal over 30 days, a sleep tag renamed, an evening plan, a programme step read aloud', async ({page, context, isMobile}) => {
  test.setTimeout(120_000);
  await localVoice(page);
  await installed(page, context, isMobile, `${BODY_TODAY}T21:00:00Z`);
  await seed(page, {[HEALTH_STORAGE_KEY]: withHealthGroup({...createEmptyHealth(), weights}, 'sleep', {version: 1, nights, goal: {minutes: 450, bedFrom: '22:30', bedTo: '23:00', updatedAt: BODY_AT}} as Sleep, false)});
  await openedOnline(page, ['/app/health?view=weight', '/app/health?view=sleep', '/app/guided']);
  await context.setOffline(true);
  try {
    // #457 a note on a weigh-in; #456 a day you name.
    await openOffline(page, '/app/health?view=weight');
    await expect(page.locator('#health-weight-trend .health-trend-week')).toHaveText(/^This week /);
    await page.locator('summary').filter({hasText: 'Notes and new lows in your weigh-ins'}).click();
    const notes = page.getByRole('region', {name: 'Notes and new lows'});
    await notes.getByRole('button', {name: 'Add a note for Nov 20, 2026'}).click();
    await notes.getByRole('textbox', {name: 'Note for Nov 20, 2026'}).fill('fictional offline scale');
    await notes.getByRole('button', {name: 'Save note'}).click();
    await expect(notes).toContainText('“fictional offline scale”');
    await page.locator('summary').filter({hasText: 'A day you name'}).click();
    const named = page.getByRole('region', {name: 'A day you name'});
    await named.getByRole('textbox', {name: 'Name of the day'}).fill('The fictional trip');
    await named.getByLabel('The day', {exact: true}).fill('2026-12-18');
    await named.getByRole('button', {name: 'Keep this day'}).click();
    await expect(named.getByRole('listitem').filter({hasText: 'The fictional trip'})).toContainText('an estimate');
    await kept(page);
    // #460 the sleep goal over 30 days; #459 a tag renamed on every night; AV's evening plan.
    await openOffline(page, '/app/health?view=sleep');
    await page.getByRole('region', {name: 'Your sleep goal over 14 days'}).getByRole('button', {name: '30 days'}).click();
    await expect(page.getByRole('region', {name: 'Your sleep goal over 30 days'})).toBeVisible();
    await expect.poll(() => stored(page, SLEEP_GOAL_PERIOD_KEY)).toEqual({version: 1, days: 30});
    await page.locator('summary').filter({hasText: 'Rename or remove a sleep tag'}).click();
    const tags = page.getByRole('region', {name: 'Your sleep tags'});
    await tags.getByRole('button', {name: 'Rename caffeine'}).click();
    await tags.getByRole('textbox', {name: 'New name for “caffeine”'}).fill('coffee');
    await tags.getByRole('button', {name: 'Rename on every night'}).click();
    await expect.poll(async () => (await sleepTags(page)).filter(t => t === 'coffee').length).toBe(7);
    const plan = page.getByRole('region', {name: 'Tonight'}).getByRole('region', {name: 'Your evening plan'});
    await plan.getByRole('button', {name: 'Make an evening plan'}).click();
    await plan.getByLabel('1. When do you want to be asleep?').fill('23:00');
    await plan.getByRole('checkbox', {name: 'A busy head'}).check();
    await plan.getByRole('combobox', {name: '3. How long would you like to wind down?'}).selectOption('45');
    await plan.getByRole('button', {name: 'Save my evening plan'}).click();
    await expect(plan.getByRole('status')).toHaveText('Your evening plan is saved. Tick each step as you go tonight.');
    await plan.getByRole('checkbox', {name: /Write down what is on your mind/}).check();
    await expect(plan.getByRole('progressbar', {name: 'Ready for bed'})).toHaveAttribute('aria-valuenow', '1');
    await kept(page);
    // AW programmes: a programme started and a step ticked offline; Read aloud with this device's own voice.
    await openOffline(page, '/app/guided');
    await page.getByRole('region', {name: 'Written programmes'}).getByRole('button', {name: 'Start: 0 to 5 km in 8 weeks'}).click();
    const card = page.getByRole('region', {name: 'Your journeys'}).getByRole('article', {name: '0 to 5 km in 8 weeks'});
    await card.getByRole('button', {name: 'Done: Warm up: walk briskly for 5 minutes (Run 1)'}).click();
    await expect(card).toContainText('1 of 4 steps done');
    await expect.poll(async () => orEmpty(await stored<{journeys?: unknown[]}>(page, GUIDED_JOURNEYS_KEY)).journeys?.[0]).toMatchObject({programId: 'run-5k', stepsDone: ['w1-r1/warm-up']});
    await page.getByRole('button', {name: 'Read aloud: Run 1, Run 60 seconds, walk 90 seconds: 8 times'}).click();
    await expect(page.getByRole('group', {name: 'Read aloud: Run 1, Run 60 seconds, walk 90 seconds: 8 times'}).getByRole('status')).toHaveText('Reading aloud with this device’s voice.');
    await kept(page);

    await reloadOffline(page);
    const extras = await stored<{weighNotes?: unknown; namedDays?: unknown}>(page, BODY_EXTRAS_KEY);
    expect(extras.weighNotes).toEqual([{id: `health_fictional-${BODY_TODAY}`, note: 'fictional offline scale'}]);
    expect(extras.namedDays).toMatchObject([{name: 'The fictional trip', on: '2026-12-18'}]);
    expect(await stored(page, SLEEP_GOAL_PERIOD_KEY)).toEqual({version: 1, days: 30});
    expect((await sleepTags(page)).includes('caffeine')).toBe(false);
    expect((await stored<{days: Record<string, string[]>}>(page, EVENING_PLAN_KEY)).days).toEqual({[BODY_TODAY]: ['write-down']});
    expect((await stored<{journeys: unknown[]}>(page, GUIDED_JOURNEYS_KEY)).journeys[0]).toMatchObject({programId: 'run-5k', stepsDone: ['w1-r1/warm-up']});
  } finally { await context.setOffline(false); }
});

// ---- Health: activity, workouts and meditation (AW kcal and programmes; AV lane 2's planned workouts, races, low day) ---
const RUN = 'health_run-aw-0001';
function activityRecords() {
  let h = health({weights: [{id: 'health_weight-aw-0001', date: HEALTH_TODAY, grams: 80_000, createdAt: HEALTH_AT, updatedAt: HEALTH_AT}]});
  h = saveActivity(h, {id: RUN, date: HEALTH_TODAY, name: 'Run', steps: 0, minutes: 30}, HEALTH_AT);
  h = withHealthGroup(h, 'vitals', {version: 1, days: [HEALTH_TODAY, back(1)].map(date => vitalDaySchema.parse({id: `health_vital-apple-health-${date}`, date, source: 'apple-health', activeKcal: 450, updatedAt: HEALTH_AT}))}, false);
  return {...healthRecord(h), [ACTIVITY_EXTRAS_KEY]: {version: 1, items: {[RUN]: {distanceKm: 5, effort: 'moderate', kcal: 320}}}, [WORKOUTS_KEY]: {version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90}};
}
const activityRow = (page: Page, name: string) => page.locator('article.health-library-row').filter({has: page.getByRole('heading', {name, exact: true})});

test('Health offline: calories you entered, a planned workout and a race, a programme link, the low-day page', async ({page, context, isMobile}) => {
  test.setTimeout(120_000);
  await installed(page, context, isMobile, `${HEALTH_TODAY}T10:00:00Z`);
  await seed(page, activityRecords());
  await openedOnline(page, ['/app/health?view=activity', '/app/health?view=workouts', '/app/health?view=meditation']);
  await context.setOffline(true);
  try {
    // AW kcal: calories only as typed, kept in their own record.
    await openOffline(page, '/app/health?view=activity');
    await expect(activityRow(page, 'Run')).toContainText('320 kcal · you entered');
    const form = page.getByRole('form', {name: 'Manual activity'});
    await form.getByLabel('Activity name').fill('Cycling');
    await form.getByLabel('Minutes').fill('50');
    await form.getByLabel('Distance (km, optional)').fill('18,5');
    await form.getByLabel('Effort (optional)').selectOption('hard');
    await form.getByLabel('Calories (you entered, optional)').fill('540');
    await form.getByRole('button', {name: 'Save activity'}).click();
    await expect(activityRow(page, 'Cycling')).toContainText('540 kcal · you entered');
    const cyclingId = (await activityRow(page, 'Cycling').getAttribute('data-activity-id'))!;
    await expect.poll(async () => orEmpty(await stored<{items: Record<string, unknown>}>(page, ACTIVITY_EXTRAS_KEY)).items?.[cyclingId]).toEqual({distanceKm: 18.5, effort: 'hard', kcal: 540});
    await kept(page);
    // AW programmes: the quiet link; AV lane 2: a planned workout and a race ahead.
    await openOffline(page, '/app/health?view=workouts');
    await expect(page.getByRole('link', {name: 'Programme: 0 to 5 km in 8 weeks →'})).toHaveAttribute('href', '/app/guided?programme=run-5k');
    const start = page.getByRole('region', {name: 'Start a workout'});
    await start.locator('details.workouts-plan-fold > summary').click();
    const planned = start.locator('.r4-plan');
    const planForm = planned.getByRole('form', {name: 'Plan a workout'});
    await planForm.getByLabel('What').selectOption('run');
    await planForm.getByRole('textbox', {name: 'Distance (km)'}).fill('5');
    await planForm.getByLabel('Effort').selectOption('easy');
    await planForm.getByLabel('Day').fill('2026-11-16');
    await planForm.getByLabel('Time (optional)').fill('18:00');
    await planForm.getByRole('button', {name: 'Plan it'}).click();
    await expect(planned.getByRole('status')).toHaveText('Easy 5 km run planned on Mon, Nov 16 at 18:00.');
    const races = page.getByRole('region', {name: 'Races ahead'});
    await races.locator('details.workouts-races-fold > summary').click();
    await races.getByRole('button', {name: '+ Add a race'}).click();
    const raceForm = races.getByRole('form', {name: 'Add a race'});
    await raceForm.getByRole('textbox', {name: 'Name'}).fill('Fictional offline half');
    await raceForm.getByLabel('Race day').fill('2026-12-13');
    await raceForm.getByRole('combobox', {name: 'Distance', exact: true}).selectOption('21.0975');
    await raceForm.getByRole('textbox', {name: /^Goal time/}).fill('1:55:00');
    await raceForm.getByRole('button', {name: 'Save the race'}).click();
    await expect.poll(async () => (orEmpty(await stored<{races?: {name: string}[]}>(page, RACES_KEY)).races ?? []).map(r => r.name)).toEqual(['Fictional offline half']);
    await kept(page);
    // AV lane 2: "On a low day", opened by its address.
    await openOffline(page, '/app/health?view=meditation#low-day');
    const low = page.locator('details#low-day');
    await expect(low).toHaveAttribute('open', '');
    await low.getByLabel(/Add something that helps/).fill('A fictional shower');
    await low.getByRole('button', {name: 'Add to “Small things that help me”'}).click();
    await expect.poll(async () => orEmpty(await stored<{helps?: string[]}>(page, LOW_DAY_KEY)).helps).toEqual(['A fictional shower']);
    await kept(page);

    await reloadOffline(page);
    expect((await stored<{items: Record<string, unknown>}>(page, ACTIVITY_EXTRAS_KEY)).items[cyclingId]).toEqual({distanceKm: 18.5, effort: 'hard', kcal: 540});
    expect((await stored<{items: unknown[]}>(page, PLANNED_KEY)).items[0]).toMatchObject({kind: 'run', name: 'Easy 5 km run', date: '2026-11-16', time: '18:00', distanceKm: 5, effort: 'easy'});
    expect((await stored<{races: {name: string; date: string}[]}>(page, RACES_KEY)).races[0]).toMatchObject({name: 'Fictional offline half', date: '2026-12-13'});
    expect((await stored<{helps?: string[]}>(page, LOW_DAY_KEY)).helps).toEqual(['A fictional shower']);
  } finally { await context.setOffline(false); }
});

// ---- The kitchen (round 7 X5) ---------------------------------------------------------------------------------------
const KITCHEN_TODAY = '2026-11-25', KITCHEN_AT = '2026-11-20T08:00:00.000Z';
const SOUP = 'health_recipe-x5-soup', PIE = 'health_recipe-x5-pie';
function kitchen(): HealthData {
  let h = createEmptyHealth();
  for (const [id, name, grams] of [['health_food-x5-peas', 'Fictional split peas', 100], ['health_food-x5-leek', 'Fictional leek', 100], ['health_food-x5-salt', 'Fictional salt', 1]] as const)
    h = saveFood(h, {id, name, brand: 'Fictional kitchen', servingGrams: grams, nutrients: {kcal: 100, proteinMg: 1000, carbsMg: 1000, fatMg: 1000}, createdAt: KITCHEN_AT, updatedAt: KITCHEN_AT});
  h = saveRecipe(h, {id: SOUP, name: 'Fictional pea soup', portionsMilli: 2000, items: [{foodId: 'health_food-x5-peas', quantityMilli: 2_000}, {foodId: 'health_food-x5-leek', quantityMilli: 1_000}, {foodId: 'health_food-x5-salt', quantityMilli: 3_000}]}, KITCHEN_AT);
  h = saveRecipe(h, {id: PIE, name: 'Fictional leek pie', portionsMilli: 4000, items: [{foodId: 'health_food-x5-leek', quantityMilli: 3_000}]}, KITCHEN_AT);
  h = planFromRecipe(h, SOUP, '2026-11-24', 'Dinner', KITCHEN_AT, 'health_plan-x5-0001');
  return planFromRecipe(h, PIE, '2026-11-26', 'Lunch', KITCHEN_AT, 'health_plan-x5-0002');
}
const METHOD = {[SOUP]: ['Rinse the peas.', 'Soften the leek for 5 minutes.', 'Simmer for 40–45 minutes.', 'Blend and season.']};
type Voice = {name: string; lang: string; localService: boolean; default?: boolean; voiceURI: string};
/** A stand-in for the browser's speech synthesis with one voice on the device (tests/aw-programmes.spec.ts). */
async function localVoice(page: Page) {
  await page.addInitScript((list: Voice[]) => {
    const synth = {
      speaking: false, paused: false, pending: false, onvoiceschanged: null,
      getVoices: () => list,
      speak() { /* nothing is spoken for real */ }, cancel() { /* as speak */ }, pause() { /* as speak */ }, resume() { /* as speak */ },
      addEventListener() { /* the list never changes */ }, removeEventListener() { /* as addEventListener */ },
    };
    Object.defineProperty(window, 'speechSynthesis', {configurable: true, get: () => synth});
    class Utterance { text: string; voice: Voice | null = null; lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {configurable: true, writable: true, value: Utterance});
  }, [{name: 'Fictional Local Voice', lang: 'en-US', localService: true, default: true, voiceURI: 'fictional-local'}]);
}

test('the kitchen offline: cooking with Made it and stars, a use-by day, a menu kept, a recipe file brought in', async ({page, context, isMobile}) => {
  test.setTimeout(120_000);
  await installed(page, context, isMobile, `${KITCHEN_TODAY}T09:00:00Z`);
  await seed(page, {
    [HEALTH_STORAGE_KEY]: kitchen(),
    [FOOD_PLUS_KEY]: {version: 1, steps: METHOD},
    [GROCERY_KEY]: {version: 1, pantry: {'fictional yoghurt': KITCHEN_AT, 'fictional spinach': KITCHEN_AT}, useBy: {'fictional yoghurt': '2026-11-26', 'fictional spinach': '2026-11-23'}},
  });
  await openedOnline(page, ['/app/health?view=foods', '/app/health?view=planner', '/app/health?view=import']);
  await context.setOffline(true);
  try {
    // #449–#451, #455: the cooking view, scaled; Made it today; the person's stars.
    await openOffline(page, '/app/health?view=foods');
    const row = page.locator('.health-library-row').filter({has: page.getByRole('heading', {name: 'Fictional pea soup'})});
    await row.getByRole('button', {name: 'Cook Fictional pea soup, step by step'}).click();
    const view = page.getByRole('region', {name: 'Cooking: Fictional pea soup'});
    await view.getByRole('group', {name: 'Cook for'}).getByRole('button', {name: 'For 4'}).click();
    await expect(view.getByRole('list', {name: 'Ingredients for Fictional pea soup'}).getByRole('listitem').first()).toHaveText('400 g Fictional split peas');
    await view.getByRole('button', {name: 'Start cooking'}).click();
    await view.getByRole('list', {name: 'The method'}).getByRole('button', {name: /^Step 4: /}).click();
    await view.getByRole('button', {name: 'Made it today'}).click();
    await expect(view.getByRole('button', {name: 'Made it today'})).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => orEmpty(await stored<{made?: unknown}>(page, FOOD_PLUS_KEY)).made).toEqual({[SOUP]: [KITCHEN_TODAY]});
    await view.getByRole('button', {name: 'Done cooking'}).click();
    await row.getByLabel('Your stars for Fictional pea soup').selectOption('4');
    await expect.poll(async () => orEmpty(await stored<{stars?: unknown}>(page, FOOD_PLUS_KEY)).stars).toEqual({[SOUP]: 4});
    await kept(page);
    // #452 a use-by day; #454 this week kept as a menu.
    await openOffline(page, '/app/health?view=planner');
    const grocery = page.getByRole('region', {name: 'Grocery list'});
    await expect(grocery.getByRole('region', {name: 'Use soon'}).getByRole('listitem').first()).toHaveText('Fictional yoghurt: use by tomorrow');
    await grocery.getByText(/^Already at home \(2\)$/).click();
    const home = grocery.getByRole('form', {name: 'Add what you have at home'});
    await home.getByLabel('Item at home').fill('Fictional rice');
    await home.getByLabel('Use by (optional)').fill('2026-11-27');
    await home.getByRole('button', {name: 'Add'}).click();
    await expect.poll(async () => orEmpty(await stored<{useBy?: Record<string, string>}>(page, GROCERY_KEY)).useBy?.['fictional rice']).toBe('2026-11-27');
    await page.getByText('Menus: keep a week of meals, place it on another week').click();
    const keep = page.getByRole('form', {name: 'Keep this week as a menu'});
    await keep.getByLabel('Menu name').fill('Fictional offline week');
    await keep.getByRole('button', {name: 'Keep this week as a menu'}).click();
    await expect(page.getByRole('list', {name: 'Your menus'})).toContainText('Fictional offline week');
    await kept(page);
    // #453 a recipe file read on the device: a Markdown recipe, checked line by line and saved.
    await openOffline(page, '/app/health?view=import');
    await page.getByRole('button', {name: 'A recipe file'}).click();
    await page.getByLabel(/^Recipe file/).setInputFiles({name: 'pancakes.md', mimeType: 'text/markdown', buffer: Buffer.from('# Fictional pancakes\n\nServes 2\n\n## Ingredients\n\n- 200 g fictional flour\n- **2** fictional eggs\n\n## Method\n\n1. Whisk for 1 minute.\n')});
    const confirm = page.getByRole('form', {name: 'Confirm the recipe'});
    await expect(confirm.getByLabel('Recipe name')).toHaveValue('Fictional pancakes');
    await expect(confirm.getByLabel('Ingredient 2 name')).toHaveValue('fictional eggs');
    await confirm.getByRole('button', {name: 'Save recipe'}).click();
    await expect.poll(async () => (orEmpty(await stored<{recipes?: {name: string}[]}>(page, HEALTH_STORAGE_KEY)).recipes ?? []).map(r => r.name)).toContain('Fictional pancakes');
    await kept(page);

    await reloadOffline(page);
    const food = await stored<{made?: unknown; stars?: unknown; menus?: unknown[]}>(page, FOOD_PLUS_KEY);
    expect(food.made).toEqual({[SOUP]: [KITCHEN_TODAY]});
    expect(food.stars).toEqual({[SOUP]: 4});
    expect(JSON.stringify(food.menus ?? [])).toContain('Fictional offline week');
    expect((await stored<{useBy?: Record<string, string>}>(page, GROCERY_KEY)).useBy?.['fictional rice']).toBe('2026-11-27');
    expect((await stored<{recipes: {name: string}[]}>(page, HEALTH_STORAGE_KEY)).recipes.map(r => r.name)).toEqual(expect.arrayContaining(['Fictional pea soup', 'Fictional leek pie', 'Fictional pancakes']));
  } finally { await context.setOffline(false); }
});

// ---- Notes (round 7 X3's saved searches; AV lane 2's review cards) --------------------------------------------------
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-trip', kind: 'topic', title: 'Fictional trip ideas', body: 'Lisbon in spring #travel', createdAt: '2026-11-10T09:00:00.000Z', props: [{k: 'Status', t: 'choice', v: 'Planning'}]},
  {id: 'n-pack', kind: 'topic', title: 'Fictional packing', body: 'Socks for the trip', createdAt: '2026-11-11T09:00:00.000Z'},
  {id: 'n-lock', kind: 'topic', title: 'Fictional locked', body: 'a trip kept private #travel', locked: true, createdAt: '2026-11-12T09:00:00.000Z'},
  {id: 'n-a', kind: 'topic', title: 'Fictional Spanish', body: '- hola :: hello\n- gracias :: thank you', createdAt: '2026-11-01T09:00:00.000Z'}]};

test('Notes offline: a search kept by name and opened again, a review card answered', async ({page, context, isMobile}) => {
  test.setTimeout(120_000);
  await installed(page, context, isMobile, '2026-11-22T09:00:00Z');
  await seed(page, {[NOTES_KEY]: NOTES});
  await openedOnline(page, ['/app/notes?view=notes']);
  await context.setOffline(true);
  try {
    await openOffline(page, '/app/notes?view=notes');
    // #441 a search narrowed by a tag and kept by name, then opened again in one tap.
    const search = page.getByRole('region', {name: 'Search notes'});
    await search.getByLabel('Search', {exact: true}).fill('trip');
    await expect(search.locator('.note-results > li')).toHaveCount(2);
    await search.locator('details.note-narrow-fold > summary').click();
    await search.getByLabel(/^Tag/).selectOption('travel');
    await expect(search.locator('.note-results > li')).toHaveCount(1);
    await search.getByRole('textbox', {name: 'Keep this search as'}).fill('Fictional trip search');
    await search.getByRole('button', {name: 'Keep this search', exact: true}).click();
    await expect.poll(async () => orEmpty(await stored<{searches?: unknown[]}>(page, NOTE_SEARCHES_KEY)).searches).toEqual([expect.objectContaining({name: 'Fictional trip search', words: 'trip', tag: 'travel'})]);
    await search.getByLabel('Search', {exact: true}).fill('');
    await search.getByRole('button', {name: 'Clear the narrowing'}).click();
    await search.getByRole('group', {name: 'Saved searches'}).getByRole('button', {name: 'Fictional trip search'}).click();
    await expect(search.locator('.note-saved-line')).toHaveText('Saved search “Fictional trip search”: 1 note.');
    // AV lane 2: a review card from a note, answered offline.
    const fold = page.locator('details.note-cards-fold');
    await fold.locator('summary').click();
    await fold.getByRole('button', {name: 'Review cards'}).click();
    const card = fold.getByRole('region', {name: 'Card 1 of 2'});
    await card.getByRole('button', {name: 'Show the answer'}).click();
    await expect(card.locator('.note-card-answer')).toHaveText('Answer: hello');
    await card.getByRole('group', {name: 'How well did you know it?'}).getByRole('button', {name: /^Good · tomorrow/}).click();
    await expect(fold.getByRole('status')).toHaveText('Good: this card comes back tomorrow.');
    await expect.poll(async () => (orEmpty(await stored<{reviews?: {due: string}[]}>(page, NOTE_CARDS_KEY)).reviews ?? []).map(r => r.due)).toEqual(['2026-11-23']);
    await kept(page);

    await reloadOffline(page);
    expect((await stored<{searches: {name: string}[]}>(page, NOTE_SEARCHES_KEY)).searches.map(s => s.name)).toEqual(['Fictional trip search']);
    expect((await stored<{reviews: {due: string}[]}>(page, NOTE_CARDS_KEY)).reviews.map(r => r.due)).toEqual(['2026-11-23']);
    await expect(page.getByRole('region', {name: 'Search notes'}).getByRole('group', {name: 'Saved searches'}).getByRole('button', {name: 'Fictional trip search'})).toBeVisible();
  } finally { await context.setOffline(false); }
});

// ---- Journal (round 7 X3: photo of the day, voice notes faster, morning and evening) --------------------------------
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
/** The journal's media store: two photos and one voice note (the 40-second WebM/Opus fixture tests/aw-x3-notes-journal.spec.ts plays). */
async function journalMedia(page: Page) {
  const voice64 = readFileSync(join(__dirname, 'fixtures', 'media', 'voice-tone-40s.webm')).toString('base64');
  await page.evaluate(async ([png, at, v64]) => {
    const bytes = Uint8Array.from(atob(png), c => c.charCodeAt(0));
    const voice = new Blob([Uint8Array.from(atob(v64), c => c.charCodeAt(0))], {type: 'audio/webm'});
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('zigoals-journal-media-v1', 1); r.onupgradeneeded = () => r.result.createObjectStore('media'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('media', 'readwrite'), s = t.objectStore('media');
      for (const id of ['m-photo0002', 'm-photo0003']) s.put({kind: 'photo', blob: new Blob([bytes], {type: 'image/webp'}), type: 'image/webp', bytes: bytes.length, at}, `local:${id}`);
      s.put({kind: 'audio', blob: voice, type: 'audio/webm', bytes: voice.size, seconds: 40, at}, 'local:m-audio0001');
      t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => reject(t.error);
    });
  }, [PNG, '2026-11-20T09:00:00.000Z', voice64] as const);
}
type JournalStored = {dayPages?: {on: boolean}; entries: {id: string; date: string; template?: string; dayPhoto?: string; parts?: {morning?: {q: string; a: string}[]}}[]};

test('Journal offline: the photo of the day, a voice note faster, the morning page, A photo a day', async ({page, context, isMobile}) => {
  test.setTimeout(120_000);
  await installed(page, context, isMobile, '2026-11-25T09:00:00Z');
  await seed(page, {[JOURNAL_KEY]: {version: 1, shareWithAi: false, followUps: false, entries: [
    {id: 'e2', date: '2026-11-20', text: 'A fictional market morning.', createdAt: '2026-11-20T09:00:00.000Z', photos: ['m-photo0002', 'm-photo0003'], audio: [{id: 'm-audio0001', seconds: 40}]}]}});
  await journalMedia(page);
  await openedOnline(page, ['/app/journal']);
  await context.setOffline(true);
  try {
    await openOffline(page, '/app/journal');
    const row = page.locator('ol.journal-entries > li').filter({hasText: 'market morning'});
    // #445 the photo of the day.
    await row.getByRole('button', {name: /^Photo of the day: photo 2 of the entry of/}).click();
    await expect.poll(async () => orEmpty(await stored<JournalStored>(page, JOURNAL_KEY)).entries?.find(e => e.id === 'e2')?.dayPhoto).toBe('m-photo0003');
    // #442 a voice note played faster, the speed kept on the device.
    await row.getByRole('group', {name: /^Voice note of .*, 0:40$/}).getByRole('button', {name: '1.5×'}).click();
    await expect.poll(async () => orEmpty(await stored<{voiceSpeed?: number}>(page, JOURNAL_DISPLAY_KEY)).voiceSpeed).toBe(1.5);
    // #444 Morning and evening, switched on offline, and the morning page written.
    const fold = page.locator('details#day-pages');
    await fold.locator(':scope > summary').click();
    await fold.getByLabel('Write each day as a morning page and an evening page').check();
    const morning = fold.getByRole('form', {name: 'Morning page'});
    await morning.getByLabel('I am grateful for…').fill('A fictional coffee with Anna.');
    await morning.getByLabel('What would make today great?').fill('A fictional walk by the river.');
    await morning.getByRole('button', {name: 'Save the morning page'}).click();
    await expect(page.locator('.aa-toast').filter({hasText: 'Your morning page is saved in today’s entry.'})).toBeVisible();
    // #445 A photo a day, the month's strip.
    await page.locator('#journal-photos > summary').click();
    await expect(page.locator('#journal-photos .journal-day-strip').getByRole('heading', {name: 'A photo a day'})).toBeVisible();
    await kept(page);

    await reloadOffline(page);
    const journal = await stored<JournalStored>(page, JOURNAL_KEY);
    expect(journal.dayPages).toEqual({on: true});
    expect(journal.entries.find(e => e.id === 'e2')?.dayPhoto).toBe('m-photo0003');
    expect(journal.entries.find(e => e.date === '2026-11-25')).toMatchObject({template: 'morning-evening'});
    expect(journal.entries.find(e => e.date === '2026-11-25')?.parts?.morning).toHaveLength(2);
    expect((await stored<{voiceSpeed?: number}>(page, JOURNAL_DISPLAY_KEY)).voiceSpeed).toBe(1.5);
    await expect(page.locator('ol.journal-entries > li').filter({hasText: 'market morning'}).getByRole('group', {name: /^Voice note of/}).getByRole('button', {name: '1.5×'})).toHaveAttribute('aria-pressed', 'true');
  } finally { await context.setOffline(false); }
});

// ---- Goals and Settings (round 7 X4's goal repeat; AW Settings search; AV lane 2's "To bring up") -------------------
const E = 10n ** 18n;
function readingPlatform(): Platform {
  const goal = privateGoalSchema.parse({id: '71', name: 'Read 2 books a month', type: 'QUANTITY', status: 'active', asset: 'books', denom: 'manual:books', decimals: 18, target: (2n * E).toString(), notes: '', createdAt: '2026-10-01T10:00:00.000Z', milestones: []});
  let p: Platform = {...emptyPlatform(), goals: [goal]};
  const add = (day: string, n: bigint, id: string) => { const pos = p.positions.find(x => x.denom === 'manual:books'); p = fundGoal(p, {id, goalId: '71', ...(pos ? {positionId: pos.id} : {newPosition: newOwnUnitPosition(goal, 'own-books', `${day}T12:00:00.000Z`)}), quantity: (n * E).toString(), occurredAt: `${day}T12:00:00.000Z`}, [], Date.parse(`${day}T12:00:00.000Z`)); };
  add('2026-10-05', 1n, 'c1'); add('2026-10-20', 1n, 'c2'); add('2026-11-10', 1n, 'c3');
  return p;
}
type Repeat = {goals: Record<string, {every: string; period: string}>};

test('Goals and Settings offline: a goal that starts again each week, Search Settings, a line to bring up', async ({page, context, isMobile}) => {
  test.setTimeout(120_000);
  await installed(page, context, isMobile, '2026-11-25T09:00:00.000Z');
  await seed(page, {[PLATFORM_KEY]: readingPlatform(), [GOAL_REPEAT_KEY]: {version: 1, goals: {'71': {every: 'month', since: '2026-10-01', period: 'month:2026-10', setAt: '2026-10-01T10:00:00.000Z'}}}});
  await openedOnline(page, ['/app/goals/tracked/71', '/app/settings', '/app/settings/data']);
  await context.setOffline(true);
  try {
    // #447 the goal starts again each week instead of each month.
    await openOffline(page, '/app/goals/tracked/71');
    const fold = page.locator('#repeat');
    await expect(fold.locator('summary')).toContainText('Each month · earlier periods kept as a row');
    await fold.locator('summary').click();
    await expect(fold).toContainText('This month: 1 of 2 books');
    await fold.getByRole('group', {name: 'How often it starts again'}).getByRole('radio', {name: 'Each week'}).check();
    await fold.getByRole('button', {name: 'Save', exact: true}).click();
    await expect.poll(async () => orEmpty(await stored<Repeat>(page, GOAL_REPEAT_KEY)).goals?.['71']?.every).toBe('week');
    await kept(page);
    // AW Part 3: Search Settings reads its index on the device.
    await openOffline(page, '/app/settings');
    const search = page.getByRole('search', {name: 'Settings'});
    await search.getByRole('searchbox', {name: 'Search Settings'}).fill('backup');
    await expect(search.getByRole('list').getByRole('link').first()).toHaveAccessibleName(/^Backup & restore/);
    await expect(search.getByRole('status')).toHaveText(/\d+ settings? found\./);
    await kept(page);
    // AV lane 2: a line to bring up at the next visit, in Settings → Your data.
    await openOffline(page, '/app/settings/data');
    const launcher = page.locator('.report-launcher');
    await launcher.locator('details.report-bring-up-fold > summary').click();
    const list = launcher.locator('.r6-bring-up');
    await list.getByLabel(/Something to bring up/).fill('Ask about the fictional headaches');
    await list.getByRole('button', {name: 'Add', exact: true}).click();
    await expect(list.getByRole('list', {name: 'To bring up'})).toContainText('Ask about the fictional headaches');
    await kept(page);

    await reloadOffline(page);
    expect((await stored<Repeat>(page, GOAL_REPEAT_KEY)).goals['71']?.every).toBe('week');
    expect((await stored<{items: {text: string}[]}>(page, BRING_UP_KEY)).items.map(i => i.text)).toContain('Ask about the fictional headaches');
  } finally { await context.setOffline(false); }
});

// ---- Life review (round 7 X4's year and all time) -------------------------------------------------------------------
test('the Life review offline: This year and All time open from the device; the period is never stored', async ({page, context, isMobile}) => {
  test.setTimeout(120_000);
  await installed(page, context, isMobile, '2026-11-25T09:00:00.000Z');
  await openedOnline(page, ['/app/review']);
  await context.setOffline(true);
  try {
    await openOffline(page, '/app/review');
    const period = page.getByRole('group', {name: 'Review period'});
    await period.getByRole('button', {name: 'This year'}).click();
    await expect(period.getByRole('button', {name: 'This year'})).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', {name: 'Nothing to count yet for 2026.'})).toBeVisible();
    await expect(page.getByRole('link', {name: 'Open Habits'})).toHaveAttribute('href', '/app/habits');
    await period.getByRole('button', {name: 'All time'}).click();
    await expect(period.getByRole('button', {name: 'All time'})).toHaveAttribute('aria-pressed', 'true');
    await kept(page);

    // Nothing to keep: the year and all time are never the stored period (a reload shows the week or the month again).
    await reloadOffline(page);
    await expect(page.getByRole('group', {name: 'Review period'}).getByRole('button', {name: 'This year'})).toHaveAttribute('aria-pressed', 'false');
  } finally { await context.setOffline(false); }
});
