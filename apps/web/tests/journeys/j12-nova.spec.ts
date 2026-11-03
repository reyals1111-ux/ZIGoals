import {test, type Page, type Route} from '@playwright/test';
import {at, desktopOnly, expect, hydrated, offlineApis, seedRecords, stored, strayRequests, ZONE} from './journey-helpers';
import {createHabit, emptyHabitData, HABITS_KEY} from '../../lib/habits';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../../lib/ai/settings';
import {NOVA_SETUP_KEY} from '../../lib/nova/setup';
import {TASKS_KEY} from '../../lib/tasks/schema';

/**
 * Session AK, lane WB (WIRING_AUDIT_2.md N10 + N11): journey 12, NOVA from a fresh start. A person who has one habit and
 * once shared Health with ZIGi on this device opens NOVA for the first time, lights the first planets of "Build your own
 * NOVA" (Meet NOVA, Strict privacy, a model on this computer), asks questions NOVA answers on the device, connects a
 * MOCK local brain (LM Studio's address, answered by page.route) through the guide's own connect form and gets its
 * streamed answer, confirms a task card and takes it back with Undo, connects a MOCK Hermes Agent gateway (/health,
 * /v1/models, a streamed reply) and makes it NOVA's brain, and finally opens Health to NOVA in Permissions and closes it
 * again: closed, NOVA reads nothing from Health. Fictional records; no request leaves for a real host.
 */
test.use({actionTimeout: 20_000, timezoneId: ZONE});
desktopOnly();
const LMSTUDIO = 'http://localhost:1234', LMSTUDIO_IP = 'http://127.0.0.1:1234', HERMES = 'http://127.0.0.1:8642', KEY = 'cd'.repeat(32);
const HABIT = 'aaaaaaaa-0000-4000-8000-0000000000c2';
type Body = {messages: {role: string; content: unknown}[]};
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: ''}), ...(text.match(/.{1,14}/gs) ?? []).map(part => chunk({content: part})), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const lastUser = (body: Body) => String([...body.messages].reverse().find(m => m.role === 'user')?.content ?? '');

/** The MOCK brain on LM Studio's address: a model list, and an answer per question (a task card when asked for one). */
async function mockBrain(page: Page) {
  const seen: Body[] = [];
  const handler = (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) {
      const body = JSON.parse(route.request().postData() ?? '{}') as Body; seen.push(body);
      const reply = lastUser(body).includes('library') ? 'One card for you to confirm.\n\n```zigoals-action\n{"kind":"add-task","title":"Fictional call to the library","due":"tomorrow"}\n```' : 'MOCK brain: your evening looks calm; Fictional stretch is still open.';
      return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply)});
    }
    return route.fulfill({status: 404, body: ''});
  };
  await page.route(`${LMSTUDIO}/**`, handler);
  await page.route(`${LMSTUDIO_IP}/**`, handler);
  // The other places the guide's scan looks (Ollama, llama.cpp, the old llama.cpp port): nothing runs there.
  for (const base of ['http://127.0.0.1:11434', 'http://localhost:11434', 'http://127.0.0.1:9931', 'http://localhost:9931', 'http://127.0.0.1:8080', 'http://localhost:8080']) await page.route(`${base}/**`, route => route.abort('connectionrefused'));
  return seen;
}
/** The MOCK Hermes Agent gateway (docs/research/session-ak/HERMES_AGENT.md shapes): /health, /v1/models, SSE with a keepalive. */
async function mockHermes(page: Page) {
  const seen: {url: string; auth?: string; body: string | null}[] = [];
  await page.route(`${HERMES}/**`, (route: Route) => {
    const request = route.request(), url = request.url(), auth = request.headers().authorization;
    seen.push({url, auth, body: request.postData()});
    if (url.endsWith('/health')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({status: 'ok', platform: 'hermes-agent', version: '0.22.5'})});
    if (auth !== `Bearer ${KEY}`) return route.fulfill({status: 401, contentType: 'application/json', body: JSON.stringify({error: {message: 'Invalid gateway API key (API_SERVER_KEY)', type: 'gateway_auth_error', code: 'gateway_auth_failed'}})});
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'hermes-agent', object: 'model', owned_by: 'hermes'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: [chunk({role: 'assistant'}), ': keepalive\n\n', chunk({content: 'MOCK Hermes: Monday, review goals. '}), chunk({content: 'Wednesday, a savings check.'}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('')});
    return route.fulfill({status: 404, body: ''});
  });
  return seen;
}
const chat = (page: Page) => page.locator('section.nova-chat');
const replies = (page: Page) => chat(page).locator('.nova-turn-assistant');
/** A message to NOVA: the command field opens the chat; once open, its own box. Returns the new answer. */
async function ask(page: Page, text: string) {
  const open = await chat(page).isVisible();
  const before = open ? await replies(page).count() : 0;
  const box = open ? chat(page).getByRole('textbox', {name: /^Message /}) : page.getByRole('textbox', {name: 'Message NOVA'}).first();
  await expect(async () => { await box.fill(text); await expect(box).toHaveValue(text, {timeout: 1_000}); }).toPass({timeout: 15_000});
  await box.press('Enter');
  await expect(replies(page)).toHaveCount(before + 1, {timeout: 20_000});
  return replies(page).last();
}
const planet = (page: Page, label: string) => page.getByRole('button', {name: new RegExp(`^${label}:`)}).first();
async function openPlanet(page: Page, label: string, id: string) {
  const panel = page.locator(`[data-setup-panel="${id}"]`);
  if (!await panel.isVisible()) await planet(page, label).click();
  await expect(panel).toBeVisible();
  return panel;
}

