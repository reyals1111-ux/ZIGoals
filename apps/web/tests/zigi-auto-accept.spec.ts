import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_ACTIONS_KEY, AI_OPTIONS_KEY} from '../lib/ai/store/keys';

/**
 * Session X-Local Part 5b ([TIER 3] storage: ai options): auto-accept through the real panel against a MOCK local
 * server. A switched-on kind is added by ZIGi itself with a toast and Undo and lands in Activity's "Actions by ZIGi";
 * weight never; a Health kind only while Health is shared with ZIGi (Settings greys the switch and says why); the daily
 * cap holds. Every reply is a MOCK; the records are the Showcase's.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const block = (value: unknown) => `Here you go.\n\n\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
type Body = {messages: {role: string; content: unknown}[]};
async function server(page: Page, reply: (body: Body) => string) {
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply(JSON.parse(route.request().postData() ?? '{}') as Body))});
    return route.fulfill({status: 404, body: ''});
  });
}
async function seed(page: Page, options: Record<string, unknown>, settings: Partial<AiSettings> = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const ai = {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, includeHealth: true, pageShare: {...base.pageShare, health: true}, ...settings};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach', ...options})});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
async function send(page: Page, text: string) { await page.getByLabel('Message to your AI').fill(text); await page.getByRole('button', {name: 'Send', exact: true}).click(); await expect(panel(page).locator('.ai-card').first()).toBeVisible(); }
const stored = (page: Page, key: string) => page.evaluate(k => { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v) as Record<string, any>; }, key); // eslint-disable-line @typescript-eslint/no-explicit-any
const WATER_AND_WEIGHT = () => block([{kind: 'log-water', millilitres: 300}, {kind: 'log-weight', value: 72.5, unit: 'kg'}]);
const handleFor = (body: Body, title: string) => new RegExp(`(h\\d+): ${title}`).exec(String(body.messages[0]!.content))?.[1] ?? 'h0';
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('water switched on, Health shared: ZIGi adds the water itself with a toast and Undo; the weight waits; Undo puts the water back', async ({page}) => {
  await server(page, WATER_AND_WEIGHT);
  await seed(page, {autoAccept: {kinds: {'log-water': true, 'log-weight': true}}});
  await page.goto('/app/health');
  const before = await stored(page, 'zigoals:health:v1');
  await openChat(page);
  await send(page, 'Drank 300 ml and I weigh 72.5 kg');
  const cards = panel(page).locator('.ai-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveClass(/ai-card-auto/); await expect(cards.nth(0).locator('.ai-card-status')).toHaveText('Added by ZIGi (auto-accept)');
  await expect(cards.nth(1)).toHaveClass(/ai-card-proposed/); await expect(cards.nth(1).getByRole('button', {name: 'Add', exact: true})).toBeVisible();
  const toast = panel(page).getByTestId('ai-auto-toast');
  await expect(toast).toContainText('Added by ZIGi: Add water');
  const water = (await stored(page, 'zigoals:health:v1'))!.daily.water;
  expect(water.length).toBe(before!.daily.water.length + 1); expect(water.at(-1)).toMatchObject({date: DAY, amountMilli: 300_000, unit: 'ml'});
  expect((await stored(page, 'zigoals:health:v1'))!.weights).toEqual(before!.weights);
  const actions = (await stored(page, AI_ACTIONS_KEY))!.actions; expect(actions).toHaveLength(1); expect(actions[0]).toMatchObject({kind: 'log-water', auto: true});
  expect((await stored(page, AI_OPTIONS_KEY))!.autoAccept.days).toEqual({[DAY]: 1});
  await toast.getByRole('button', {name: /^Undo/}).click();
  await expect(cards.nth(0)).toHaveClass(/ai-card-undone/);
  expect((await stored(page, 'zigoals:health:v1'))!.daily.water).toEqual(before!.daily.water);
  expect((await stored(page, AI_ACTIONS_KEY))!.actions).toEqual([]);
  // Activity names what ZIGi added by itself (the second message's water stays added).
  await send(page, 'Another 300 ml');
  await expect(panel(page).locator('.ai-card-auto')).toHaveCount(1);
  await page.goto('/app/activity');
  await page.getByRole('navigation', {name: 'Activity categories'}).getByRole('button', {name: 'Actions by ZIGi'}).click();
  const timeline = page.getByRole('region', {name: 'Unified private activity'});
  await expect(timeline).toContainText('Water: 300 mL'); await expect(timeline).toContainText('Added by ZIGi (auto-accept)');
});

test('Health not shared: a switched-on Health kind stays a proposal, and Settings greys the Health switches with the reason', async ({page}) => {
  await server(page, WATER_AND_WEIGHT);
  await seed(page, {autoAccept: {kinds: {'log-water': true}}}, {includeHealth: false});
  await page.goto('/app/health');
  await openChat(page);
  await send(page, 'Drank 300 ml');
  await expect(panel(page).locator('.ai-card').first()).toHaveClass(/ai-card-proposed/);
  await expect(panel(page).locator('.ai-card-auto')).toHaveCount(0);
  await expect(panel(page).getByTestId('ai-auto-toast')).toHaveCount(0);
  expect((await stored(page, AI_ACTIONS_KEY))?.actions ?? []).toEqual([]);
  await page.goto('/app/settings#your-ai');
  const group = page.getByRole('region', {name: 'Auto-accept'});
  await expect(group.getByTestId('auto-accept-health-closed')).toContainText('Health is not shared with ZIGi on this device, so ZIGi adds no Health entries by itself.');
  await expect(group.getByRole('switch', {name: 'Water'})).toBeDisabled();
  await expect(group.getByRole('switch', {name: 'Habit check-ins'})).toBeEnabled();
  await expect(group.getByRole('switch', {name: /Weight/})).toHaveCount(0);
});

test('a habit kind switched on needs no Health: the check-in is added by ZIGi; the daily cap stops the rest and says so', async ({page}) => {
  await server(page, body => block([{kind: 'check-in', habit: handleFor(body, 'Meditate'), minutes: 20}, {kind: 'check-in', habit: handleFor(body, 'Read'), minutes: 30}]));
  await seed(page, {autoAccept: {kinds: {'check-in': true}, dailyCap: 1}}, {includeHealth: false});
  await page.goto('/app/habits');
  const before = (await stored(page, 'zigoals:habits:v1'))!.habits;
  await openChat(page);
  await send(page, 'Meditated 20 minutes and read 30');
  const cards = panel(page).locator('.ai-card');
  await expect(cards.nth(0)).toHaveClass(/ai-card-auto/);
  await expect(cards.nth(1)).toHaveClass(/ai-card-proposed/);
  await expect(panel(page).getByText('Today’s auto-accept cap is reached; the rest waits for your tap.')).toBeVisible();
  const habits = (await stored(page, 'zigoals:habits:v1'))!.habits;
  expect(habits.find((h: {title: string}) => h.title === 'Meditate').entries.find((e: {date: string}) => e.date === DAY).count).toBe(20);
  // The second card waited: Read's entries are exactly the Showcase's.
  expect(habits.find((h: {title: string}) => h.title === 'Read').entries).toEqual(before.find((h: {title: string}) => h.title === 'Read').entries);
  expect((await stored(page, AI_OPTIONS_KEY))!.autoAccept).toMatchObject({kinds: {'check-in': true}, dailyCap: 1, days: {[DAY]: 1}});
  await page.goto('/app/settings#your-ai');
  await expect(page.getByRole('region', {name: 'Auto-accept'})).toContainText('1 of 1 added by ZIGi today');
});

test('switching a kind on in Settings is what the chat obeys; weight has no switch at all', async ({page}) => {
  await server(page, WATER_AND_WEIGHT);
  await seed(page, {});
  await page.goto('/app/settings#your-ai');
  const group = page.getByRole('region', {name: 'Auto-accept'});
  await expect(group).toContainText('Weight, fasting and anything about money are always confirmed by you.');
  await expect(group.getByRole('switch', {name: 'Water'})).toHaveAttribute('aria-checked', 'false');
  await group.getByRole('switch', {name: 'Water'}).click();
  await expect(group.getByRole('switch', {name: 'Water'})).toHaveAttribute('aria-checked', 'true');
  expect((await stored(page, AI_OPTIONS_KEY))!.autoAccept.kinds).toEqual({'log-water': true});
  await page.goto('/app/health');
  await openChat(page);
  await send(page, 'Drank 300 ml and I weigh 72.5 kg');
  await expect(panel(page).locator('.ai-card').nth(0)).toHaveClass(/ai-card-auto/);
  await expect(panel(page).locator('.ai-card').nth(1)).toHaveClass(/ai-card-proposed/);
});
