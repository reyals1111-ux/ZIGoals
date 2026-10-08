import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {CARE_LABEL, CARE_NOTES, carefulNote} from '../lib/ai/safety';
import {SAFETY_RULES} from '../lib/ai/context/specialists';

/**
 * Session V Part 11, careful mode through the real panel: a message that touches a sensitive health topic shows ZIGi's
 * supportive note under it (made on the device, every path: AI, no AI, the subscription bridge) and goes to the MOCK
 * provider with the careful-mode note; any other message goes with the general safety rules only.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
type Body = {messages: {role: string; content: unknown}[]};
async function server(page: Page) {
  const bodies: Body[] = [];
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { bodies.push(JSON.parse(route.request().postData() ?? '{}') as Body); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('MOCK: a careful reply.')}); }
    return route.fulfill({status: 404, body: ''});
  });
  return bodies;
}
async function seed(page: Page, settings: Partial<AiSettings> | null) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const ai = settings ? {[AI_SETTINGS_KEY]: JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, ...settings}), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'})} : {};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...ai});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
const systemOf = (body: Body) => String(body.messages[0]!.content);
/** The composer's own button (on phones Enter adds a line, by design). */
const send = (page: Page) => panel(page).locator('.ai-composer button[type=submit]').click();
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('with an AI: a risky message shows the note made on the device and goes in careful mode; others carry the general rules only', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {});
  await page.goto('/app/health');
  await openChat(page);
  const box = page.getByLabel('Message to your AI');
  // Phase 2 (P2.2b): a lookup, not a plan — a plan answered without a card gets the one repair round, a second request this count is not about.
  await box.fill('Tell me about a calm week, please.');
  await send(page);
  await expect.poll(() => bodies.length).toBe(1);
  expect(systemOf(bodies[0]!)).toContain(SAFETY_RULES); expect(systemOf(bodies[0]!)).not.toContain('Careful mode:');
  await expect(panel(page).getByRole('note', {name: CARE_LABEL})).toHaveCount(0);
  await box.fill('How can I lose 10 kg in 2 weeks?');
  await send(page);
  await expect.poll(() => bodies.length).toBe(2);
  expect(systemOf(bodies[1]!)).toContain(carefulNote('rapid-weight-loss'));
  const note = panel(page).getByRole('note', {name: CARE_LABEL});
  await expect(note).toHaveCount(1);
  await expect(note).toContainText(CARE_NOTES['rapid-weight-loss']);
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: a careful reply.');
  // Nothing about the note is stored with the chat: it is made again from the words wherever the message shows.
  const chats = await page.evaluate(() => new Promise<string>((resolve, reject) => { const open = indexedDB.open('zigoals-ai-chats-v1'); open.onerror = () => reject(open.error); open.onsuccess = () => { const all = open.result.transaction('chats', 'readonly').objectStore('chats').getAll(); all.onsuccess = () => { resolve(JSON.stringify(all.result)); open.result.close(); }; all.onerror = () => reject(all.error); }; }));
  expect(chats).toContain('How can I lose 10 kg in 2 weeks?');
  expect(chats).not.toContain(CARE_NOTES['rapid-weight-loss']); expect(chats).not.toContain('Careful mode');
  await page.reload();
  await openChat(page);
  await panel(page).getByRole('button', {name: 'Chat history'}).click();
  await panel(page).getByRole('button', {name: /^Tell me about a calm week/}).click();
  await expect(panel(page).getByRole('note', {name: CARE_LABEL})).toContainText(CARE_NOTES['rapid-weight-loss']);
});

test('with no AI the note still shows under the message, and nothing is sent anywhere', async ({page}) => {
  const bodies = await server(page);
  await seed(page, null);
  await page.goto('/app');
  await openChat(page);
  await page.getByLabel('Ask ZIGi about your records').fill('I want to eat 500 calories a day');
  await send(page);
  await expect(panel(page).getByRole('note', {name: CARE_LABEL})).toContainText(CARE_NOTES['very-low-intake']);
  expect(bodies).toEqual([]);
});

test('the subscription bridge: the note under the question, and careful mode in what is copied', async ({page}) => {
  await seed(page, {mode: 'subscription', provider: null, model: null, baseUrl: null, localServer: null, subscriptionApp: 'chatgpt'});
  await page.goto('/app');
  await openChat(page);
  await panel(page).getByLabel('Your question').fill("I'm doing a 72 hour fast, what should I log?");
  await expect(panel(page).getByRole('note', {name: CARE_LABEL})).toContainText(CARE_NOTES['extreme-fasting']);
  await panel(page).getByText('What will be copied').click();
  await expect(panel(page).locator('.ai-context-preview pre')).toContainText('Careful mode: ');
});
