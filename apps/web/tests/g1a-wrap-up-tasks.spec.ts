import {expect, test, type Page} from '@playwright/test';
import {presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {TASKS_KEY} from '../lib/tasks/schema';

/**
 * Session AK (BUILD list 2 #14, lane G1a): the evening wrap-up lists today's open tasks (and an overdue one) with "Move to
 * tomorrow" or "Let it go", each with Undo; it never says "missed" and never counts. On a device with no task at all it
 * teaches in one line. The wrap-up is turned on in the fixture (settings v3 `wrapUp`), the clock is 19:05 in Brussels.
 */
test.use({timezoneId: 'Europe/Brussels'});
const SETTINGS = 'zigoals:settings:v1', W_REMINDERS = 'zigoals:w-reminders:v1';
const DAY = '2026-10-01', AT = '2026-10-01T06:00:00.000Z';
const settings = {...presetSettings('habits-health'), onboarded: true, schemaVersion: 3, wrapUp: {version: 1, enabled: {v: true, at: AT}, days: {}}};
const quiet = {[WHATS_NEW_KEY]: {version: 1, dismissed: [WHATS_NEW_RELEASE]}, [W_REMINDERS]: {version: 1, chained: {}, contributions: {}, dismissed: {'journal-zone': DAY}}};
const tasks = {version: 1, tasks: [
  {id: 'today', title: 'Fictional: call the plumber', priority: 'normal', due: DAY, time: '17:30', createdAt: '2026-09-28T08:00:00.000Z'},
  {id: 'overdue', title: 'Fictional: return the book', priority: 'high', due: '2026-09-29', createdAt: '2026-09-28T08:00:00.000Z'},
  {id: 'later', title: 'Fictional: book a trip', priority: 'normal', due: '2026-10-20', createdAt: '2026-09-28T08:00:00.000Z'},
]};
async function seed(page: Page, records: Record<string, unknown>) {
  await page.clock.install({time: new Date('2026-10-01T17:05:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.addInitScript(values => {
    if (sessionStorage.getItem('g1a-fixture')) return;
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    localStorage.setItem('zigoals:motion:v1', 'off');
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem('g1a-fixture', '1');
  }, records);
}
const card = (page: Page) => page.getByRole('article', {name: 'Your evening wrap-up'});
async function openCard(page: Page) {
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  const more = page.getByRole('region', {name: 'Updates and summaries'}).getByRole('button', {name: /^Show more/});
  if (await more.count()) await more.click();
  await expect(card(page)).toBeVisible();
}
const stored = async (page: Page) => (await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), TASKS_KEY)) as typeof tasks;

test('open tasks: move to tomorrow, let go, each with Undo; no "missed", no count', async ({page}) => {
  await seed(page, {[SETTINGS]: settings, [TASKS_KEY]: tasks, ...quiet});
  await openCard(page);
  const list = card(page).getByRole('region', {name: 'Moving to tomorrow'});
  await expect(list.getByRole('listitem')).toHaveText([/return the book/, /call the plumber/]);
  await expect(card(page)).not.toContainText(/missed|overdue|\b\d+ (tasks|open)\b/i);
  await list.getByRole('button', {name: 'Move “Fictional: call the plumber” to tomorrow'}).click();
  await expect(list.getByRole('status')).toContainText('“Fictional: call the plumber” moves to tomorrow.');
  await expect.poll(async () => (await stored(page)).tasks.find(t => t.id === 'today')).toMatchObject({due: '2026-10-02', time: '17:30'});
  await list.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await stored(page)).tasks.find(t => t.id === 'today')!.due).toBe(DAY);
  await list.getByRole('button', {name: 'Let “Fictional: return the book” go'}).click();
  await expect.poll(async () => (await stored(page)).tasks.find(t => t.id === 'overdue')!.due).toBeUndefined();
  await expect(list.getByRole('listitem')).toHaveText([/call the plumber/]);
});

test('a device with no task at all: one teaching line with the way to Tasks', async ({page}) => {
  await seed(page, {[SETTINGS]: settings, ...quiet});
  await openCard(page);
  await expect(card(page).getByText(/Tasks you give today’s date show here in the evening/)).toBeVisible();
  await expect(card(page).getByRole('link', {name: 'Open Tasks'})).toHaveAttribute('href', '/app/tasks');
});
