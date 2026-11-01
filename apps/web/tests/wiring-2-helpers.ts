import {expect, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';

/**
 * Session AK, lane WB (WIRING_AUDIT_2.md's missing tests): shared steps of the tests/wiring-2-*.spec.ts files. Every reply
 * is a MOCK: the local OpenAI-compatible server on 127.0.0.1:1234 is answered by page.route (as tests/nova-chat.spec.ts
 * does), the app's own /api routes answer 503, and any other outside host is aborted, so nothing leaves the browser.
 * The records are fictional: the Showcase's records written as the person's own, plus what a test adds.
 */
export const LOCAL = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
export type Body = {messages: {role: string; content: unknown; tool_calls?: unknown[]; tool_call_id?: string}[]; tools?: {function: {name: string}}[]};
const chunk = (body: Record<string, unknown>) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', ...body})}\n\n`;
/** A streamed text answer, in several chunks. */
export const answer = (text: string) => [chunk({choices: [{index: 0, delta: {role: 'assistant', content: ''}, finish_reason: null}]}), ...(text.match(/.{1,16}/gs) ?? []).map(part => chunk({choices: [{index: 0, delta: {content: part}, finish_reason: null}]})), chunk({choices: [{index: 0, delta: {}, finish_reason: 'stop'}]}), 'data: [DONE]\n\n'].join('');
/** A streamed answer that asks ZIGoals to run read-only tools (OpenAI's tool_calls shape). */
export const toolCalls = (list: {name: string; args: Record<string, unknown>}[]) => [
  ...list.map((c, index) => chunk({choices: [{index: 0, delta: {tool_calls: [{index, id: `call_MOCK_${index}`, type: 'function', function: {name: c.name, arguments: ''}}]}, finish_reason: null}]})),
  ...list.map((c, index) => chunk({choices: [{index: 0, delta: {tool_calls: [{index, function: {arguments: JSON.stringify(c.args)}}]}, finish_reason: null}]})),
  chunk({choices: [{index: 0, delta: {}, finish_reason: 'tool_calls'}]}), 'data: [DONE]\n\n',
].join('');
/** Cards in the reply, as the person's AI writes them (one fenced block, one action or a list). */
export const cards = (value: unknown, words = 'Here you go.') => `${words}\n\n\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
/**
 * The MOCK local model: `/v1/models` names mock-chat, LM Studio's model list says it was trained for tools, and each chat
 * request gets `reply(body, n)` (n counts from 1), streamed as it is when it is already a stream (toolCalls, answer), else
 * as an answer. Returns every request body it saw.
 */
export async function mockModel(page: Page, reply: (body: Body, n: number) => string) {
  const seen: Body[] = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:3\d{3}\/)(?!127\.0\.0\.1:1234\/)(?!localhost:3\d{3}\/)/, route => route.abort());
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(`${LOCAL}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/api/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({models: [{type: 'llm', key: 'mock-chat', loaded_instances: [], capabilities: {vision: false, trained_for_tool_use: true}}]})});
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { const body = JSON.parse(route.request().postData() ?? '{}') as Body; seen.push(body); const out = reply(body, seen.length); return route.fulfill({status: 200, contentType: 'text/event-stream', body: out.startsWith('data: ') ? out : answer(out)}); }
    return route.fulfill({status: 404, body: ''});
  });
  return seen;
}
/** The local model as the person connected it (Health shared with ZIGi on this device). */
export const localModel = () => { const base = defaultAiSettings(); return {...base, enabled: true, mode: 'local' as const, provider: 'local' as const, model: 'mock-chat', localServer: 'openai-compatible' as const, baseUrl: LOCAL, includeHealth: true, pageShare: {...base.pageShare, health: true}}; };
/** A fixed evening; the Showcase's records as the person's own, the welcome and What's new seen, and `extra` on top. */
export async function seedDevice(page: Page, extra: Record<string, unknown> = {}, {model = true} = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const values: Record<string, string> = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...(model ? {[AI_SETTINGS_KEY]: JSON.stringify(localModel())} : {})};
  for (const [k, v] of Object.entries(extra)) values[k] = typeof v === 'string' ? v : JSON.stringify(v);
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
  await page.waitForLoadState('networkidle');
}
export const raw = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);
export const novaChat = (page: Page) => page.locator('section.nova-chat');
/** ⌘/Ctrl + J from any page: the command bar hands the words to NOVA, whose page opens with its chat. */
export async function askNova(page: Page, text: string) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+j' : 'Control+j');
  const bar = page.locator('dialog.nova-bar[open]');
  await expect(bar).toBeVisible();
  await bar.getByRole('textbox').fill(text);
  await bar.getByRole('textbox').press('Enter');
  await expect(page).toHaveURL(/\/app\/nova(\?|$)/);
  await expect(novaChat(page)).toBeVisible();
}
export const zigiPanel = (page: Page) => page.locator('dialog.ai-chat[open]');
