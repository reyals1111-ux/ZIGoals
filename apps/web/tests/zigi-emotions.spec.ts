import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY, ZIGI_KEY} from '../lib/ai/store/keys';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue, type HabitData} from '../lib/habits';
import {REMINDERS_KEY} from '../lib/reminders/schema';
import {CELEBRATIONS_KEY} from '../lib/w-device-keys';
import manifest from '../components/zigi/manifest.json';
import {AI_CHATS_DATABASE} from '../lib/ai/chats';

/**
 * Session X-Local Part 4: ZIGi's emotions match what happens, on real pages, with the panel closed. The facts come
 * from the app (the habit engine counted them): a completed habit is a small success, the day's last scheduled habit a
 * celebration (once a day), a streak milestone makes ZIGi proud. The knock obeys the companion controller: one nudge
 * per session, none after a dismissal, none while the person types. The AI's one hint moves ZIGi only inside the fixed
 * list and never shows in the text. Meet ZIGi says in plain words what each state means. Every AI answer is a MOCK.
 */
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z', BASE = 'http://127.0.0.1:1234';
const A = '7a000000-0000-4000-8000-0000000000a1', B = '7a000000-0000-4000-8000-0000000000b2';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
/** Two daily habits of our own, nothing else: the day is "all done" once both are. `streak` gives A six earlier days. */
function habits(streak = false): HabitData {
  let d = createHabit(emptyHabitData(), {title: 'Stretch evening', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), A);
  d = createHabit(d, {title: 'Read ten pages', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), B);
  d = {...d, timeZone: 'UTC'};
  if (streak) for (const date of ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19']) d = logHabitValue(d, A, date, 1, {}, new Date(`${date}T20:00:00Z`));
  return d;
}
async function seed(page: Page, extra: Record<string, unknown> = {}, time = EVENING) {
  await page.clock.install({time});
  await page.goto('/app/settings');
  const values = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]))};
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
const launcher = (page: Page) => page.locator('.ai-launcher-button');
const state = (page: Page) => launcher(page).getAttribute('data-state');
const stored = async (page: Page, key: string) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null') as Record<string, unknown> | null;
/** The alive chunk has started once the launcher plays its clip (the frames come from the chunk; Calm plays the idle clip). */
async function alive(page: Page) { await expect(launcher(page)).toBeVisible(); await expect.poll(() => launcher(page).locator('img').evaluate(el => el.getAttribute('data-playing') !== null), {timeout: 15_000}).toBe(true); }
const complete = (page: Page, title: string) => page.getByRole('button', {name: `Complete ${title}`, exact: true}).first().click();
test.use({timezoneId: 'UTC'});
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('on Habits with the panel closed: a completed habit is a small success, the day\'s last one a celebration (once a day), a streak milestone makes ZIGi proud', async ({page}) => {
  await seed(page, {[HABITS_KEY]: habits()});
  await page.goto('/app/habits');
  await alive(page);
  expect(await state(page)).toBe('idle');
  await complete(page, 'Stretch evening');
  await expect(launcher(page)).toHaveAttribute('data-state', 'success');
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle', {timeout: 6000});
  // Reactions keep their distance: the second check-in comes after the 8 s rate limit.
  await page.clock.runFor(9000);
  await complete(page, 'Read ten pages');
  await expect(launcher(page)).toHaveAttribute('data-state', 'celebrate');
  expect((await stored(page, CELEBRATIONS_KEY))?.seen).toMatchObject({[`all-done:${DAY}`]: DAY});
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle', {timeout: 6000});
  // Undo and complete again: the day was celebrated already, so a small success at most.
  await page.clock.runFor(9000);
  await page.getByRole('button', {name: 'Undo completion for Read ten pages', exact: true}).first().click();
  await page.clock.runFor(9000);
  await complete(page, 'Read ten pages');
  await expect(launcher(page)).toHaveAttribute('data-state', 'success');
});
test('a streak milestone the engine counted makes ZIGi proud; the AI never decides it', async ({page}) => {
  await seed(page, {[HABITS_KEY]: habits(true)});
  await page.goto('/app/habits');
  await alive(page);
  await complete(page, 'Stretch evening');
  await expect(launcher(page)).toHaveAttribute('data-state', 'proud');
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle', {timeout: 6000});
});
test('the knock obeys the controller: one nudge per session, none after a dismissal, none while the person types', async ({page}) => {
  await seed(page, {[HABITS_KEY]: habits(), [REMINDERS_KEY]: {version: 1, habits: {[A]: {time: '18:00'}, [B]: {time: '18:30'}}, dismissed: {}}, [ZIGI_KEY]: {version: 1, knock: {enabled: true, offer: 'accepted'}}}, '2026-09-20T17:58:00.000Z');
  // Markets: a page the knock is allowed on (not Today) with a visible search field to type in.
  await page.goto('/app/markets');
  await alive(page);
  const knock = page.locator('.zigi-knock');
  await page.waitForTimeout(1500);
  await expect(knock).toHaveCount(0);
  // Typing in a text field across the minute the reminder falls due (the knock looks every 30 s; the fake clock also
  // runs with real time, so the window is kept wide): no knock while the person types.
  const field = page.locator('input[type="search"]:visible').first();
  await field.click();
  await expect(field).toBeFocused();
  await page.clock.runFor(60_000);
  await field.press('a');
  // Typing in any text field makes ZIGi listen (the controller's typing guard is on).
  await expect(launcher(page)).toHaveAttribute('data-state', 'listening');
  for (let i = 0; i < 90; i++) { await field.press('a'); await page.clock.runFor(1000); }
  await expect(knock).toHaveCount(0);
  await field.blur();
  // Typing over: the next tick knocks (the session's one nudge).
  await page.clock.runFor(35_000);
  await expect(knock).toBeVisible({timeout: 10_000});
  await expect(knock.getByRole('heading', {name: 'Stretch evening'})).toBeVisible();
  // Closing it is a dismissal: the second reminder, due 18:30, never knocks this session.
  await knock.getByRole('button', {name: "Close ZIGi's reminder"}).click();
  await expect(knock).toHaveCount(0);
  await page.clock.runFor(31 * 60_000);
  await page.waitForTimeout(500);
  await expect(knock).toHaveCount(0);
});
test('the AI\'s hint moves ZIGi only inside the fixed list, never shows in the text, and yields to cards and to careful mode', async ({page}) => {
  const replies: string[] = [];
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(replies.shift() ?? 'MOCK')});
    return route.fulfill({status: 404, body: ''});
  });
  await seed(page, {[AI_SETTINGS_KEY]: {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE}, [AI_OPTIONS_KEY]: {version: 1, toolMode: 'attach'}});
  await page.goto('/app/goals');
  await alive(page);
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible();
  const ask = async (text: string, reply: string) => { replies.push(reply); await panel.getByLabel('Message to your AI').fill(text); await panel.getByRole('button', {name: 'Send', exact: true}).click(); await expect(panel.locator('.ai-turn-assistant').last()).toBeVisible({timeout: 10_000}); };
  const head = panel.locator('.ai-chat-head .zigi');
  await ask('Which fund is closer?', 'Two of your goals are funds. Which one do you mean? ⟦zigi: curious⟧');
  await expect(head).toHaveAttribute('data-state', 'curious');
  await expect(panel.locator('.ai-turn-assistant').last()).toContainText('Which one do you mean?');
  await expect(panel.locator('.ai-turn-assistant').last()).not.toContainText('zigi:');
  await expect(head).toHaveAttribute('data-state', 'idle', {timeout: 6000});
  // A mood outside the list is dropped with the marker: an ordinary insight, a clean text.
  await page.clock.runFor(9000);
  await ask('And my habits?', 'Your habits look steady. [[zigi: celebrate]]');
  await expect(head).toHaveAttribute('data-state', 'insight');
  await expect(panel.locator('.ai-turn-assistant').last()).toContainText('Your habits look steady.');
  await expect(panel.locator('.ai-turn-assistant').last()).not.toContainText('zigi');
  await expect(head).toHaveAttribute('data-state', 'idle', {timeout: 6000});
  // Cards win over a hint.
  await page.clock.runFor(9000);
  await ask('Log a glass of water', 'One glass.\n\n```zigoals-action\n{"kind":"log-water","glasses":1}\n```\n\n⟦zigi: surprised⟧');
  await expect(head).toHaveAttribute('data-state', 'presenting');
  await expect(panel.locator('.ai-card')).toHaveCount(1);
  // The stored chat is clean: what History reads back carries the text and never a marker.
  const records = await page.evaluate(name => new Promise<string>((resolve, reject) => { const open = indexedDB.open(name); open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, store = db.objectStoreNames[0]!, all = db.transaction(store).objectStore(store).getAll(); all.onsuccess = () => { resolve(JSON.stringify(all.result)); db.close(); }; }; }), AI_CHATS_DATABASE);
  expect(records).toContain('Two of your goals are funds. Which one do you mean?');
  expect(records).toContain('Your habits look steady.');
  expect(records).not.toMatch(/⟦|\[\[zigi|zigi:/);
});
test('Meet ZIGi shows the studio\'s art for every state with what it means in plain words', async ({page}) => {
  await seed(page);
  await page.goto('/app/zigi');
  const cards = page.locator('.meet-zigi-card');
  await expect(cards).toHaveCount(Object.keys(manifest.states).length);
  for (const [state, spec] of Object.entries(manifest.states)) {
    const card = page.getByRole('article', {name: spec.label, exact: true});
    await expect(card.locator('.meet-zigi-meaning')).not.toBeEmpty();
    const src = await card.locator('.zigi img').first().evaluate(el => (el as HTMLImageElement).currentSrc);
    expect(src, state).toContain('/brand/figures/zigi/origami-nebula/');
  }
  await expect(page.getByRole('article', {name: 'Celebrate', exact: true})).toContainText('A moment the app confirmed');
  await expect(page.getByRole('article', {name: 'Reading your data', exact: true})).toContainText('Wears the thinking clip');
});
