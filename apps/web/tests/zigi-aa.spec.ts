import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {GAME_KEY} from '../lib/aa-device-keys';

/**
 * Session AA-Local Part 5 (ADR-022 B37): a device-record kind through the real panel. A MOCK reply proposes
 * `set-game-layer`; Add writes `zigoals:game:v1` through the device-write registry (never a synced record), the Habits
 * page shows the game card at once, and the synced habits record is byte-identical before and after. A second card turns
 * it off again: the card disappears, the record keeps its other fields. Every reply is a MOCK.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z', HABITS_KEY = 'zigoals:habits:v1';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const block = (value: unknown) => `Here it is.\n\n\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
async function server(page: Page, replies: readonly string[]) {
  let n = 0;
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(replies[Math.min(n++, replies.length - 1)]!)});
    return route.fulfill({status: 404, body: ''});
  });
}
async function seed(page: Page) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const ai = {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, seen: WHATS_NEW_RELEASE}), [AI_SETTINGS_KEY]: JSON.stringify(ai)});
  await page.evaluate(key => localStorage.removeItem(key), GAME_KEY);
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function send(page: Page, text: string) { await page.getByLabel('Message to your AI').fill(text); await page.getByRole('button', {name: 'Send', exact: true}).click(); await expect(panel(page).locator('.ai-card').last()).toBeVisible(); }
const stored = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);

test('set-game-layer: Add writes only the game device record, the card shows at once, and off takes it away again', async ({page}) => {
  await server(page, [block({kind: 'set-game-layer', enabled: true}), block({kind: 'set-game-layer', enabled: false})]);
  await seed(page);
  await page.goto('/app/habits');
  await expect(page.getByRole('region', {name: 'Your progress'})).toHaveCount(0);
  const habitsBefore = await stored(page, HABITS_KEY);
  await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible();
  await send(page, 'Turn on the game layer');
  const card = panel(page).locator('.ai-card').last();
  await expect(card).toContainText('Turn the game layer on');
  await card.getByRole('button', {name: 'Apply', exact: true}).click();
  await expect(card).toHaveClass(/ai-card-opened/);
  await expect.poll(async () => JSON.parse((await stored(page, GAME_KEY)) ?? 'null')?.enabled).toBe(true);
  await expect(page.getByRole('region', {name: 'Your progress'}).first()).toBeVisible();
  expect(await stored(page, HABITS_KEY), 'the synced habits record is untouched by a device write').toBe(habitsBefore);
  await send(page, 'Turn the game layer off');
  const off = panel(page).locator('.ai-card').last();
  await expect(off).toContainText('Turn the game layer off');
  await off.getByRole('button', {name: 'Apply', exact: true}).click();
  await expect(off).toHaveClass(/ai-card-opened/);
  await expect.poll(async () => JSON.parse((await stored(page, GAME_KEY)) ?? 'null')?.enabled).toBe(false);
  await expect(page.getByRole('region', {name: 'Your progress'})).toHaveCount(0);
  expect(await stored(page, HABITS_KEY)).toBe(habitsBefore);
});
