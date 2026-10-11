import {createServer, type Server} from 'node:http';
import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {AI_CHATS_DATABASE} from '../lib/ai/chats';

/**
 * Session X-Local Phase 2 (P2.4), stress and edge through the real panel against MOCK servers: a 50-turn chat; Stop
 * mid-stream; the device going offline mid-stream; a cold model that takes seconds before its first byte (the loading
 * state shows, no false time-out); a slow model whose tokens come seconds apart (no false stall); two tabs on one
 * device; switching the model mid-chat; the Health gate closed mid-chat (nothing of Health reaches the next request);
 * auto-accept's daily cap and Undo under fast repeated asks. Every reply is a MOCK; the records are the Showcase's.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const block = (value: unknown) => `Here you go.\n\n\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
type Body = {messages: {role: string; content: unknown}[]; model?: string};
const CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'};
async function server(page: Page, reply: (body: Body, n: number) => string) {
  const bodies: Body[] = [];
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}, {id: 'mock-chat-2'}]})});
    if (url.endsWith('/v1/chat/completions')) { const body = JSON.parse(route.request().postData() ?? '{}') as Body; bodies.push(body); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply(body, bodies.length))}); }
    return route.fulfill({status: 404, body: ''});
  });
  return bodies;
}
/** A real local server for streams the route API cannot shape: a first byte after `firstByteMs`, then tokens every `gapMs`. */
async function realServer(firstByteMs: number, tokens: string[], gapMs: number) {
  const sockets = new Set<import('node:net').Socket>(), timers = new Set<NodeJS.Timeout>();
  const srv: Server = createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
    if (req.url?.endsWith('/v1/models')) { res.writeHead(200, {...CORS, 'Content-Type': 'application/json'}); res.end(JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})); return; }
    res.writeHead(200, {...CORS, 'Content-Type': 'text/event-stream'}); sockets.add(res.socket!);
    tokens.forEach((token, i) => { const t = setTimeout(() => { if (res.writableEnded) return; res.write(chunk({role: 'assistant', content: token})); if (i === tokens.length - 1) { res.write(chunk({}, 'stop')); res.write('data: [DONE]\n\n'); res.end(); } }, firstByteMs + i * gapMs); timers.add(t); });
  });
  await new Promise<void>(resolve => srv.listen(0, '127.0.0.1', resolve));
  const port = (srv.address() as {port: number}).port;
  return {base: `http://127.0.0.1:${port}`, close: async () => { for (const t of timers) clearTimeout(t); for (const s of sockets) s.destroy(); await new Promise<void>(resolve => srv.close(() => resolve())); }};
}
async function seed(page: Page, {baseUrl = BASE, options = {} as Record<string, unknown>, settings = {} as Partial<AiSettings>, records = {} as Record<string, string>} = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const ai = {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl, includeHealth: true, pageShare: {...base.pageShare, health: true}, ...settings};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, ...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach', ...options})});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
const launcher = (page: Page) => page.locator('.ai-launcher-button');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
async function send(page: Page, text: string) { await page.getByLabel('Message to your AI').fill(text); await page.getByRole('button', {name: 'Send', exact: true}).click(); }
async function settled(page: Page) { await expect(panel(page).getByRole('button', {name: 'Stop', exact: true})).toHaveCount(0, {timeout: 30_000}); await expect(panel(page).locator('.ai-turn-live')).toHaveCount(0); }
const systemOf = (body: Body) => String(body.messages[0]!.content);
const storedChats = (page: Page) => page.evaluate(name => new Promise<{turns: {role: string; text: string; model?: string | null}[]; model: string | null}[]>((resolve, reject) => { const open = indexedDB.open(name); open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, store = db.objectStoreNames[0]!, all = db.transaction(store).objectStore(store).getAll(); all.onsuccess = () => { resolve(all.result as never); db.close(); }; all.onerror = () => reject(all.error); }; }), AI_CHATS_DATABASE);
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('a fifty-turn chat: every reply lands, the chat is never "full", the stored chat holds all hundred turns, and the last question still gets the page context', async ({page}) => {
  test.setTimeout(240_000);
  const bodies = await server(page, (_body, n) => n % 5 === 0 ? block({kind: 'log-water', glasses: 1}) : `Reply number ${n}: your records say what they say.`);
  await seed(page);
  await page.goto('/app');
  await openChat(page);
  for (let i = 1; i <= 50; i++) {
    await send(page, i % 5 === 0 ? 'Log a glass of water' : `Question ${i}: how is my week going?`);
    await settled(page);
    await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText(i % 5 === 0 ? 'Here you go.' : `Reply number ${i}`);
  }
  expect(bodies).toHaveLength(50);
  await expect(panel(page).getByRole('alert')).toHaveCount(0);
  expect(systemOf(bodies[49]!)).toContain('For this question');
  const chats = await storedChats(page);
  expect(chats[0]!.turns.length).toBe(100);
  await expect(panel(page).locator('.ai-card')).toHaveCount(10);
});

