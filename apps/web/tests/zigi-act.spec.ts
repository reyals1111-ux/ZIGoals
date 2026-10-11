import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_ACTIONS_KEY, AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {AI_CHATS_DATABASE} from '../lib/ai/chats';

/**
 * Session V Part 7: acting by chat, voice and photo, through the real panel against a MOCK local OpenAI-compatible
 * server. One message becomes several cards with "Add all" and one Undo; confirmed cards show in Activity under
 * "Actions by ZIGi"; a meal photo goes once to the person's AI (only with a model that reads photos and Health shared)
 * and is never stored; log mode asks for cards only. Every answer is a MOCK.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const block = (value: unknown) => `\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
/** A 1×1 PNG: the photo the person picks (fictional). */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
type Body = {messages: {role: string; content: unknown}[]};
async function server(page: Page, reply: (body: Body) => string) {
  const bodies: Body[] = [];
  const handler = async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { const body = JSON.parse(route.request().postData() ?? '{}') as Body; bodies.push(body); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply(body))}); }
    return route.fulfill({status: 404, body: ''});
  };
  await page.route(`${BASE}/**`, handler);
  return bodies;
}
async function seed(page: Page, settings: Partial<AiSettings> = {}, extra: Record<string, string> = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const ai = {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, ...settings};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'}), ...extra});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
const stored = (page: Page, key: string) => page.evaluate(k => { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v) as Record<string, any>; }, key); // eslint-disable-line @typescript-eslint/no-explicit-any
const systemOf = (body: Body) => String(body.messages[0]!.content);
/** The handle the page context gave a habit (h1, h2…), read from the request as the AI would. */
const handleFor = (body: Body, title: string) => new RegExp(`(h\\d+): ${title}`).exec(systemOf(body))?.[1] ?? 'h0';
const BREAKFAST = 'Two eggs, toast and a coffee for breakfast, 30 minutes meditation and 2 glasses of water';
const breakfast = (body: Body) => `Five cards for your morning.\n\n${block([{kind: 'log-food', name: 'Two eggs', meal: 'Breakfast', estimate: {kcal: 140, protein_g: 12}}, {kind: 'log-food', name: 'Toast', meal: 'Breakfast', estimate: {kcal: 80}}, {kind: 'log-food', name: 'Coffee', meal: 'Breakfast'}, {kind: 'check-in', habit: handleFor(body, 'Meditate'), minutes: 30}, {kind: 'log-water', glasses: 2}])}`;
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('the brief\'s breakfast in log mode: five cards, "Add all", one Undo puts everything back, the actions log follows', async ({page}) => {
  const bodies = await server(page, breakfast);
  await seed(page);
  await page.goto('/app');
  await openChat(page);
  const before = {health: await stored(page, 'zigoals:health:v1'), habits: await stored(page, 'zigoals:habits:v1')};
  await panel(page).getByRole('button', {name: 'Log mode'}).click();
  await expect(panel(page).getByRole('button', {name: 'Log mode'})).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Message to your AI').fill(BREAKFAST);
  await panel(page).getByRole('button', {name: 'Log', exact: true}).click();
  const cards = panel(page).locator('.ai-card');
  await expect(cards).toHaveCount(5);
  expect(systemOf(bodies[0]!)).toContain('The person is logging what they did, ate or drank.');
  expect(bodies[0]!.messages.at(-1)).toEqual({role: 'user', content: BREAKFAST});
  await expect(cards.nth(3)).toContainText('Check in: Meditate'); await expect(cards.nth(3)).toContainText('Set the day\'s count to 30 minutes');
  await panel(page).getByRole('button', {name: 'Add all 5'}).click();
  await expect(panel(page).locator('.ai-card-added')).toHaveCount(5);
  const after = await stored(page, 'zigoals:health:v1');
  expect(after!.diary.length).toBe(before.health!.diary.length + 3);
  expect(after!.daily.water.length).toBe(before.health!.daily.water.length + 1);
  const meditate = (await stored(page, 'zigoals:habits:v1'))!.habits.find((h: {title: string}) => h.title === 'Meditate');
  expect(meditate.entries.find((e: {date: string}) => e.date === DAY).count).toBe(30);
  expect((await stored(page, AI_ACTIONS_KEY))!.actions.map((a: {kind: string}) => a.kind)).toEqual(['log-food', 'log-food', 'log-food', 'check-in', 'log-water']);
  await panel(page).getByRole('button', {name: /^Undo these 5/}).click();
  await expect(panel(page).locator('.ai-card-undone')).toHaveCount(5);
  expect((await stored(page, 'zigoals:health:v1'))!.diary).toEqual(before.health!.diary);
  expect((await stored(page, 'zigoals:health:v1'))!.daily.water).toEqual(before.health!.daily.water);
  expect((await stored(page, 'zigoals:habits:v1'))!.habits.find((h: {title: string}) => h.title === 'Meditate').entries).toEqual(before.habits!.habits.find((h: {title: string}) => h.title === 'Meditate').entries);
  expect((await stored(page, AI_ACTIONS_KEY))!.actions).toEqual([]);
});

