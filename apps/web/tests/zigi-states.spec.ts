import {createServer, type Server} from 'node:http';
import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY, ZIGI_KEY} from '../lib/ai/store/keys';
import {ZIGI_MANIFEST} from '../components/zigi/manifest';

/**
 * Session X-Local Phase 2 (P2.5): every one of the manifest's 25 states occurs in realistic use, each driven through the
 * real panel against a MOCK and read off the launcher's `data-state` (a page-side observer records every value the
 * launcher takes, so a clip that plays for a second is caught). The states this file leaves to other specs are named at
 * the end and checked by a unit test (`zigi-state-coverage.test.ts`): celebrate and proud (zigi-emotions), reminder
 * (zigi-knock), loading-model from a cold model (zigi-stress). Both Chrome projects.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'};
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
type Body = {messages: {role: string; content: unknown}[]; tools?: unknown[]};
async function server(page: Page, reply: (body: Body, n: number) => string | {status: number}) {
  const bodies: Body[] = [];
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { const body = JSON.parse(route.request().postData() ?? '{}') as Body; bodies.push(body); const r = reply(body, bodies.length); return typeof r === 'string' ? route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(r)}) : route.fulfill({status: r.status, contentType: 'application/json', body: JSON.stringify({error: {message: 'mock failure'}})}); }
    return route.fulfill({status: 404, body: ''});
  });
  return bodies;
}
/** A real server streaming tokens with gaps, for the states that live between the first and the last byte. */
async function slowServer(tokens: string[], firstByteMs: number, gapMs: number) {
  const sockets = new Set<import('node:net').Socket>(), timers = new Set<NodeJS.Timeout>();
  const srv: Server = createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
    if (req.url?.endsWith('/v1/models')) { res.writeHead(200, {...CORS, 'Content-Type': 'application/json'}); res.end(JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})); return; }
    res.writeHead(200, {...CORS, 'Content-Type': 'text/event-stream'}); sockets.add(res.socket!);
    tokens.forEach((token, i) => { const t = setTimeout(() => { if (res.writableEnded) return; res.write(chunk({role: 'assistant', content: token})); if (i === tokens.length - 1) { res.write(chunk({}, 'stop')); res.write('data: [DONE]\n\n'); res.end(); } }, firstByteMs + i * gapMs); timers.add(t); });
  });
  await new Promise<void>(resolve => srv.listen(0, '127.0.0.1', resolve));
  return {base: `http://127.0.0.1:${(srv.address() as {port: number}).port}`, close: async () => { for (const t of timers) clearTimeout(t); for (const s of sockets) s.destroy(); await new Promise<void>(resolve => srv.close(() => resolve())); }};
}
async function seed(page: Page, {baseUrl = BASE, settings = {} as Partial<AiSettings>, look = {} as Record<string, unknown>, options = {} as Record<string, unknown>} = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const ai = {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl, includeHealth: true, pageShare: {...base.pageShare, health: true}, ...settings};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach', ...options}), [ZIGI_KEY]: JSON.stringify({version: 1, animation: 'calm', ...look})});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
const launcher = (page: Page) => page.locator('.ai-launcher-button');
/** Records every value the launcher's data-state takes from now on (clips that play for a second are caught this way). */
async function observe(page: Page) {
  await page.evaluate(() => { const w = window as unknown as {__states: string[]}; w.__states = []; const b = document.querySelector('.ai-launcher-button'); if (!b) return; const push = () => { const s = b.getAttribute('data-state') ?? ''; if (w.__states[w.__states.length - 1] !== s) w.__states.push(s); }; push(); new MutationObserver(push).observe(b, {attributes: true, attributeFilter: ['data-state']}); });
}
const seen = (page: Page) => page.evaluate(() => (window as unknown as {__states: string[]}).__states ?? []);
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
async function send(page: Page, text: string) { await page.getByLabel('Message to your AI').fill(text); await page.getByRole('button', {name: 'Send', exact: true}).click(); }
async function settled(page: Page) { await expect(panel(page).getByRole('button', {name: 'Stop', exact: true})).toHaveCount(0, {timeout: 30_000}); await expect(panel(page).locator('.ai-turn-live')).toHaveCount(0); }
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('at rest: idle; the first open of the day: greeting; typing: listening; closing: wave goodbye; a quiet open panel: sleepy', async ({page}) => {
  await server(page, () => 'Hello.');
  await seed(page);
  await page.goto('/app');
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle');
  await observe(page);
  await openChat(page);
  await expect.poll(() => seen(page)).toContain('greeting');
  await page.getByLabel('Message to your AI').focus(); await page.keyboard.type('hello');
  await expect.poll(() => seen(page)).toContain('listening');
  await page.getByLabel('Message to your AI').fill('');
  await page.keyboard.press('Escape');
  await expect.poll(() => seen(page)).toContain('wave-goodbye');
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle', {timeout: 10_000});
  await openChat(page);
  await page.clock.runFor(91_000);
  await expect(launcher(page)).toHaveAttribute('data-state', 'sleepy');
});

test('a reply: thinking before the first byte, speaking while it streams, writing a proposal while a block streams, presenting with cards, success on Add, insight after a plain answer', async ({page}) => {
  const tokens = 'Here you go.\n\n```zigoals-action\n[{"kind":"log-water","glasses":1}]\n```'.split(/(?<=\s)/);
  const srv = await slowServer(tokens, 1_500, 250);
  try {
    await seed(page, {baseUrl: srv.base});
    await page.goto('/app/health');
    await openChat(page);
    await observe(page);
    await send(page, 'Log a glass of water');
    await expect.poll(() => seen(page), {timeout: 20_000}).toContain('thinking');
    await expect.poll(() => seen(page), {timeout: 20_000}).toContain('speaking');
    await expect.poll(() => seen(page), {timeout: 20_000}).toContain('writing-proposal');
    await settled(page);
    await expect(launcher(page)).toHaveAttribute('data-state', 'presenting');
    await panel(page).locator('.ai-card').first().getByRole('button', {name: 'Add', exact: true}).click();
    await expect(launcher(page)).toHaveAttribute('data-state', 'success');
  } finally { await srv.close(); }
  await server(page, () => 'Your best reading day this month was a Sunday.');
  await page.evaluate(([key, base]) => { const s = JSON.parse(localStorage.getItem(key)!); s.baseUrl = base; localStorage.setItem(key, JSON.stringify(s)); window.dispatchEvent(new StorageEvent('storage', {key})); }, [AI_SETTINGS_KEY, BASE] as const);
  // Past the reaction gap (8 s after the presenting reaction), a plain answer shows insight.
  await page.clock.runFor(9_000);
  await send(page, 'How was my reading this month?'); await settled(page);
  await expect(launcher(page)).toHaveAttribute('data-state', 'insight');
});

test('the AI\'s hints: curious, confused, empathetic, encouraging, surprised; a failed request: error', async ({page}) => {
  const hints = ['curious', 'confused', 'empathetic', 'encouraging', 'surprised'] as const;
  const bodies = await server(page, (_body, n) => n <= hints.length ? `A short answer. ⟦zigi: ${hints[n - 1]}⟧` : {status: 500});
  await seed(page);
  await page.goto('/app');
  await openChat(page);
  for (const hint of hints) {
    await send(page, `Tell me something ${hint}`); await settled(page);
    await expect(launcher(page)).toHaveAttribute('data-state', hint);
    await expect(panel(page).locator('.ai-turn-assistant').last()).not.toContainText('⟦');
    await page.clock.runFor(9_000);
  }
  await send(page, 'And now fail');
  await expect(panel(page).getByRole('alert')).toBeVisible();
  await expect(launcher(page)).toHaveAttribute('data-state', 'error');
  expect(bodies.length).toBe(hints.length + 1);
});

test('offline at rest, then back: offline, then idle', async ({page, context}) => {
  await server(page, () => 'Hello.');
  await seed(page);
  await page.goto('/app');
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle');
  // The alive chunk (the machine on every page) loads once ZIGi is on screen and the browser is idle: its animated idle is the sign.
  await expect(launcher(page).locator('img').first()).toHaveAttribute('src', /anim/, {timeout: 15_000});
  await context.setOffline(true); await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(launcher(page)).toHaveAttribute('data-state', 'offline');
  await context.setOffline(false); await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle');
});

test('reading your data: a tool call in tools mode shows the reading state between the call and the answer', async ({page}) => {
  const toolChunk = (body: Record<string, unknown>) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', ...body})}\n\n`;
  const call = [toolChunk({choices: [{index: 0, delta: {tool_calls: [{index: 0, id: 'call_MOCK_0', type: 'function', function: {name: 'water', arguments: ''}}]}, finish_reason: null}]}), toolChunk({choices: [{index: 0, delta: {tool_calls: [{index: 0, function: {arguments: JSON.stringify({range: 'today'})}}]}, finish_reason: null}]}), toolChunk({choices: [{index: 0, delta: {}, finish_reason: 'tool_calls'}]}), 'data: [DONE]\n\n'].join('');
  let n = 0;
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { n++; if (n === 1) return route.fulfill({status: 200, contentType: 'text/event-stream', body: call}); await new Promise(r => setTimeout(r, 1_200)); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('Two glasses so far today.')}); }
    return route.fulfill({status: 404, body: ''});
  });
  await seed(page, {options: {toolMode: 'tools', visionDeclared: {}}});
  await page.goto('/app/health');
  await openChat(page);
  await observe(page);
  // An ask the device does not answer itself (advice-shaped), so the model is asked and calls the water tool.
  await send(page, 'Should I drink more water today, given my records?'); await settled(page);
  expect(await seen(page)).toContain('reading-your-data');
  expect(n).toBe(2);
});