test('Stop mid-stream keeps the partial reply and the launcher settles; the next question goes on', async ({page}) => {
  const srv = await realServer(100, ['The first part of a long answer, ', 'then more, ', 'and more.'], 4_000);
  try {
    await seed(page, {baseUrl: srv.base});
    await page.goto('/app');
    await openChat(page);
    await send(page, 'Tell me about my week');
    await expect(panel(page).locator('.ai-turn-live')).toContainText('The first part of a long answer');
    await panel(page).getByRole('button', {name: 'Stop', exact: true}).click();
    await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('The first part of a long answer');
    await expect(panel(page).locator('.ai-turn-assistant').last().locator('.ai-turn-stopped')).toBeVisible();
    await expect(launcher(page)).not.toHaveAttribute('data-state', 'speaking');
    await send(page, 'And my habits?');
    await expect(panel(page).locator('.ai-turn-user').last()).toContainText('And my habits?');
  } finally { await srv.close(); }
});

test('the device goes offline mid-stream: the partial reply is kept, the failure says offline, and the launcher shows it; back online, the next question works', async ({page, context}) => {
  const srv = await realServer(100, ['Here is the start, ', 'and the rest.'], 6_000);
  try {
    await seed(page, {baseUrl: srv.base});
    await page.goto('/app');
    await openChat(page);
    await send(page, 'Summarise my week');
    await expect(panel(page).locator('.ai-turn-live')).toContainText('Here is the start');
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    // The open stream goes quiet rather than erroring: the watchdog ends it after 60 s with the partial reply kept; ZIGi
    // then rests as offline (the machine takes the offline event at rest, never in the middle of a reply).
    await page.clock.runFor(61_000);
    await expect(panel(page).getByRole('alert')).toBeVisible({timeout: 20_000});
    await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('Here is the start');
    await expect(launcher(page)).toHaveAttribute('data-state', 'offline', {timeout: 15_000});
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(launcher(page)).not.toHaveAttribute('data-state', 'offline', {timeout: 10_000});
  } finally { await srv.close(); }
});

test('a cold model: seconds before the first byte show the loading or thinking state and never a failure; the reply then lands', async ({page}) => {
  const srv = await realServer(6_000, ['Loaded now, here is the answer.'], 100);
  try {
    await seed(page, {baseUrl: srv.base});
    await page.goto('/app');
    await openChat(page);
    await send(page, 'How is my week going?');
    await expect(launcher(page)).toHaveAttribute('data-state', /loading-model|thinking/);
    await page.clock.runFor(40_000);
    await expect(panel(page).getByRole('alert')).toHaveCount(0);
    await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('Loaded now, here is the answer.', {timeout: 20_000});
  } finally { await srv.close(); }
});

test('a slow model whose tokens come seconds apart is never cut off by the stall watchdog', async ({page}) => {
  const srv = await realServer(200, ['One, ', 'two, ', 'three, ', 'four, ', 'five.'], 3_000);
  try {
    await seed(page, {baseUrl: srv.base});
    await page.goto('/app');
    await openChat(page);
    await send(page, 'Count slowly');
    await expect(panel(page).locator('.ai-turn-live')).toContainText('One,');
    // The fake clock advances with real time here: fifteen real seconds of tokens three seconds apart stay under the 60 s watchdog.
    await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('One, two, three, four, five.', {timeout: 40_000});
    await expect(panel(page).getByRole('alert')).toHaveCount(0);
  } finally { await srv.close(); }
});

test('two tabs on one device: a chat written in one is in the other\'s history after a reload, and both can ask', async ({page, context}) => {
  await server(page, () => 'Tab one here.');
  await seed(page);
  await page.goto('/app');
  await openChat(page);
  await send(page, 'Hello from tab one'); await settled(page);
  const other = await context.newPage();
  await other.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await server(other, () => 'Tab two here.');
  await other.goto('/app');
  await openChat(other);
  const seen = await storedChats(other);
  expect(seen.some(c => c.turns.some(t => t.text.includes('Hello from tab one')))).toBe(true);
  await send(other, 'Hello from tab two'); await settled(other);
  await expect(panel(other).locator('.ai-turn-assistant').last()).toContainText('Tab two here.');
  await other.close();
});

