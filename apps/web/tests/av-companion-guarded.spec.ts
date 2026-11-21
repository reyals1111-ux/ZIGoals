import {expect, test, type Page, type Route} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {NOVA_SETUP_KEY} from '../lib/nova/setup';
import {pressZigi, zigiBox, zigiPanel} from './zigi-open';

/**
 * Session AV, owner follow-up 3 (both decided 21 Nov 2026, UNFINISHED.md "Owner decisions"):
 * - L-9: ZIGi is titled "ZIGi · your companion" (never "AI" in the title while its answers say no AI was used), and no
 *   Premium badge shows anywhere during the Alpha: not in ZIGi's panel, its Settings section, or NOVA's Make it yours.
 * - PK-18 (TIER 3 AI tools): with no privacy mode chosen, ZIGi's send to a cloud model behaves as Guarded: the redacted
 *   preview shows before Send, and the request that leaves carries no IBAN, address or exact amount. Relaxed sends as is.
 * The "cloud" is a MOCK: an OpenAI-compatible server on 127.0.0.1:1234 answering for a model named like one of Ollama's
 * cloud models (`gpt-oss:120b-cloud`, read as a cloud by name). Fictional data; nothing leaves the browser.
 */
const BASE = 'http://127.0.0.1:1234', TITLE = 'ZIGi · your companion';
const PRIVATE = 'Remind me I owe Anna €1,234.56 from BE68 5390 0754 7034, at 12 Abbey Road.';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
async function mock(page: Page, model: string, bodies: string[]) {
  await page.route(`${BASE}/**`, (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: model}]})});
    if (url.endsWith('/v1/chat/completions')) { bodies.push(route.request().postData() ?? ''); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('MOCK: noted.')}); }
    return route.fulfill({status: 404, body: ''});
  });
}
async function seed(page: Page, values: Record<string, string>) {
  await page.goto('/app/settings');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); },
    {'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), ...values});
}
const ai = (model: string) => JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model, localServer: 'openai-compatible', baseUrl: BASE});
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('L-9: the panel and Settings say "ZIGi · your companion"; no Premium badge in the panel, Settings or NOVA', async ({page}) => {
  await mock(page, 'mock-chat', []);
  await seed(page, {[AI_SETTINGS_KEY]: ai('mock-chat')});
  await page.goto('/app');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await pressZigi(page);
  await expect(zigiPanel(page)).toHaveAccessibleName(TITLE);
  await expect(zigiPanel(page).getByRole('heading', {name: TITLE})).toBeVisible();
  await expect(zigiPanel(page)).not.toContainText('AI Companion');
  await expect(zigiPanel(page).locator('.premium-badge, .ai-chat-premium-badge')).toHaveCount(0);
  await expect(zigiPanel(page).getByRole('link', {name: /Premium/})).toHaveCount(0);
  await page.goto('/app/settings#your-ai');
  const section = page.locator('#your-ai');
  await expect(section.getByRole('heading', {name: TITLE})).toBeVisible({timeout: 20_000});
  await expect(section).not.toContainText('Premium');
  await expect(page.locator('.premium-badge')).toHaveCount(0);
  await page.goto('/app/help#help-your-ai-what');
  await expect(page.locator('main')).not.toContainText('Personal AI Companion');
});

test('PK-18: no privacy mode chosen, a cloud model: the redacted preview shows first, and the request carries no IBAN, address or exact amount', async ({page}) => {
  const bodies: string[] = [];
  await mock(page, 'gpt-oss:120b-cloud', bodies);
  await seed(page, {[AI_SETTINGS_KEY]: ai('gpt-oss:120b-cloud')});
  await page.goto('/app');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await pressZigi(page);
  await expect(zigiBox(page)).toBeVisible({timeout: 15_000});
  await zigiBox(page).fill(PRIVATE);
  const preview = zigiPanel(page).locator('.ai-send-preview');
  await expect(preview.getByRole('note')).toContainText('No privacy mode is chosen yet, so ZIGi sends as Guarded');
  await expect(preview.locator('.nova-guide-send-line')).toContainText("ZIGi is about to send this to Ollama's cloud (ollama.com). Taken out or rounded: 1 IBAN, 1 address, 1 exact amount (rounded) and 1 name.");
  const sent = preview.getByLabel('Exactly what would be sent');
  await expect(sent).toBeVisible();
  for (const secret of ['BE68 5390 0754 7034', '12 Abbey Road', '1,234.56']) await expect(sent).not.toContainText(secret);
  await zigiPanel(page).locator('.ai-composer button[type=submit]').click();
  await expect.poll(() => bodies.length, {timeout: 20_000}).toBeGreaterThan(0);
  for (const secret of ['BE68 5390 0754 7034', '12 Abbey Road', '1,234.56']) expect(bodies.join('\n')).not.toContain(secret);
});

test('PK-18: Relaxed chosen, the same cloud model: no preview, and the words go as they are', async ({page}) => {
  const bodies: string[] = [];
  await mock(page, 'gpt-oss:120b-cloud', bodies);
  await seed(page, {[AI_SETTINGS_KEY]: ai('gpt-oss:120b-cloud'), [NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: 'relaxed'})});
  await page.goto('/app');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await pressZigi(page);
  await expect(zigiBox(page)).toBeVisible({timeout: 15_000});
  await zigiBox(page).fill(PRIVATE);
  await expect(zigiBox(page)).toHaveValue(PRIVATE);
  await expect(zigiPanel(page).locator('.ai-send-preview .nova-guide-send')).toHaveCount(0);
  await expect(zigiPanel(page).locator('.ai-no-mode')).toHaveCount(0);
  await zigiPanel(page).locator('.ai-composer button[type=submit]').click();
  await expect.poll(() => bodies.length, {timeout: 20_000}).toBeGreaterThan(0);
  expect(bodies.join('\n')).toContain('BE68 5390 0754 7034');
});
