import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {ZIGI_KEY, ZIGI_KNOCK_KEY} from '../lib/ai/store/keys';
import {createHabit, emptyHabitData, HABITS_KEY, type HabitData} from '../lib/habits';
import {REMINDERS_KEY} from '../lib/reminders/schema';
import {CELEBRATIONS_KEY} from '../lib/w-device-keys';

/**
 * Session X-Local Phase 2 (P2.5): one simulated day with the knock on, on a fixed clock (Sunday 2026-09-20, UTC):
 * the morning greeting, a small success for the first habit, one knock for the first due reminder and none for the
 * second in the same session (the nudge budget) but in the next one, "Not today" ending that reminder's knocks for the
 * day, the day's last habit as the calm celebration (once a day), a done day staying quiet, and nothing at all in the quiet
 * hours even with an open habit due. Every fact comes from the app's own engines;
 * no AI is asked (the panel is opened and closed only).
 */
const DAY = '2026-09-20';
const A = '7a000000-0000-4000-8000-0000000000a1', B = '7a000000-0000-4000-8000-0000000000b2', C = '7a000000-0000-4000-8000-0000000000c3', D = '7a000000-0000-4000-8000-0000000000d4';
function habits(): HabitData {
  let d = createHabit(emptyHabitData(), {title: 'Stretch evening', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), A);
  d = createHabit(d, {title: 'Read ten pages', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), B);
  d = createHabit(d, {title: 'Water the plants', category: 'Home', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), C);
  return {...d, timeZone: 'UTC'};
}
async function seed(page: Page, time: string) {
  await page.clock.install({time});
  await page.goto('/app/settings');
  const values = {...buildShowcase(DAY).records, [HABITS_KEY]: JSON.stringify(habits()), [REMINDERS_KEY]: JSON.stringify({version: 1, habits: {[B]: {time: '09:05'}, [C]: {time: '09:20'}}, dismissed: {}}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234'}),
    [ZIGI_KEY]: JSON.stringify({version: 1, animation: 'calm', knock: {enabled: true, offer: 'accepted'}})};
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
const launcher = (page: Page) => page.locator('.ai-launcher-button');
const knock = (page: Page) => page.locator('.zigi-knock');
const stored = async (page: Page, key: string) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null') as Record<string, unknown> | null;
async function alive(page: Page) { await expect(launcher(page)).toBeVisible(); await expect.poll(() => launcher(page).locator('img').evaluate(el => el.getAttribute('data-playing') !== null), {timeout: 15_000}).toBe(true); }
const complete = (page: Page, title: string) => page.getByRole('button', {name: `Complete ${title}`, exact: true}).first().click();
async function settled(page: Page) { await expect(page.getByTestId('ai-launcher')).toBeVisible(); await page.waitForTimeout(1500); }
test.use({timezoneId: 'UTC'});
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('a day with the knock on: the greeting, a success, one knock of two due reminders (the budget), the other in the next session and Not today, the celebration once, a quiet done day, and silence in the quiet hours', async ({page}) => {
  test.setTimeout(120_000);
  // 07:30 — the first open of the day greets; closing waves goodbye; at rest, idle.
  await seed(page, '2026-09-20T07:30:00.000Z');
  await page.goto('/app/habits');
  await alive(page);
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await expect(launcher(page)).toHaveAttribute('data-state', 'greeting');
  // Closed with its own control (Escape in the composer is the composer's first).
  await page.locator('dialog.ai-chat[open]').getByRole('button', {name: /^Close/}).first().click();
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle', {timeout: 10_000});
  // 08:00 — the first habit done: a small success, never a celebration (two still open).
  await page.clock.runFor(30 * 60_000);
  await complete(page, 'Stretch evening');
  await expect(launcher(page)).toHaveAttribute('data-state', 'success');
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle', {timeout: 10_000});
  expect(await stored(page, CELEBRATIONS_KEY)).toBeNull();
  // 09:30 — two reminders came due (09:05 and 09:20) while the page stayed open: ZIGi knocks once in this session, the
  // second waits (the nudge budget: one per session, a session being the page's life; a reload is a new one).
  await page.clock.runFor(90 * 60_000);
  await expect(knock(page)).toBeVisible({timeout: 15_000});
  // Two are due; the knock shows one of them (the companion's own pick), never both.
  await expect(knock(page).getByRole('heading', {name: /Read ten pages|Water the plants/})).toBeVisible();
  await expect(knock(page).getByRole('heading')).toHaveCount(1);
  await expect(launcher(page)).toHaveAttribute('data-state', /^(idle|reminder)$/);
  await knock(page).getByRole('button', {name: "Close ZIGi's reminder"}).click();
  await page.clock.runFor(10 * 60_000); await settled(page);
  await expect(knock(page)).toHaveCount(0);
  expect((await stored(page, ZIGI_KNOCK_KEY))?.counts).toEqual({[DAY]: 1});
  // 09:45 — a new session (a reload): the other due reminder knocks now; "Not today" ends its knocks for the day.
  await page.clock.runFor(5 * 60_000);
  await page.reload();
  await expect(knock(page)).toBeVisible({timeout: 15_000});
  await expect(knock(page).getByRole('heading', {name: /Read ten pages|Water the plants/})).toBeVisible();
  await knock(page).getByRole('button', {name: 'Not today'}).click();
  await expect(knock(page)).toHaveCount(0);
  const shown = ((await stored(page, ZIGI_KNOCK_KEY))?.shown as Record<string, string[]>)[DAY] ?? [];
  expect([...shown].sort()).toEqual([B, C]);
  await page.reload(); await settled(page);
  await expect(knock(page)).toHaveCount(0);
  expect((await stored(page, ZIGI_KNOCK_KEY))?.counts).toEqual({[DAY]: 2});
  // 12:00 — the second habit done: a success; the third, the day's last: the calm celebration, recorded once for the day.
  await page.clock.runFor(135 * 60_000);
  await complete(page, 'Read ten pages');
  await expect(launcher(page)).toHaveAttribute('data-state', 'success');
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle', {timeout: 10_000});
  await page.clock.runFor(9_000);
  await complete(page, 'Water the plants');
  await expect(launcher(page)).toHaveAttribute('data-state', 'celebrate');
  expect((await stored(page, CELEBRATIONS_KEY))?.seen).toMatchObject({[`all-done:${DAY}`]: DAY});
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle', {timeout: 10_000});
  // 15:00 — a done day stays quiet: a new session with nothing due knocks for nothing.
  await page.clock.runFor(180 * 60_000);
  await page.reload(); await settled(page);
  await expect(knock(page)).toHaveCount(0);
  expect((await stored(page, ZIGI_KNOCK_KEY))?.counts).toEqual({[DAY]: 2});
  // 22:30 — the quiet hours: a new habit with its reminder at 22:15 is due and open, the day's cap has room (2 of 3),
  // nothing was dismissed for it; still nothing knocks, and ZIGi rests.
  await page.clock.runFor(450 * 60_000);
  const withD = createHabit(JSON.parse((await page.evaluate(k => localStorage.getItem(k), HABITS_KEY))!) as HabitData, {title: 'Night stretch', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-20T22:00:00Z'), D);
  await page.evaluate(([habitsKey, habitsJson, remindersKey, id]) => { localStorage.setItem(habitsKey, habitsJson); const r = JSON.parse(localStorage.getItem(remindersKey)!); r.dismissed = {}; r.habits[id] = {time: '22:15'}; localStorage.setItem(remindersKey, JSON.stringify(r)); }, [HABITS_KEY, JSON.stringify(withD), REMINDERS_KEY, D] as const);
  await page.reload(); await settled(page);
  await expect(knock(page)).toHaveCount(0);
  expect((await stored(page, ZIGI_KNOCK_KEY))?.counts).toEqual({[DAY]: 2});
  await expect(launcher(page)).toHaveAttribute('data-state', /^(idle|sleepy)$/);
});