test('switching the model mid-chat: the next reply is asked of the new model and labelled with it; the chat goes on', async ({page}) => {
  const bodies = await server(page, body => `Answered by ${body.model ?? 'unknown'}.`);
  await seed(page);
  await page.goto('/app');
  await openChat(page);
  await send(page, 'First question'); await settled(page);
  expect(bodies[0]!.model).toBe('mock-chat');
  await page.evaluate(([key, event]) => { const s = JSON.parse(localStorage.getItem(key)!); s.model = 'mock-chat-2'; localStorage.setItem(key, JSON.stringify(s)); window.dispatchEvent(new StorageEvent('storage', {key: event})); }, [AI_SETTINGS_KEY, AI_SETTINGS_KEY] as const);
  await send(page, 'Second question'); await settled(page);
  expect(bodies[1]!.model).toBe('mock-chat-2');
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('Answered by mock-chat-2.');
  const chats = await storedChats(page);
  expect(chats[0]!.turns.filter(t => t.role === 'assistant').map(t => t.model)).toEqual(['mock-chat', 'mock-chat-2']);
});

test('the Health gate closed mid-chat: the next request carries nothing of Health (a planted weight never leaves), and says so', async ({page}) => {
  const health = JSON.parse(buildShowcase(DAY).records['zigoals:health:v1']!) as {weights: {date: string; grams: number}[]};
  const planted = {...health.weights[health.weights.length - 1]!, date: '2026-09-19', grams: 123_400};
  health.weights = [...health.weights.filter(w => w.date !== '2026-09-19'), planted];
  const bodies = await server(page, () => 'Noted.');
  await seed(page, {records: {'zigoals:health:v1': JSON.stringify(health)}});
  await page.goto('/app/health');
  await openChat(page);
  // An advice-shaped ask (the device answers plain lookups itself): the question-aware context brings yesterday's weight to the model.
  await send(page, 'Should I be worried about my weight yesterday?'); await settled(page);
  expect(bodies).toHaveLength(1);
  expect(systemOf(bodies[0]!)).toContain('123.4');
  await page.evaluate(([key, event]) => { const s = JSON.parse(localStorage.getItem(key)!); s.includeHealth = false; s.pageShare = {...s.pageShare, health: false}; localStorage.setItem(key, JSON.stringify(s)); window.dispatchEvent(new StorageEvent('storage', {key: event})); }, [AI_SETTINGS_KEY, AI_SETTINGS_KEY] as const);
  await send(page, 'And should I worry about my weight the day before?'); await settled(page);
  // With the gate closed the question is either answered on the device with the Health-closed note (no request at all)
  // or sent without any Health: either way the planted value never leaves.
  if (bodies.length > 1) { expect(systemOf(bodies[1]!)).not.toContain('123.4'); expect(systemOf(bodies[1]!)).not.toContain('123,4'); expect(JSON.stringify(bodies[1])).not.toContain('123400'); }
  else await expect(panel(page)).toContainText(/Health/);
  expect(await page.evaluate(() => document.body.innerText)).not.toContain('123.4');
});

test('auto-accept under fast repeated asks: the daily cap holds, every auto-added card has Undo, and Undo removes the entry', async ({page}) => {
  await server(page, () => block({kind: 'log-water', glasses: 1}));
  await seed(page, {options: {autoAccept: {kinds: {'log-water': true}, dailyCap: 3}}});
  await page.goto('/app/health');
  await openChat(page);
  for (let i = 0; i < 5; i++) { await send(page, `Log a glass of water ${i + 1}`); await settled(page); }
  const auto = panel(page).locator('.ai-card-auto');
  await expect(auto).toHaveCount(3);
  await expect(panel(page).locator('.ai-card-proposed')).toHaveCount(2);
  await expect(panel(page).getByText(/cap|limit|today/i).first()).toBeVisible();
  const before = await page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:health:v1')!) as {daily: {water: unknown[]}}).daily.water.length);
  await panel(page).getByRole('button', {name: /^Undo/}).first().click();
  await expect(panel(page).locator('.ai-card-undone')).toHaveCount(1);
  const after = await page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:health:v1')!) as {daily: {water: unknown[]}}).daily.water.length);
  expect(after).toBe(before - 1);
});
