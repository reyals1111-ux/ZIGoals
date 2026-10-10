import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {createHabit, habitDataSchema, HABITS_KEY, type HabitData} from '../lib/habits';

/**
 * Session V Part 3: local answers, "Answered on your device · no AI used". Lookups are answered from the records on
 * this device before setup, with no provider, and with one: then nothing reaches the provider until the person asks
 * "Ask my AI for more", which sends the question with the records shown. Every provider call is a MOCK (page.route).
 */
const LOCAL_BASE = 'http://127.0.0.1:1234';
const PROVIDER_HOSTS = ['api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com', 'api.x.ai', 'openrouter.ai', '127.0.0.1:1234', 'localhost:1234', 'localhost:11434', '127.0.0.1:11434'];
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const connectedLocal = (): AiSettings => ({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: LOCAL_BASE});
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
async function seed(page: Page, settings: AiSettings | null, records: Record<string, string> = buildShowcase(DAY).records) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...(settings ? {[AI_SETTINGS_KEY]: JSON.stringify(settings)} : {})});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('before setup: a lookup is answered on the device with its records, nothing is sent and nothing of ZIGi\'s settings is written', async ({page}) => {
  const external: string[] = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:3\d{3})/, route => { external.push(route.request().url()); return route.abort(); });
  await seed(page, null);
  await page.goto('/app/health');
  await openChat(page);
  await expect(panel(page).getByRole('note', {name: 'ZIGi is not connected to an AI'})).toContainText('Not connected to an AI yet');
  await expect(panel(page).locator('.ai-greeting-text')).toHaveText('Hi, I’m ZIGi. Ask about your records: I answer here, on this device, with no AI.');
  // Session Z-Cloud Part 2: the example questions wait in the Suggestions sheet.
  await panel(page).getByRole('button', {name: 'Suggestions', exact: true}).click();
  await expect(panel(page).getByRole('group', {name: 'Questions ZIGi answers here'}).getByRole('button').first()).toBeVisible();
  await panel(page).getByRole('button', {name: 'Close suggestions'}).click();
  // The owner's own question, asked on the Health page.
  await panel(page).getByLabel('Ask ZIGi about your records').fill('How many minutes did I meditate this month?');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  const answer = panel(page).locator('.ai-turn-local').last();
  await expect(answer).toContainText(/^.*You logged \d+ minutes of Meditate this month \(Tue 1 Sep to Sun 20 Sep\)\./);
  await expect(answer.locator('.ai-turn-label')).toHaveText('Answered on your device · no AI used');
  await answer.getByText('Records used').click();
  await expect(answer.locator('.ai-record-source')).toHaveText('From your Habits journal on this device · Meditate · this month (2026-09-01 to 2026-09-20, UTC)');
  await expect(answer.getByRole('button', {name: 'Ask my AI for more'})).toHaveCount(0);
  // Health stays closed until its gate opens: the plain sentence, and the matching habit offered.
  await panel(page).getByLabel('Ask ZIGi about your records').fill('How much water did I drink yesterday?');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel(page).locator('.ai-turn-local').last()).toContainText('Health isn’t shared with ZIGi — turn it on in Settings');
  await expect(panel(page).locator('.ai-turn-local').last().getByRole('button', {name: 'Drink water (habit)'})).toBeVisible();
  await panel(page).locator('.ai-turn-local').last().getByRole('button', {name: 'Drink water (habit)'}).click();
  await expect(panel(page).locator('.ai-turn-local').last()).toContainText(/Drink water: \d+ glasses yesterday \(Sat 19 Sep\)/);
  // Not a lookup, no AI: examples to tap, each answered here.
  await panel(page).getByLabel('Ask ZIGi about your records').fill('Help me plan a calmer week');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel(page).locator('.ai-turn-local').last()).toContainText('I answer questions about your own records right here, on this device, without any AI. For example:');
  await panel(page).locator('.ai-turn-local').last().getByRole('button').filter({hasText: /goal\?$/}).first().click();
  await expect(panel(page).locator('.ai-turn-local').last()).toContainText(/% of the target/);
  expect(external.filter(url => PROVIDER_HOSTS.some(host => url.includes(host)))).toEqual([]);
  expect(await page.evaluate(k => localStorage.getItem(k), AI_SETTINGS_KEY)).toBeNull();
});

