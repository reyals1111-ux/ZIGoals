import {createServer, type Server} from 'node:http';
import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {REPAIR_NOTE, REPAIR_PROMPT} from '../lib/ai/actions/repair';
import {AI_CHATS_DATABASE} from '../lib/ai/chats';

/**
 * Session X-Local Part 5c, robustness on the wire, through the real panel: a reply whose only block is almost-JSON
 * still becomes a card; in log mode, a reply whose blocks were all refused is asked for once more, automatically and
 * labelled; a provider that goes quiet mid-reply is cut off by the watchdog with the partial reply kept, honest steps
 * and "Ask ZIGi to continue"; Stop keeps the partial reply and the question can be asked again. Every answer is a MOCK.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
type Body = {messages: {role: string; content: unknown}[]};
async function server(page: Page, replies: readonly ((body: Body, n: number) => string)[]) {
  const bodies: Body[] = [];
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { const body = JSON.parse(route.request().postData() ?? '{}') as Body; bodies.push(body); const reply = replies[Math.min(bodies.length - 1, replies.length - 1)]!; return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply(body, bodies.length))}); }
    return route.fulfill({status: 404, body: ''});
  });
  return bodies;
}
async function seed(page: Page, baseUrl = BASE) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const ai = {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl, includeHealth: true, pageShare: {...base.pageShare, health: true}};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'})});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
const systemOf = (body: Body) => String(body.messages[0]!.content);
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('almost-JSON from the model (single quotes, a trailing comma, a quoted number, a comment) still becomes the card it meant', async ({page}) => {
  await server(page, [() => "Water, then.\n\n```zigoals-action\n{kind: 'log-water', millilitres: '300', /* a glass and a bit */}\n```"]);
  await seed(page);
  await page.goto('/app/health');
  await openChat(page);
  await page.getByLabel('Message to your AI').fill('Drank 300 ml');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  const card = panel(page).locator('.ai-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Add water'); await expect(card).toContainText('300 mL');
  await expect(panel(page).locator('.ai-proposals-rejected')).toHaveCount(0);
});

test('log mode: when every block was refused, ZIGi asks once more, labels the retry, and the second answer\'s cards show', async ({page}) => {
  const bodies = await server(page, [
    () => 'Logged!\n\n```zigoals-action\n{"kind":"log-water","millilitres":"a lot"}\n```',
    () => 'Here they are.\n\n```zigoals-action\n{"kind":"log-water","millilitres":300}\n```',
    () => 'Done.',
  ]);
  await seed(page);
  await page.goto('/app/health');
  await openChat(page);
  await panel(page).getByRole('button', {name: 'Log mode'}).click();
  await page.getByLabel('Message to your AI').fill('a lot of water');
  await panel(page).getByRole('button', {name: 'Log', exact: true}).click();
  const card = panel(page).locator('.ai-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Add water');
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('ZIGi asked your AI once more for valid cards (one automatic retry).');
  expect(bodies).toHaveLength(2);
  // The retry carried the first answer as the assistant's turn and the ask as the person's; the chat stored neither.
  const retry = bodies[1]!.messages;
  expect(retry.at(-2)).toMatchObject({role: 'assistant'}); expect(String(retry.at(-2)!.content)).toContain('"a lot"');
  expect(retry.at(-1)).toMatchObject({role: 'user'}); expect(String(retry.at(-1)!.content)).toContain(REPAIR_PROMPT.slice(0, 40));
  expect(systemOf(bodies[1]!)).toContain('The person is logging what they did');
  const turns = await page.evaluate(name => new Promise<string>((resolve, reject) => { const open = indexedDB.open(name); open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, store = db.objectStoreNames[0]!, all = db.transaction(store).objectStore(store).getAll(); all.onsuccess = () => { resolve(JSON.stringify(all.result)); db.close(); }; all.onerror = () => reject(all.error); }; }), AI_CHATS_DATABASE);
  expect(turns).toContain(REPAIR_NOTE.replace(/_/g, '')); expect(turns).not.toContain('could not be used. Send the same proposals again');
  // A second message is a normal one: no retry when nothing was refused.
  await page.getByLabel('Message to your AI').fill('thanks');
  await panel(page).getByRole('button', {name: 'Log', exact: true}).click();
  await expect.poll(() => bodies.length).toBe(3);
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('Done.');
});

test('a provider that goes quiet: the watchdog ends the read after 60 s, keeps what arrived, says why, and offers to continue', async ({page}) => {
  // A real local server (the route API cannot hold a stream open): one chunk, then silence until the page gives up.
  const sockets = new Set<import('node:net').Socket>();
  const quiet: Server = createServer((req, res) => {
    const cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'};
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    if (req.url?.endsWith('/v1/models')) { res.writeHead(200, {...cors, 'Content-Type': 'application/json'}); res.end(JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})); return; }
    res.writeHead(200, {...cors, 'Content-Type': 'text/event-stream'});
    res.write(chunk({role: 'assistant', content: 'The first half of the answer arrived'}));
    sockets.add(res.socket!);
  });
  await new Promise<void>(resolve => quiet.listen(0, '127.0.0.1', resolve));
  const port = (quiet.address() as {port: number}).port;
  try {
    await seed(page, `http://127.0.0.1:${port}`);
    await page.goto('/app');
    await openChat(page);
    await page.getByLabel('Message to your AI').fill('Tell me about my week');
    await page.getByRole('button', {name: 'Send', exact: true}).click();
    await expect(panel(page).locator('.ai-turn-live')).toContainText('The first half of the answer arrived');
    await page.clock.runFor(61_000);
    const failure = panel(page).getByRole('alert');
    await expect(failure).toContainText('Your AI sent nothing for 60 seconds, so ZIGi stopped waiting.');
    await expect(failure).toContainText('What arrived is kept above; ask ZIGi to continue, or send again.');
    await expect(failure).toContainText('A local model that stops mid-reply is often out of memory or swapping');
    const reply = panel(page).locator('.ai-turn-assistant').last();
    await expect(reply).toContainText('The first half of the answer arrived');
    await expect(reply.locator('.ai-turn-stopped')).toContainText('Interrupted: Your AI sent nothing for 60 seconds');
    await expect(failure.getByRole('button', {name: 'Ask ZIGi to continue'})).toBeVisible();
    await failure.getByRole('button', {name: 'Ask ZIGi to continue'}).click();
    await expect(panel(page).locator('.ai-turn-user').last()).toContainText('Continue from where you stopped.');
    await expect(panel(page).locator('.ai-turn-live')).toContainText('The first half of the answer arrived');
  } finally {
    for (const s of sockets) s.destroy();
    await new Promise<void>(resolve => quiet.close(() => resolve()));
  }
});