test('Activity: "Actions by ZIGi" appears once a card is confirmed, and lists what came from ZIGi', async ({page}) => {
  await server(page, body => `Two cards.\n\n${block([{kind: 'check-in', habit: handleFor(body, 'Meditate'), minutes: 20}, {kind: 'log-water', millilitres: 500}])}`);
  await seed(page);
  await page.goto('/app/activity');
  await expect(page.getByRole('navigation', {name: 'Activity categories'}).getByRole('button', {name: 'Actions by ZIGi'})).toHaveCount(0);
  await page.goto('/app');
  await openChat(page);
  await page.getByLabel('Message to your AI').fill('Meditated 20 minutes and drank half a litre');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await panel(page).getByRole('button', {name: 'Add all 2'}).click();
  await expect(panel(page).locator('.ai-card-added')).toHaveCount(2);
  await page.goto('/app/activity');
  const tab = page.getByRole('navigation', {name: 'Activity categories'}).getByRole('button', {name: 'Actions by ZIGi'});
  await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
  const timeline = page.getByRole('region', {name: 'Unified private activity'});
  await expect(timeline.locator('.activity-event')).toHaveCount(2);
  await expect(timeline).toContainText('Meditate'); await expect(timeline).toContainText('Water: 500 mL');
  await expect(timeline.locator('.activity-by-zigi')).toHaveCount(2);
  // In "All", the check-in is marked too, among the rest of the history.
  await page.getByRole('navigation', {name: 'Activity categories'}).getByRole('button', {name: 'All', exact: true}).click();
  await expect(timeline.locator('.activity-event').filter({hasText: 'Meditate'}).first().locator('.activity-by-zigi')).toHaveText(' · by ZIGi');
});

test('a meal photo: only with Health shared and a model that reads photos; sent once to the AI, never stored', async ({page}) => {
  const bodies = await server(page, () => `From your photo, my estimate:\n\n${block([{kind: 'log-food', name: 'Grilled salmon', meal: 'Dinner', estimate: {kcal: 280, protein_g: 30, serving_g: 150}}, {kind: 'log-food', name: 'Green salad', meal: 'Dinner'}])}`);
  const base = defaultAiSettings();
  await seed(page, {includeHealth: true, pageShare: {...base.pageShare, health: true}}, {[AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach', visionDeclared: {'local:mock-chat': true}})});
  await page.goto('/app/health');
  await openChat(page);
  await panel(page).locator('input[type="file"]').setInputFiles({name: 'dinner.png', mimeType: 'image/png', buffer: PNG});
  const chip = panel(page).getByRole('group', {name: 'Meal photo attached'});
  await expect(chip).toContainText('Sent with this message to your local server only, then forgotten; ZIGoals does not keep it.');
  await page.getByLabel('Message to your AI').fill('My dinner');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel(page).locator('.ai-card')).toHaveCount(2);
  await expect(panel(page).locator('.ai-card-badge').first()).toHaveText('Estimated by your AI from a photo');
  await expect(panel(page).locator('.ai-turn-attachment')).toHaveText('📷 A meal photo went with this message to your AI; ZIGoals did not keep it.');
  const sent = bodies[0]!.messages.at(-1)!.content as {type: string; text?: string; image_url?: {url: string}}[];
  expect(sent[0]).toEqual({type: 'text', text: 'My dinner'});
  expect(sent[1]!.image_url!.url).toMatch(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/);
  expect(systemOf(bodies[0]!)).toContain('The person attached a photo of a meal.');
  const data = sent[1]!.image_url!.url.split(',')[1]!.slice(0, 40);
  // The chat on this device records only that a photo was attached.
  const records = await page.evaluate(name => new Promise<string>((resolve, reject) => { const open = indexedDB.open(name); open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, store = db.objectStoreNames[0]!, all = db.transaction(store).objectStore(store).getAll(); all.onsuccess = () => { resolve(JSON.stringify(all.result)); db.close(); }; }; }), AI_CHATS_DATABASE);
  expect(records).toContain('"attachments":[{"kind":"photo"}]'); expect(records).not.toContain(data); expect(records).not.toContain('base64');
  // A second message carries no photo.
  await page.getByLabel('Message to your AI').fill('Thanks');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(JSON.stringify(bodies[1]!.messages)).not.toContain('image_url');
});

test('no photo without Health shared, nor without a model that reads photos; "/log" asks for cards only', async ({page}) => {
  const bodies = await server(page, () => `${block({kind: 'counter', counter: 'Push-ups', count: 20})}`);
  await seed(page, {}, {[AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach', visionDeclared: {'local:mock-chat': true}})});
  await page.goto('/app/health');
  await openChat(page);
  await expect(panel(page).getByRole('button', {name: 'Add a meal photo'})).toHaveCount(0);
  await page.getByLabel('Message to your AI').fill('/log 20 push-ups');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel(page).locator('.ai-card')).toHaveCount(1);
  expect(bodies[0]!.messages.at(-1)).toEqual({role: 'user', content: '20 push-ups'});
  expect(systemOf(bodies[0]!)).toContain('The person is logging what they did, ate or drank.');
  await expect(panel(page).locator('.ai-card')).toContainText('Add 20 Push-ups');
});