test('two habits that match equally become chips; a tap answers for that habit', async ({page}) => {
  const records = buildShowcase(DAY).records;
  let habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)) as HabitData;
  for (const title of ['Stretch morning', 'Stretch evening']) habits = createHabit(habits, {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(EVENING));
  await seed(page, null, {...records, [HABITS_KEY]: JSON.stringify(habits)});
  await page.goto('/app/habits');
  await openChat(page);
  await panel(page).getByLabel('Ask ZIGi about your records').fill('What is my stretch streak?');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  const reply = panel(page).locator('.ai-turn-local').last();
  await expect(reply).toContainText('More than one habit matches: Stretch morning, Stretch evening. Which one do you mean?');
  await reply.getByRole('button', {name: 'Stretch evening'}).click();
  await expect(panel(page).locator('.ai-turn-user').last()).toHaveText('Stretch evening');
  await expect(panel(page).locator('.ai-turn-local').last()).toContainText(/^Your current Stretch evening streak is 0 days/);
});

test('with a MOCK provider: lookups stay local, "Ask my AI for more" sends the question with the records shown, other questions go to the AI', async ({page}) => {
  const bodies: string[] = [];
  const handler = async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { bodies.push(route.request().postData() ?? ''); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('MOCK: with your records, your meditation looks steady.')}); }
    return route.fulfill({status: 404, body: ''});
  };
  await page.route(`${LOCAL_BASE}/**`, handler); await page.route('http://localhost:1234/**', handler);
  await seed(page, connectedLocal());
  await page.goto('/app/health');
  await openChat(page);
  await page.getByLabel('Message to your AI').fill('How many minutes did I meditate this month?');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  const local = panel(page).locator('.ai-turn-local').last();
  await expect(local).toContainText(/You logged \d+ minutes of Meditate this month/);
  await expect(local.locator('.ai-turn-label')).toHaveText('Answered on your device · no AI used');
  expect(bodies).toEqual([]);
  // The preview shows exactly the records that would go with the question.
  await local.getByText('What your AI sees if you ask for more').click();
  const preview = await local.locator('details').filter({hasText: 'What your AI sees if you ask for more'}).locator('pre').textContent();
  expect(preview).toContain("## Records for this question (from ZIGi's tools on this device)");
  expect(preview).toContain('"tool":"habit_stats"');
  await local.getByRole('button', {name: 'Ask my AI for more'}).click();
  await expect(panel(page).locator('.ai-turn-assistant:not(.ai-turn-local)').last()).toContainText('MOCK: with your records, your meditation looks steady.');
  await expect(panel(page).locator('.ai-turn-assistant:not(.ai-turn-local)').last().locator('.ai-turn-label')).toHaveText('Answer from your AI (your local server), not from ZIGoals.');
  expect(bodies).toHaveLength(1);
  const body = JSON.parse(bodies[0]!) as {messages: {role: string; content: string}[]};
  expect(body.messages[0]!.content).toContain("## Records for this question (from ZIGi's tools on this device)");
  expect(body.messages[0]!.content).toContain('Meditate');
  // The local turns themselves are not replayed: the provider sees the question once, as the new turn.
  expect(body.messages.filter(m => m.role === 'user')).toEqual([{role: 'user', content: 'How many minutes did I meditate this month?'}]);
  expect(body.messages.filter(m => m.role === 'assistant')).toEqual([]);
  // A question that is not a lookup goes to the AI directly.
  await page.getByLabel('Message to your AI').fill('Which habits are open?');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(JSON.stringify(JSON.parse(bodies[1]!).messages.at(-1))).toContain('Which habits are open?');
});

test('Showcase: the same answers over the fictional records, labelled fictional, kept in the tab', async ({page}) => {
  await seed(page, null);
  await page.getByRole('button', {name: /Load Showcase/}).click();
  // The Showcase loads its records first (Session W Part 22), then opens Today: wait for that before leaving the page.
  await page.waitForURL('**/app');
  await expect(page.getByText(/Showcase/).first()).toBeVisible();
  await page.goto('/app');
  await openChat(page);
  await panel(page).getByLabel('Ask ZIGi about your records').fill('What is my longest reading streak?');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  const answer = panel(page).locator('.ai-turn-local').last();
  await expect(answer).toContainText(/^Your longest Read streak is \d+ days?/);
  await answer.getByText('Records used').click();
  await expect(answer.locator('.ai-record-source')).toContainText('Fictional Showcase data · From your Habits journal on this device · Read');
  expect(await page.evaluate(k => localStorage.getItem(k), AI_SETTINGS_KEY)).toBeNull();
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => k.includes('ai-chats')))).toBe(false);
});