test('Stop keeps the partial reply, and the question can be asked again', async ({page}) => {
  const sockets = new Set<import('node:net').Socket>();
  const slow: Server = createServer((req, res) => {
    const cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'};
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    if (req.url?.endsWith('/v1/models')) { res.writeHead(200, {...cors, 'Content-Type': 'application/json'}); res.end(JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})); return; }
    res.writeHead(200, {...cors, 'Content-Type': 'text/event-stream'});
    res.write(chunk({role: 'assistant', content: 'Part one of a long answer'}));
    sockets.add(res.socket!);
  });
  await new Promise<void>(resolve => slow.listen(0, '127.0.0.1', resolve));
  const port = (slow.address() as {port: number}).port;
  try {
    await seed(page, `http://127.0.0.1:${port}`);
    await page.goto('/app');
    await openChat(page);
    await page.getByLabel('Message to your AI').fill('A long question');
    await page.getByRole('button', {name: 'Send', exact: true}).click();
    await expect(panel(page).locator('.ai-turn-live')).toContainText('Part one of a long answer');
    await panel(page).getByRole('button', {name: 'Stop', exact: true}).click();
    const reply = panel(page).locator('.ai-turn-assistant').last();
    await expect(reply).toContainText('Part one of a long answer');
    await expect(reply.locator('.ai-turn-stopped')).toHaveText('Stopped');
    await expect(panel(page).getByRole('alert')).toHaveCount(0);
    await panel(page).getByRole('button', {name: /Regenerate|Ask again/}).first().click();
    await expect(panel(page).locator('.ai-turn-live')).toContainText('Part one of a long answer');
  } finally {
    for (const s of sockets) s.destroy();
    await new Promise<void>(resolve => slow.close(() => resolve()));
  }
});
