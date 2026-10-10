import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {ZIGI_KEY, ZIGI_KNOCK_KEY, ZIGI_REMINDERS_KEY} from '../lib/ai/store/keys';
import {KNOCK_OFFER} from '../lib/ai/knock/offer';
import {createHabit, habitDataSchema, HABITS_KEY, type HabitData} from '../lib/habits';
import {PLATFORM_KEY} from '../lib/positions';
import {REMINDERS_KEY} from '../lib/reminders/schema';

/**
 * Session V Part 13, ZIGi's knock end to end, with a fixed clock (Sunday 2026-09-20, the Showcase day): off by default
 * and offered once; when on, a due reminder makes ZIGi knock with "Do it now", "Snooze" and "Not today"; never in the
 * quiet hours, while hidden, on a sensitive screen or on Today (whose cards show it); ZIGi's weekly reminders on Today;
 * a push arriving while the page is open knocks at once; opening from a notification makes ZIGi greet once.
 */
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z', BASE = 'http://127.0.0.1:1234';
const HABIT_ID = '7a000000-0000-4000-8000-0000000000a1';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
function records(): Record<string, string> {
  const base = buildShowcase(DAY).records;
  const habits = createHabit(habitDataSchema.parse(JSON.parse(base[HABITS_KEY]!)) as HabitData, {title: 'Stretch evening', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), HABIT_ID);
  return {...base, [HABITS_KEY]: JSON.stringify(habits), [REMINDERS_KEY]: JSON.stringify({version: 1, habits: {[HABIT_ID]: {time: '18:00'}}, dismissed: {}})};
}
const showcaseGoal = () => (JSON.parse(buildShowcase(DAY).records[PLATFORM_KEY]!) as {goals: {id: string; name: string; status: string}[]}).goals.find(g => g.status !== 'closed')!;
async function seed(page: Page, extra: Record<string, unknown> = {}, time = EVENING) {
  await page.clock.install({time});
  await page.goto('/app/settings');
  const values = {...records(), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]))};
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
const KNOCK_ON = {[ZIGI_KEY]: {version: 1, knock: {enabled: true, offer: 'accepted'}}};
const knock = (page: Page) => page.locator('.zigi-knock');
const stored = async (page: Page, key: string) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null');
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
/** The launcher is there and the knock companion had time to look: then "no knock" means no knock. */
async function settled(page: Page) { await expect(page.getByTestId('ai-launcher')).toBeVisible(); await page.waitForTimeout(1500); }
// The fixed clock is read in UTC on every runner (quiet hours, "Tonight" and the reminder's 18:00 are local times).
test.use({timezoneId: 'UTC'});
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('knocking is off by default: a due reminder only shows its card on Today', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits');
  await settled(page);
  await expect(knock(page)).toHaveCount(0);
  expect(await stored(page, ZIGI_KNOCK_KEY)).toBeNull();
  await page.goto('/app');
  await expect(page.getByRole('article', {name: 'Reminder: Stretch evening'})).toBeVisible();
});

test('on: ZIGi knocks once for a due reminder; "Do it now" gives the check-in card, and adding it checks the habit in', async ({page}) => {
  await seed(page, KNOCK_ON);
  await page.goto('/app/habits');
  await expect(knock(page)).toBeVisible();
  await expect(knock(page).getByRole('heading', {name: 'Stretch evening'})).toBeVisible();
  await expect(knock(page)).toContainText('On your list for today · 18:00');
  await expect(page.locator('.ai-launcher-button')).toHaveAttribute('data-state', /^(idle|reminder)$/);
  expect(await stored(page, ZIGI_KNOCK_KEY)).toMatchObject({version: 1, counts: {[DAY]: 1}, shown: {[DAY]: [HABIT_ID]}});
  await knock(page).getByRole('button', {name: 'Do it now'}).click();
  const card = knock(page).locator('.ai-card').first();
  await expect(card).toContainText('Check in: Stretch evening');
  await card.getByRole('button', {name: /^Add/}).click();
  await expect(knock(page)).toContainText('Undo');
  const habits = await stored(page, HABITS_KEY) as {habits: {id: string; entries: {date: string; count: number}[]}[]};
  expect(habits.habits.find(h => h.id === HABIT_ID)!.entries.find(e => e.date === DAY)?.count).toBe(1);
  await knock(page).getByRole('button', {name: "Close ZIGi's reminder"}).click();
  await expect(knock(page)).toHaveCount(0);
  // Once a day: the next visit does not knock again for it.
  await page.reload();
  await settled(page);
  await expect(knock(page)).toHaveCount(0);
});