test('ZIGi hidden with the edge tab: peek; ZIGi on but not set up: attention, and idle once a model is chosen', async ({page}) => {
  await server(page, () => 'Hello.');
  await seed(page);
  await page.goto('/app');
  await page.getByRole('button', {name: 'Hide ZIGi'}).click();
  await expect(page.locator('.ai-edge-tab .zigi-figure')).toHaveAttribute('data-state', 'peek');
  await page.getByRole('button', {name: 'Show ZIGi'}).click();
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle');
  await seed(page, {settings: {model: null as unknown as string, provider: 'local'}});
  await page.goto('/app');
  await expect(launcher(page)).toHaveAttribute('data-state', 'attention');
  await page.evaluate(key => { const s = JSON.parse(localStorage.getItem(key)!); s.model = 'mock-chat'; localStorage.setItem(key, JSON.stringify(s)); window.dispatchEvent(new StorageEvent('storage', {key})); }, AI_SETTINGS_KEY);
  await expect(launcher(page)).toHaveAttribute('data-state', 'idle');
});

test('the manifest\'s states are all accounted for: this file and the three it names cover the twenty-five', async () => {
  const here = ['idle', 'greeting', 'listening', 'wave-goodbye', 'sleepy', 'thinking', 'speaking', 'writing-proposal', 'presenting', 'success', 'insight', 'curious', 'confused', 'empathetic', 'encouraging', 'surprised', 'error', 'offline', 'reading-your-data', 'peek', 'attention'];
  const elsewhere = {celebrate: 'zigi-emotions.spec.ts', proud: 'zigi-emotions.spec.ts', reminder: 'zigi-knock.spec.ts', 'loading-model': 'zigi-stress.spec.ts'};
  const all = new Set([...here, ...Object.keys(elsewhere)]);
  for (const state of Object.keys(ZIGI_MANIFEST.states)) expect(all.has(state), state).toBe(true);
  expect(all.size).toBe(25);
});
