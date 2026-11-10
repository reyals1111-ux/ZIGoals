import {expect, test, type Page, type Route} from '@playwright/test';
import {pressZigi} from './zigi-open';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {ZIGI_CARDS_KEY, ZIGI_SUGGESTIONS_KEY} from '../lib/z-device-keys';

/**
 * Session AK (G1 #20, "A chat that isn't kept"): ZIGi's panel offers "Don't keep this chat" at an empty start and in "⋯".
 * Once pressed, the chat says so plainly, the person's AI (a MOCK local server, fictional Showcase records) still answers,
 * and nothing of the conversation is written: no chat in the chat store, no History page index entry, no frequent
 * question, no card outcome. Closing the panel ends it; the next chat is kept again.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
async function seed(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('MOCK: a calm week, mostly on track.')});
    return route.fulfill({status: 404, body: ''});
  });
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const values: Record<string, string> = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    [AI_SETTINGS_KEY]: JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE})};
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
  await page.waitForLoadState('networkidle');
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
const box = (page: Page) => panel(page).getByRole('textbox', {name: /^(Message to your AI|Ask ZIGi about your records)$/});
/** The chats this device holds (all scopes), read straight from the chat store's IndexedDB database. */
const storedChats = (page: Page) => page.evaluate(async () => {
  if (!(await indexedDB.databases()).some(d => d.name === 'zigoals-ai-chats-v1')) return 0;
  return new Promise<number>(resolve => { const r = indexedDB.open('zigoals-ai-chats-v1'); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('chats')) { db.close(); resolve(0); return; } const c = db.transaction('chats').objectStore('chats').count(); c.onsuccess = () => { db.close(); resolve(c.result); }; }; r.onerror = () => resolve(-1); });
});
const chatAreas = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:zigi:v1') ?? '{}') as {chatAreas?: Record<string, string>}).chatAreas ?? {});

test('"Don\'t keep this chat": the AI answers, the chat says it is not kept, nothing is written, and closing ends it', async ({page}) => {
  await seed(page);
  await page.goto('/app');
  await pressZigi(page); // Session AL (O3): the Apps & extras sheet below 901 px
  await expect(panel(page)).toBeVisible();
  // The empty start teaches the switch in one line.
  const offer = panel(page).locator('.ai-unkept-offer');
  await expect(offer).toContainText('A chat you’d rather not keep?');
  await offer.getByRole('button', {name: 'Don’t keep this chat'}).click();
  const banner = panel(page).getByRole('note', {name: 'This chat is not kept'});
  await expect(banner).toContainText('Nothing of it is saved on this device: it is not in History');
  await expect(banner).toContainText('Your privacy mode and every other setting still apply.');
  const keep = banner.getByRole('button', {name: 'Keep this chat'});
  expect((await keep.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await box(page).fill('How was my week?');
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: a calm week, mostly on track.');
  await page.waitForTimeout(400);
  expect(await storedChats(page)).toBe(0);
  expect(await chatAreas(page)).toEqual({});
  expect(await page.evaluate(k => localStorage.getItem(k), ZIGI_SUGGESTIONS_KEY)).toBeNull();
  expect(await page.evaluate(k => localStorage.getItem(k), ZIGI_CARDS_KEY)).toBeNull();
  // "⋯" shows the switch pressed, and offers no "Continue in NOVA" for a chat that is not kept.
  await panel(page).getByRole('button', {name: 'More: history, customize, settings and help'}).click();
  await expect(panel(page).getByRole('button', {name: 'Don’t keep this chat'})).toHaveAttribute('aria-pressed', 'true');
  await expect(panel(page).getByRole('link', {name: 'Continue this chat in NOVA'})).toHaveCount(0);
  await page.keyboard.press('Escape');
  // Closing the panel ends it: the next opening is an empty, kept chat.
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await pressZigi(page); // Session AL (O3): the Apps & extras sheet below 901 px
  await expect(panel(page).locator('.ai-turn-assistant')).toHaveCount(0);
  await expect(panel(page).getByRole('note', {name: 'This chat is not kept'})).toHaveCount(0);
  await expect(panel(page).locator('.ai-unkept-offer')).toBeVisible();
  expect(await storedChats(page)).toBe(0);
});

test('a kept chat is saved as before; pressing the switch mid-way removes the saved copy, "Keep this chat" saves it again', async ({page}) => {
  await seed(page);
  await page.goto('/app');
  await pressZigi(page); // Session AL (O3): the Apps & extras sheet below 901 px
  await box(page).fill('How was my week?');
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK:');
  await expect.poll(() => storedChats(page)).toBe(1);
  await panel(page).getByRole('button', {name: 'More: history, customize, settings and help'}).click();
  await panel(page).getByRole('button', {name: 'Don’t keep this chat'}).click();
  await expect(panel(page).getByRole('note', {name: 'This chat is not kept'})).toBeVisible();
  await expect.poll(() => storedChats(page)).toBe(0);
  expect(await chatAreas(page)).toEqual({});
  await panel(page).getByRole('note', {name: 'This chat is not kept'}).getByRole('button', {name: 'Keep this chat'}).click();
  await expect(panel(page).getByRole('note', {name: 'This chat is not kept'})).toHaveCount(0);
  await expect.poll(() => storedChats(page)).toBe(1);
});