test('Snooze holds the reminder for its time, then ZIGi knocks once more; Not today dismisses it for the day', async ({page}) => {
  await seed(page, KNOCK_ON);
  await page.goto('/app/goals');
  await expect(knock(page)).toBeVisible();
  await knock(page).getByRole('button', {name: 'Snooze'}).click();
  await expect(knock(page).getByRole('group', {name: 'Snooze for'}).getByRole('button')).toHaveText(['15 minutes', '1 hour', 'Tonight', 'Back']);
  await knock(page).getByRole('button', {name: '15 minutes'}).click();
  await expect(knock(page)).toHaveCount(0);
  expect(Object.keys((await stored(page, ZIGI_KNOCK_KEY)).snoozed)).toEqual([HABIT_ID]);
  await page.clock.fastForward('10:00');
  await page.waitForTimeout(500);
  await expect(knock(page)).toHaveCount(0);
  await page.clock.fastForward('06:30');
  await expect(knock(page)).toBeVisible();
  await knock(page).getByRole('button', {name: 'Not today'}).click();
  await expect(knock(page)).toHaveCount(0);
  expect((await stored(page, REMINDERS_KEY)).dismissed).toEqual({[HABIT_ID]: DAY});
  await page.clock.fastForward('30:00');
  await page.waitForTimeout(500);
  await expect(knock(page)).toHaveCount(0);
});

test('never in the quiet hours, while ZIGi is hidden, on a sensitive screen, or on Today', async ({page}) => {
  await seed(page, KNOCK_ON, '2026-09-20T22:30:00.000Z');
  await page.goto('/app/habits');
  await settled(page);
  await expect(knock(page)).toHaveCount(0);
  await seed(page, {...KNOCK_ON, [AI_SETTINGS_KEY]: {...defaultAiSettings(), launcherHidden: true}});
  await page.goto('/app/habits');
  await expect(page.getByRole('button', {name: 'Show ZIGi', exact: true})).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(knock(page)).toHaveCount(0);
  await seed(page, KNOCK_ON);
  await page.goto('/app');
  await expect(page.getByRole('article', {name: 'Reminder: Stretch evening'})).toBeVisible();
  await settled(page);
  await expect(knock(page)).toHaveCount(0);
  await page.goto('/app/wealth?add=asset');
  await expect(page.locator('dialog.wealth-sheet[open]')).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(knock(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(knock(page)).toBeVisible();
});

test('ZIGi\'s weekly reminders: a goal check-in shows on Today with "Open goal" and "Dismiss for today", and knocks elsewhere', async ({page}) => {
  const goal = showcaseGoal();
  await seed(page, {[REMINDERS_KEY]: {version: 1, habits: {}, dismissed: {}}, [ZIGI_REMINDERS_KEY]: {version: 1, goalCheckIns: {[`private:${goal.id}`]: {weekday: 0, time: '18:00'}}}});
  await page.goto('/app');
  const card = page.getByRole('article', {name: `Reminder: ${goal.name}`});
  await expect(card).toContainText(`Weekly check-in: ${goal.name}`);
  await expect(card.getByRole('link', {name: 'Open goal'})).toHaveAttribute('href', `/app/goals/tracked/${goal.id}`);
  await card.getByRole('button', {name: 'Dismiss for today'}).click();
  await expect(card).toHaveCount(0);
  expect((await stored(page, ZIGI_REMINDERS_KEY)).dismissed).toEqual({[DAY]: [`goal:private:${goal.id}`]});
  await seed(page, {...KNOCK_ON, [REMINDERS_KEY]: {version: 1, habits: {}, dismissed: {}}, [ZIGI_REMINDERS_KEY]: {version: 1, goalCheckIns: {[`private:${goal.id}`]: {weekday: 0, time: '18:00'}}}});
  await page.goto('/app/habits');
  await expect(knock(page).getByRole('heading', {name: `Weekly check-in: ${goal.name}`})).toBeVisible();
  await knock(page).getByRole('button', {name: 'Open goal'}).click();
  await page.waitForURL(`**/app/goals/tracked/${goal.id}`);
  await expect(knock(page)).toHaveCount(0);
});

test('a push that arrives while the page is open knocks at once; opening from a notification makes ZIGi greet once', async ({page}) => {
  await seed(page, KNOCK_ON, '2026-09-20T17:59:00.000Z');
  await page.goto('/app/habits');
  await settled(page);
  await expect(knock(page)).toHaveCount(0);
  await page.clock.setFixedTime(new Date('2026-09-20T18:00:10.000Z'));
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {data: {type: 'zigoals:push-reminder'}})));
  await expect(knock(page)).toBeVisible({timeout: 3000});
  await page.goto('/app/goals?zigi=hello');
  await expect(page.locator('.ai-launcher-button')).toHaveAttribute('data-state', 'greeting');
  await expect.poll(() => new URL(page.url()).search).toBe('');
  await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {data: {type: 'zigoals:push-open'}})));
  await expect(page.locator('.ai-launcher-button')).toHaveAttribute('data-state', 'greeting');
});

