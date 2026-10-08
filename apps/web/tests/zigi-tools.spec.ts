import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY, AI_USAGE_KEY} from '../lib/ai/store/keys';
import {HABITS_KEY} from '../lib/habits';

/**
 * Session V Part 6 (native read-only tool calling, owner decision D1), through the real panel against a MOCK local
 * OpenAI-compatible server (LM Studio's metadata shape, read 2026-10-05): the person's AI asks for records, ZIGi runs the
 * tools in the browser and sends the results back; Health stays closed; "ZIGi looked at" shows what was sent; a model
 * that refuses tools gets the records attached instead; Attach mode, Think deeper and the usage meter with "ask first".
 * Every answer is a MOCK; nothing leaves the browser for a real provider.
 */
const BASE = 'http://127.0.0.1:1234';
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z', MONTH = '2026-09';
const chunk = (body: Record<string, unknown>) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', ...body})}\n\n`;
const answer = (text: string, usage = {prompt_tokens: 520, completion_tokens: 30}) => [chunk({choices: [{index: 0, delta: {role: 'assistant', content: text}, finish_reason: null}]}), chunk({choices: [{index: 0, delta: {}, finish_reason: 'stop'}], usage}), 'data: [DONE]\n\n'].join('');
const calls = (list: {name: string; args: Record<string, unknown>}[]) => [
  ...list.map((c, index) => chunk({choices: [{index: 0, delta: {tool_calls: [{index, id: `call_MOCK_${index}`, type: 'function', function: {name: c.name, arguments: ''}}]}, finish_reason: null}]})),
  ...list.map((c, index) => chunk({choices: [{index: 0, delta: {tool_calls: [{index, function: {arguments: JSON.stringify(c.args)}}]}, finish_reason: null}]})),
  chunk({choices: [{index: 0, delta: {}, finish_reason: 'tool_calls'}], usage: {prompt_tokens: 300, completion_tokens: 40}}), 'data: [DONE]\n\n',
].join('');
type Body = {model: string; tools?: {function: {name: string}}[]; messages: {role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string}[]};
/** A MOCK LM Studio: its model list says whether the model was trained for tools; chat answers come from `reply`. */
async function server(page: Page, reply: (body: Body, n: number) => {status?: number; body: string}, tools: boolean | null = true) {
  const bodies: Body[] = [];
  const handler = async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/api/v1/models')) return tools === null ? route.fulfill({status: 404, body: ''}) : route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({models: [{type: 'llm', key: 'mock-chat', loaded_instances: [], capabilities: {vision: false, trained_for_tool_use: tools}}]})});
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}, {id: 'mock-deep'}]})});
    if (url.endsWith('/v1/chat/completions')) {
      const body = JSON.parse(route.request().postData() ?? '{}') as Body; bodies.push(body);
      const out = reply(body, bodies.length);
      return route.fulfill({status: out.status ?? 200, contentType: out.status ? 'application/json' : 'text/event-stream', body: out.body});
    }
    return route.fulfill({status: 404, body: ''});
  };
  await page.route(`${BASE}/**`, handler);
  return bodies;
}
async function seed(page: Page, extra: Record<string, string> = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const settings = {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(settings), ...extra});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
async function ask(page: Page, text: string) { await page.getByLabel('Message to your AI').fill(text); await page.getByRole('button', {name: 'Send', exact: true}).click(); }
const stored = (page: Page, key: string) => page.evaluate(k => { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v) as Record<string, unknown>; }, key);
const meditationMinutes = () => { const habits = JSON.parse(buildShowcase(DAY).records[HABITS_KEY]!) as {habits: {title: string; entries: {date: string; count: number; disposition: string}[]}[]}; return habits.habits.find(h => h.title === 'Meditate')!.entries.filter(e => e.date >= '2026-09-01' && e.date <= DAY && e.disposition === 'logged').reduce((s, e) => s + e.count, 0); };
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('the AI asks for records: ZIGi runs the tools here and sends the results back; Health stays closed; "ZIGi looked at" shows exactly what went', async ({page}) => {
  const bodies = await server(page, (_, n) => ({body: n === 1 ? calls([{name: 'habit_stats', args: {habit: 'Meditate', range: 'this month', metric: 'minutes'}}, {name: 'water', args: {range: 'today'}}]) : answer('MOCK: ten minutes after lunch would fit your week.')}));
  await seed(page);
  await page.goto('/app/health');
  await openChat(page);
  await expect(panel(page).locator('.ai-data-mode')).toHaveText(/^Your AI asks ZIGi for the records it needs \(tools\); each lookup is shown under the answer\. The tool list adds about [\d,]+00 tokens to each request\.$/);
  // Phase 2 (P2.2b): a lookup, not a plan — a plan answered without a card gets the one repair round, a request these counts are not about.
  await ask(page, 'Tell me about my week');
  const reply = panel(page).locator('.ai-turn-assistant').last();
  await expect(reply).toContainText('MOCK: ten minutes after lunch would fit your week.');
  expect(bodies).toHaveLength(2);
  // Offered: the read tools this page's switches allow; no Health tool while Health is not shared.
  const offered = bodies[0]!.tools!.map(t => t.function.name);
  expect(offered).toEqual(expect.arrayContaining(['habit_stats', 'list_habits', 'list_goals', 'holdings', 'today_summary']));
  // Session W Part 21: the new Health tools (sleep, mindful minutes, vitals, devices) stay out the same way.
  for (const health of ['water', 'steps', 'weight', 'diary_entries', 'nutrient_totals', 'fasting', 'counters', 'search_foods', 'sleep_nights', 'sleep_summary', 'meditation_sessions', 'meditation_summary', 'vitals', 'devices']) expect(offered).not.toContain(health);
  expect(bodies[0]!.messages[0]!.content).toContain('You may also call the read-only tools ZIGoals provides');
  // The second request: the AI's calls, then one result per call, the Health one refused without reading.
  const second = bodies[1]!.messages, assistant = second.find(m => m.role === 'assistant' && m.tool_calls)!;
  expect(assistant.tool_calls).toHaveLength(2);
  const results = second.filter(m => m.role === 'tool');
  expect(results.map(m => m.tool_call_id)).toEqual(['call_MOCK_0', 'call_MOCK_1']);
  expect(results[0]!.content).toContain('"tool":"habit_stats"'); expect(results[0]!.content).toContain(`"valueText":"${meditationMinutes()} minutes"`);
  expect(results[1]!.content).toContain('Health isn’t shared with ZIGi');
  expect(JSON.stringify(bodies)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  // What the reply shows: the lookups as chips, and the exact text sent for each.
  const looked = reply.getByRole('group', {name: 'ZIGi looked at'});
  await expect(looked).toContainText('Meditate · this month'); await expect(looked).toContainText('Water (not shared)');
  await looked.getByText('What ZIGi sent to your AI').click();
  await expect(looked.locator('pre').first()).toHaveText(results[0]!.content!);
  await expect(looked.locator('pre').nth(1)).toHaveText(results[1]!.content!);
  // Usage: both requests counted with the provider's own figures.
  await expect.poll(() => stored(page, AI_USAGE_KEY)).toMatchObject({version: 1, months: {[MONTH]: {local: {input: 820, output: 70, requests: 2}}}});
  // After a reload the chat keeps what was looked at (never the results), and makes them again under today's gate.
  await page.reload();
  await openChat(page);
  await panel(page).getByRole('button', {name: 'Chat history'}).click();
  await panel(page).getByRole('button', {name: /Tell me about my week/}).click();
  const kept = panel(page).locator('.ai-turn-assistant').last().getByRole('group', {name: 'ZIGi looked at'});
  await expect(kept).toContainText('Meditate · this month');
  await kept.getByText('What ZIGi sent to your AI').click();
  await expect(kept).toContainText('Made again now from the records on this device, under your current settings');
  await expect(kept.locator('pre').first()).toContainText(`"valueText":"${meditationMinutes()} minutes"`);
});

test('a model that refuses tools: the same message again with the records attached, and that model stays on Attach for the session', async ({page}) => {
  const bodies = await server(page, body => body.tools ? {status: 400, body: JSON.stringify({error: {message: 'MOCK: tools are not supported by this model', type: 'invalid_request_error'}})} : {body: answer('MOCK: here is a plan.')}, null);
  await seed(page);
  await page.goto('/app/habits');
  await openChat(page);
  await ask(page, 'Tell me about my week');
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: here is a plan.');
  expect(bodies.map(b => !!b.tools)).toEqual([true, false]);
  await expect(panel(page).locator('.ai-data-mode')).toHaveText('Your model did not take ZIGi\'s tools, so the records chosen from your question are attached instead.');
  await ask(page, 'And next week?');
  await expect(panel(page).locator('.ai-turn-assistant')).toHaveCount(2);
  expect(bodies.map(b => !!b.tools)).toEqual([true, false, false]);
  await expect(panel(page).getByRole('alert')).toHaveCount(0);
  // The refused request cost nothing and is not counted.
  await expect.poll(() => stored(page, AI_USAGE_KEY)).toMatchObject({months: {[MONTH]: {local: {requests: 2}}}});
});

test('Attach mode, Think deeper with the deep model, and "ask me first" once the monthly cap is reached', async ({page}) => {
  const bodies = await server(page, body => ({body: answer(`MOCK from ${body.model}`)}));
  await seed(page, {
    [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach', deepModel: {local: 'mock-deep'}}),
    [AI_USAGE_KEY]: JSON.stringify({version: 1, months: {[MONTH]: {local: {input: 1000, output: 0, requests: 1}}}, prices: {local: {input: '1000', currency: 'USD'}}, softCap: {amount: '0.5', currency: 'USD'}, askFirst: true}),
  });
  await page.goto('/app/habits');
  await openChat(page);
  await expect(panel(page).locator('.ai-data-mode')).toHaveText('The records chosen from your question are attached to your message.');
  await ask(page, 'Tell me about my week');
  const check = panel(page).getByRole('group', {name: 'Your monthly cap is reached'});
  await expect(check).toContainText('You have reached your monthly cap: 1.00 USD of your 0.50 USD monthly cap, estimated from your prices.');
  await check.getByRole('button', {name: 'Not now'}).click();
  await expect(check).toHaveCount(0); expect(bodies).toHaveLength(0);
  await ask(page, 'Tell me about my week');
  await panel(page).getByRole('group', {name: 'Your monthly cap is reached'}).getByRole('button', {name: 'Send anyway'}).click();
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK from mock-chat');
  expect(bodies).toHaveLength(1); expect(bodies[0]!.tools).toBeUndefined();
  expect(bodies[0]!.messages[0]!.content).not.toContain('You may also call the read-only tools');
  // Think deeper: the same question with the deep model.
  await panel(page).getByRole('button', {name: 'Think deeper'}).click();
  await panel(page).getByRole('group', {name: 'Your monthly cap is reached'}).getByRole('button', {name: 'Send anyway'}).click();
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK from mock-deep');
  expect(bodies).toHaveLength(2); expect(bodies[1]!.model).toBe('mock-deep');
  expect(bodies[1]!.messages.filter(m => m.role === 'user').map(m => m.content)).toEqual(['Tell me about my week']);
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('Thought deeper with mock-deep');
  await expect(panel(page).getByRole('button', {name: 'Think deeper'})).toHaveCount(0);
});

test('Settings: the data mode, the deep model, prices and the cap are device choices; the counts show per route', async ({page}) => {
  await server(page, () => ({body: answer('MOCK')}));
  await seed(page, {[AI_USAGE_KEY]: JSON.stringify({version: 1, months: {[MONTH]: {local: {input: 12_345, output: 678, requests: 9, unreported: 2}}}})});
  await page.goto('/app/settings#your-ai');
  const section = page.locator('#your-ai');
  const mode = section.getByRole('combobox', {name: 'Data for each message'});
  await expect(mode).toHaveValue('auto');
  await mode.selectOption('tools');
  expect(await stored(page, AI_OPTIONS_KEY)).toEqual({version: 1, toolMode: 'tools'});
  await section.getByRole('button', {name: 'Choose a deep model'}).click();
  await section.getByRole('listbox', {name: 'Deep model'}).getByRole('option', {name: /mock-deep/}).click();
  expect(await stored(page, AI_OPTIONS_KEY)).toEqual({version: 1, toolMode: 'tools', deepModel: {local: 'mock-deep'}});
  await expect(section).toContainText('Chosen: mock-deep.');
  const table = section.locator('.ai-usage-table');
  await expect(table).toContainText('A local model'); await expect(table).toContainText('9 (2 without counts)'); await expect(table).toContainText('12,345'); await expect(table).toContainText('678');
  await section.getByLabel('Per million tokens in').fill('0.5'); await section.getByLabel('Per million tokens in').blur();
  await expect.poll(() => stored(page, AI_USAGE_KEY)).toMatchObject({prices: {local: {input: '0.5', currency: 'USD'}}});
  await section.getByLabel('Amount').fill('5'); await section.getByLabel('Amount').blur();
  await expect.poll(() => stored(page, AI_USAGE_KEY)).toMatchObject({softCap: {amount: '5', currency: 'USD'}});
  await section.getByRole('checkbox', {name: /Ask me before sending/}).check();
  await expect.poll(() => stored(page, AI_USAGE_KEY)).toMatchObject({askFirst: true});
  await expect(section).toContainText('Estimate from your prices: under 0.01 USD');
  await section.getByRole('button', {name: 'Clear the counts on this device'}).click();
  await expect.poll(() => stored(page, AI_USAGE_KEY)).toMatchObject({months: {}, prices: {local: {input: '0.5'}}, softCap: {amount: '5'}, askFirst: true});
  // Nothing of this is in ZIGi's T settings record.
  expect(JSON.stringify(await stored(page, AI_SETTINGS_KEY))).not.toMatch(/toolMode|deepModel|softCap/);
});