test('@journey 12 NOVA: first planets, on-device answers, a MOCK local brain, a card with Undo, Hermes, and Permissions closing Health', async ({page}) => {
  test.setTimeout(240_000);
  const stray = strayRequests(page);
  await page.route(/^https?:\/\/(?!127\.0\.0\.1[:/])(?!localhost[:/])/, route => route.abort());
  await page.clock.install({time: at('2026-11-02', '19:00')});
  await offlineApis(page);
  const brain = await mockBrain(page);
  const hermes = await mockHermes(page);
  const base = defaultAiSettings();
  await seedRecords(page, {
    [HABITS_KEY]: createHabit(emptyHabitData(), {title: 'Fictional stretch', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-20T08:00:00Z'), HABIT),
    // Earlier, on this device, the person shared Health with ZIGi (no model connected yet).
    [AI_SETTINGS_KEY]: {...base, includeHealth: true, pageShare: {...base.pageShare, health: true}},
  }, {settings: 'habits-health'});

  // A fresh NOVA: the opening plays once (any key finishes it) and the page teaches where to start.
  await page.goto('/app'); await hydrated(page);
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'NOVA', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/nova$/);
  await page.keyboard.press('Shift');
  await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done');
  await page.locator('a[href="/app/nova/setup"]', {hasText: 'Start the guide'}).first().click();
  await expect(page.getByRole('heading', {name: 'Build your own NOVA', level: 1})).toBeVisible();
  await expect(page.getByText('0 of 10 planets lit')).toBeVisible();

  // Planets 1 and 2: Meet NOVA, then Strict privacy (a NOVA with no cloud model starts Strict).
  const meet = await openPlanet(page, 'Meet NOVA', 'meet');
  await meet.getByRole('button', {name: /I understand/}).click();
  await expect(meet.getByRole('status').filter({hasText: 'Checked: it works.'})).toBeVisible();
  const privacy = await openPlanet(page, 'Privacy mode', 'privacy');
  await privacy.getByRole('button', {name: /Check the mode holds/}).click();
  await expect(privacy.getByText(/Strict is on\./)).toBeVisible();
  expect((await stored<{privacyMode: string}>(page, NOVA_SETUP_KEY))?.privacyMode).toBe('strict');
  await expect(page.getByText('2 of 10 planets lit')).toBeVisible();

  // Before any brain: NOVA answers from the records on this device, and says so.
  await page.goto('/app/nova'); await hydrated(page);
  let reply = await ask(page, 'What is due today?');
  await expect(reply).toContainText('Today (');
  await expect(reply).toContainText('Fictional stretch');
  await expect(reply.locator('.ai-turn-source')).toContainText('On-device answers · no AI used');
  reply = await ask(page, 'How many habits do I have?');
  await expect(reply.locator('.ai-turn-source')).toContainText('On-device answers · no AI used');
  expect(brain).toHaveLength(0);

  // Planet 3: a model on this computer. The guide finds the MOCK LM Studio and connects it through its own form.
  await page.goto('/app/nova/setup'); await hydrated(page);
  const brainPlanet = await openPlanet(page, 'Your brain, local first', 'brain');
  await brainPlanet.getByRole('button', {name: 'A model on this computer (recommended)'}).click();
  await brainPlanet.getByRole('button', {name: 'Find models on this computer'}).click();
  await expect(brainPlanet.locator('.nova-scan')).toContainText('LM Studio: 1 model (mock-chat)');
  const connect = brainPlanet.getByRole('region', {name: 'Connect'});
  await connect.getByRole('button', {name: /I run a model on this computer/}).click();
  await connect.getByRole('group', {name: 'Server presets'}).getByRole('button', {name: 'LM Studio (1234)'}).click();
  await connect.getByRole('button', {name: 'Test connection'}).click();
  await connect.getByRole('option', {name: /^mock-chat( Suggested)?$/}) /* Session AK P4 (FR, deliberate): the suggested model carries a "Suggested" tag */.click();
  await connect.getByRole('button', {name: 'Connect', exact: true}).click();
  await expect.poll(async () => (await stored<{enabled: boolean; provider: string; model: string}>(page, AI_SETTINGS_KEY))?.model).toBe('mock-chat');
  await brainPlanet.getByRole('button', {name: /Test the connection/}).click();
  await expect(brainPlanet.getByText(/Found mock-chat/)).toBeVisible();
  await expect(page.getByText('3 of 10 planets lit')).toBeVisible();

  // The MOCK local brain answers a question the device cannot, streamed and named.
  await page.goto('/app/nova'); await hydrated(page);
  reply = await ask(page, 'Write me one calm sentence for this evening.');
  await expect(reply).toContainText('MOCK brain: your evening looks calm', {timeout: 20_000});
  await expect(reply.locator('.ai-turn-source')).toContainText('From your AI');
  expect(brain.length).toBeGreaterThan(0);

  // A card: nothing is written before the tap; Undo takes the task off again.
  reply = await ask(page, 'Fictional: remind me to call the library tomorrow, as a task.');
  const card = reply.locator('.ai-card').filter({hasText: 'Task: Fictional call to the library'});
  await expect(card).toBeVisible({timeout: 20_000});
  const tasksBefore = await stored(page, TASKS_KEY);
  await expect(card).toHaveClass(/ai-card-proposed/);
  expect(await stored(page, TASKS_KEY)).toEqual(tasksBefore);
  await card.getByRole('button', {name: 'Add the task', exact: true}).click();
  await expect(card).toHaveClass(/ai-card-added/);
  await expect.poll(async () => (await stored<{tasks: {title: string; due?: string}[]}>(page, TASKS_KEY))?.tasks.find(t => t.title === 'Fictional call to the library')?.due).toBe('2026-11-03');
  await reply.getByRole('button', {name: /^Undo/}).click();
  await expect(card).toHaveClass(/ai-card-undone/);
  await expect.poll(async () => (await stored<{tasks: {title: string}[]}>(page, TASKS_KEY))?.tasks.some(t => t.title === 'Fictional call to the library') ?? false).toBe(false);

  // Hermes Agent: the gateway answers /health and /v1/models with the person's key; it becomes NOVA's brain.
  await page.goto('/app/nova/hermes'); await hydrated(page);
  await expect(page.getByRole('heading', {name: 'Connect your Hermes Agent', level: 1})).toBeVisible();
  const hermesPanel = page.locator('[data-hermes-panel="connect"]');
  if (!await hermesPanel.isVisible()) await page.getByRole('button', {name: /^Connect it in ZIGoals:/}).first().click();
  await hermesPanel.getByLabel('API_SERVER_KEY').fill(KEY);
  // Kept sealed on this device, so the key outlives a reload (otherwise the page forgets it on reload, as it says).
  await hermesPanel.getByRole('checkbox', {name: /Remember the key on this device/}).check();
  await hermesPanel.getByRole('button', {name: /Test \/health and \/v1\/models|Check again/}).click();
  await expect(hermesPanel.getByText(/Hermes 0\.22\.5 is reachable on this computer: hermes-agent answered in \d+ ms\./)).toBeVisible();
  expect(hermes.some(s => s.url.endsWith('/health'))).toBe(true);
  expect(hermes.some(s => s.url.endsWith('/v1/models') && s.auth === `Bearer ${KEY}`)).toBe(true);
  await hermesPanel.getByRole('button', {name: 'Use Hermes as NOVA’s brain'}).click();
  await expect(hermesPanel.getByText('NOVA and ZIGi now answer with your Hermes (hermes-agent).')).toBeVisible();
  // NOVA's next answer streams from Hermes.
  await page.goto('/app/nova'); await hydrated(page);
  reply = await ask(page, 'Write me a calm plan for my week.');
  await expect(reply).toContainText('MOCK Hermes: Monday, review goals. Wednesday, a savings check.', {timeout: 20_000});
  const sent = hermes.filter(s => s.url.endsWith('/v1/chat/completions'));
  expect(sent.length).toBeGreaterThan(0);
  expect(sent.at(-1)!.auth).toBe(`Bearer ${KEY}`);
  // Hermes is never trusted with tools it might run on the computer: NOVA sends it no tool list.
  expect(JSON.parse(sent.at(-1)!.body!).tools).toBeUndefined();

  // Permissions: Health is off for NOVA by default; opened, NOVA reads Health; closed again, it reads nothing from Health.
  reply = await ask(page, 'How did I sleep?');
  await expect(reply).toContainText('Health is off for NOVA, so nothing from Health is read here.');
  await reply.getByRole('button', {name: 'Open NOVA → Permissions'}).click();
  const panels = page.getByRole('dialog', {name: 'NOVA’s panels'});
  const health = panels.getByRole('switch', {name: /^Health: food/});
  await health.click();
  await expect(health).toHaveAttribute('aria-checked', 'true');
  await panels.getByRole('button', {name: 'Close NOVA’s panels'}).click();
  reply = await ask(page, 'How did I sleep?');
  await expect(reply).not.toContainText('Health is off for NOVA');
  await expect(reply.locator('.ai-turn-source')).toContainText('On-device answers');
  await page.locator('a.nova-chip[data-kind="scopes"]').click();
  await expect(panels).toBeVisible();
  await panels.getByRole('switch', {name: /^Health: food/}).click();
  await expect(panels.getByRole('switch', {name: /^Health: food/})).toHaveAttribute('aria-checked', 'false');
  await panels.getByRole('button', {name: 'Close NOVA’s panels'}).click();
  reply = await ask(page, 'How did I sleep?');
  await expect(reply).toContainText('Health is off for NOVA, so nothing from Health is read here.');
  expect((await stored<{scopes?: {health?: boolean}}>(page, NOVA_SETUP_KEY))?.scopes?.health).toBe(false);

  expect(stray).toEqual([]);
});