async function mockProvider(page: Page) {
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('MOCK: hello there.')});
    return route.fulfill({status: 404, body: ''});
  });
}
const connected = {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, connectedOn: DAY};
test('offered once after the first chat: "Not now" keeps knocking off and the question never returns', async ({page}) => {
  await mockProvider(page);
  await seed(page, {[AI_SETTINGS_KEY]: connected});
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByText(KNOCK_OFFER)).toHaveCount(0);
  await page.getByLabel('Message to your AI').fill('Hello');
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: hello there.');
  const offer = panel(page).getByRole('group', {name: 'A question from ZIGi'});
  await expect(offer).toContainText(KNOCK_OFFER);
  await offer.getByRole('button', {name: 'Not now'}).click();
  await expect(offer).toHaveCount(0);
  expect((await stored(page, ZIGI_KEY)).knock).toEqual({offer: 'declined'});
  await page.reload();
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await page.getByLabel('Message to your AI').fill('Hello again');
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: hello there.');
  await expect(panel(page).getByText(KNOCK_OFFER)).toHaveCount(0);
});

test('"Yes, knock" on a later day turns knocking on; ZIGi knocks once the panel is closed; Customize has the same switch', async ({page}) => {
  await mockProvider(page);
  await seed(page, {[AI_SETTINGS_KEY]: {...connected, connectedOn: '2026-09-18'}});
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  const offer = panel(page).getByRole('group', {name: 'A question from ZIGi'});
  await expect(offer).toContainText(KNOCK_OFFER);
  await offer.getByRole('button', {name: 'Yes, knock'}).click();
  expect((await stored(page, ZIGI_KEY)).knock).toEqual({offer: 'accepted', enabled: true});
  await expect(knock(page)).toHaveCount(0);
  await panel(page).getByRole('button', {name: 'Close ZIGi', exact: true}).click();
  await expect(knock(page)).toBeVisible();
  await knock(page).getByRole('button', {name: "Close ZIGi's reminder"}).click();
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await panel(page).getByRole('button', {name: /^More/}).click(); await panel(page).getByRole('button', {name: 'Customize ZIGi'}).click();
  const knockSwitch = panel(page).getByRole('switch', {name: 'Knock when a reminder is due'});
  await expect(knockSwitch).toHaveAttribute('aria-checked', 'true');
  await knockSwitch.click();
  expect((await stored(page, ZIGI_KEY)).knock).toMatchObject({offer: 'accepted', enabled: false});
});
