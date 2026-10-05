import {expect, test, type Page, type Route} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';

/**
 * ZIGi · your AI: the owner's screenshot gallery (ADR-012 follow-up, part B). Opt-in: `ZIGI_CAPTURES=1` writes every
 * state at 1440×900, 1024×768 and 390×844 into `ZIGI_CAPTURES_DIR` (default `test-results/zigi-captures`), all with
 * MOCK providers answered by page.route; nothing leaves the browser and no real provider exists here. Without the
 * flag the file is skipped, so the suite's totals do not change. Like tests/landing-v5-captures.spec.ts, this is a
 * capture tool, not an assertion suite; the two expectations only keep a broken page from producing a blank gallery.
 */
const enabled = process.env.ZIGI_CAPTURES === '1';
const OUT = process.env.ZIGI_CAPTURES_DIR ?? join(process.cwd(), 'test-results', 'zigi-captures');
const VIEWPORTS = [{name: 'desktop-1440', width: 1440, height: 900}, {name: 'tablet-1024', width: 1024, height: 768}, {name: 'phone-390', width: 390, height: 844}] as const;
const LOCAL_BASE = 'http://127.0.0.1:1234';
const FAKE_KEY = 'sk-test-FAKE-captures-0000000000000000';
const chunk = (delta: Record<string, unknown>, finish: string | null = null, usage?: Record<string, number>) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}], ...(usage ? {usage} : {})})}\n\n`;
const stream = (text: string, actions: unknown[] = [], usage = {prompt_tokens: 410, completion_tokens: 86}) => [chunk({role: 'assistant', content: text}), ...actions.map(a => chunk({content: `\n\n\`\`\`zigoals-action\n${JSON.stringify(a)}\n\`\`\``})), chunk({}, 'stop', usage), 'data: [DONE]\n\n'].join('');
const MODELS = JSON.stringify({object: 'list', data: [{id: 'mock-chat'}, {id: 'mock-chat-mini'}, {id: 'mock-chat-large'}]});
type Reply = (body: Record<string, unknown>) => Promise<{status?: number; body: string; contentType?: string}> | {status?: number; body: string; contentType?: string};
async function mockLocal(page: Page, reply: Reply) {
  const handler = async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/api/version')) return route.fulfill({status: 404, body: 'not found'});
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: MODELS});
    if (url.endsWith('/v1/chat/completions')) { const r = await reply(JSON.parse(route.request().postData() ?? '{}')); return route.fulfill({status: r.status ?? 200, contentType: r.contentType ?? 'text/event-stream', body: r.body}); }
    return route.fulfill({status: 404, body: ''});
  };
  await page.route(`${LOCAL_BASE}/**`, handler);
  await page.route('http://localhost:1234/**', handler);
}
const connectedLocal = (overrides: Partial<AiSettings> = {}): AiSettings => ({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: LOCAL_BASE, ...overrides});
const SHOWCASE_EVENING = '2026-09-20T19:00:00.000Z';
async function seed(page: Page, settings: AiSettings | null) {
  await page.clock.install({time: SHOWCASE_EVENING});
  const {records} = buildShowcase('2026-09-20');
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...(settings ? {[AI_SETTINGS_KEY]: JSON.stringify(settings)} : {})});
}
const openButton = (page: Page) => page.getByRole('button', {name: /Open ZIGi/});
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await openButton(page).click(); await expect(panel(page)).toBeVisible(); }
async function send(page: Page, text: string) { await page.getByLabel('Message to your AI').fill(text); await page.getByRole('button', {name: 'Send', exact: true}).click(); }
async function settle(page: Page) { await page.waitForTimeout(350); }
/** A fresh Settings page on its ZIGi anchor: a hash-only goto would not reload, so the route leaves first. */
async function freshSetup(page: Page) { await page.goto('/app'); await page.goto('/app/settings#your-ai'); await expect(page.locator('#your-ai').getByTestId('ai-setup')).toBeVisible(); }
test.skip(!enabled, 'Set ZIGI_CAPTURES=1 to write the gallery');
// Six page loads and a dozen states per test: more than the suite's 45 s.
test.setTimeout(240_000);
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({viewport: {width: viewport.width, height: viewport.height}, reducedMotion: 'no-preference'});
    const dir = join(OUT, viewport.name);
    const shot = async (page: Page, name: string, options: {full?: boolean} = {}) => { mkdirSync(dir, {recursive: true}); await settle(page); await page.screenshot({path: join(dir, `${name}.png`), fullPage: options.full ?? false, animations: 'disabled', caret: 'hide'}); };

    test('launcher, setup paths and the bridge', async ({page}) => {
      await seed(page, null);
      await page.goto('/app');
      await expect(openButton(page)).toBeVisible();
      await shot(page, '01-launcher-default');
      await openButton(page).hover(); await page.waitForTimeout(250);
      await shot(page, '02-launcher-hover');
      await openChat(page);
      await shot(page, '03-not-connected');
      await page.keyboard.press('Escape');
      await page.getByRole('button', {name: /Hide ZIGi/}).click();
      await shot(page, '04-launcher-hidden-undo-toast');
      await page.getByRole('button', {name: 'Undo', exact: true}).click();
      await page.goto('/app/settings#your-ai');
      const section = page.locator('#your-ai');
      await expect(section.getByTestId('ai-setup')).toBeVisible();
      await section.scrollIntoViewIfNeeded();
      await shot(page, '05-settings-setup-start', {full: false});
      await section.getByRole('button', {name: /I have an API key/}).click();
      await shot(page, '06-setup-api-key');
      await page.route('https://api.openai.com/**', route => route.fulfill({status: 200, contentType: 'application/json', body: MODELS}));
      await section.getByLabel('API key').fill(FAKE_KEY);
      await section.getByRole('button', {name: 'Test connection'}).click();
      await expect(section.getByRole('option', {name: /^mock-chat$/})).toBeVisible();
      await shot(page, '07-setup-api-key-models');
      await freshSetup(page);
      await section.getByRole('button', {name: /I run a model on this computer/}).click();
      await shot(page, '08-setup-local');
      await freshSetup(page);
      await section.getByRole('button', {name: /I only have a subscription/}).click();
      await shot(page, '09-setup-subscription');
      await section.getByRole('button', {name: 'ChatGPT', exact: true}).click();
      await section.getByRole('button', {name: /Use my .* subscription/}).click();
      await page.goto('/app/goals');
      await openChat(page);
      await expect(panel(page)).toContainText('Copy for my AI');
      await panel(page).locator('textarea').first().fill('Which goal needs attention this month?');
      await shot(page, '10-bridge');
    });

    test('empty chats with chips per page, pending, reply, cards, batch, edit, undo, switcher, history, preview', async ({page}) => {
      const held: {resolve: ((value: {body: string}) => void) | null} = {resolve: null};
      await mockLocal(page, body => {
        const last = String((body.messages as {content: string}[]).at(-1)?.content ?? '');
        if (last.startsWith('WAIT')) return new Promise<{body: string}>(resolve => { held.resolve = resolve; });
        if (last.includes('morning habits')) return {body: stream('Read is done and Exercise can wait for a rest day. Meditate is still open: shall I check it in?', [{kind: 'check-in', habit: 'h1'}, {kind: 'skip', habit: 'h2', reason: 'rest day'}, {kind: 'check-in', habit: 'h3', note: 'ten minutes'}])};
        if (last.includes('ate')) return {body: stream('Noted, two glasses of water and the eggs. The eggs are my estimate, not a label.', [{kind: 'log-water', glasses: 2}, {kind: 'log-food', name: 'Two eggs and toast', meal: 'Breakfast', estimate: {kcal: 320, protein_g: 16, carbs_g: 28, fat_g: 14}}])};
        return {body: stream('Three of your five habits are done. Water is at 1.5 L of your 2 L target, and the Emergency Fund goal has its next planned date on the 25th. Nothing needs a decision right now.')};
      });
      await seed(page, connectedLocal());
      for (const [path, name] of [['/app', '11-chat-empty-today'], ['/app/goals', '12-chat-empty-goals'], ['/app/habits', '13-chat-empty-habits'], ['/app/health', '14-chat-empty-health'], ['/app/wealth', '15-chat-empty-wealth'], ['/app/help', '16-chat-empty-help']] as const) {
        await page.goto(path); await openChat(page); await expect(panel(page).locator('.ai-greeting')).toBeVisible(); await shot(page, name); await page.keyboard.press('Escape');
      }
      await page.goto('/app');
      await openChat(page);
      await send(page, 'WAIT a moment');
      await expect(panel(page).locator('.ai-pending')).toBeVisible();
      await shot(page, '17-pending');
      held.resolve?.({body: stream('Here is your day: three of five habits done, water at 1.5 L of 2 L, the Emergency Fund goal on track.')});
      await expect(panel(page).locator('.ai-turn-assistant')).toBeVisible();
      await shot(page, '18-reply-with-controls');
      await panel(page).getByRole('button', {name: /Expand the chat/}).click().catch(() => undefined);
      await shot(page, '19-expanded');
      await panel(page).getByRole('button', {name: /Shrink the chat/}).click().catch(() => undefined);
      await panel(page).locator('summary', {hasText: 'What your AI sees'}).click();
      await shot(page, '20-what-your-ai-sees');
      await panel(page).locator('summary', {hasText: 'What your AI sees'}).click();
      await panel(page).locator('summary', {hasText: 'Model'}).click();
      await expect(panel(page).getByRole('listbox', {name: 'Models'})).toBeVisible();
      await shot(page, '21-model-switcher');
      await page.keyboard.press('Escape');
      await page.goto('/app/habits');
      await openChat(page);
      await send(page, 'Log my morning habits');
      await expect(panel(page).getByTestId('ai-proposals')).toBeVisible();
      await shot(page, '22-cards-batch');
      await panel(page).getByRole('button', {name: 'Edit', exact: true}).first().click();
      await shot(page, '23-card-edit');
      await page.keyboard.press('Escape');
      await panel(page).getByRole('button', {name: /^Add all/}).click();
      await expect(panel(page).locator('.ai-proposals-undo')).toBeVisible();
      await shot(page, '24-cards-added-undo');
      await page.goto('/app/health');
      await openChat(page);
      await send(page, 'I ate two eggs and toast and drank two glasses');
      await expect(panel(page).getByTestId('ai-proposals')).toBeVisible();
      await shot(page, '25-cards-health-estimate');
      await panel(page).getByRole('button', {name: 'Chat history', exact: true}).click();
      await expect(panel(page).locator('.ai-history')).toBeVisible();
      await shot(page, '26-history');
    });

    test('every error state, offline, Settings connected, Help topic', async ({page}) => {
      const errors: [string, number, string][] = [['27-error-bad-key', 401, JSON.stringify({error: {message: 'Incorrect API key provided', type: 'invalid_request_error', code: 'invalid_api_key'}})], ['28-error-no-credit', 429, JSON.stringify({error: {message: 'You exceeded your current quota', type: 'insufficient_quota', code: 'insufficient_quota'}})], ['29-error-rate-limit', 429, JSON.stringify({error: {message: 'Rate limit reached', type: 'rate_limit_error'}})], ['30-error-model-missing', 404, JSON.stringify({error: {message: 'The model `mock-chat` does not exist', type: 'invalid_request_error', code: 'model_not_found'}})], ['31-error-overloaded', 503, JSON.stringify({error: {message: 'The server is overloaded', type: 'server_error'}})]];
      let current = errors[0]!;
      await mockLocal(page, () => ({status: current[1], contentType: 'application/json', body: current[2]}));
      await seed(page, connectedLocal());
      await page.goto('/app');
      await openChat(page);
      for (const e of errors) {
        current = e;
        await send(page, 'Hello?');
        await expect(panel(page).locator('.ai-failure')).toBeVisible();
        await shot(page, e[0]);
      }
      await page.unroute(`${LOCAL_BASE}/**`); await page.unroute('http://localhost:1234/**');
      await page.route(`${LOCAL_BASE}/**`, route => route.abort('connectionrefused'));
      await send(page, 'Anyone there?');
      await expect(panel(page).locator('.ai-failure')).toBeVisible();
      await shot(page, '32-error-local-unreachable');
      await page.context().setOffline(true);
      await send(page, 'Offline now');
      await expect(panel(page).locator('.ai-failure')).toBeVisible();
      await shot(page, '33-offline');
      await page.context().setOffline(false);
      await page.keyboard.press('Escape');
      await page.goto('/app/settings#your-ai');
      await expect(page.locator('#your-ai .ai-connection')).toBeVisible();
      await page.locator('#your-ai').scrollIntoViewIfNeeded();
      await shot(page, '34-settings-connected');
      await page.goto('/app/help#help-your-ai-what');
      await expect(page.locator('#help-your-ai-what')).toBeVisible();
      await shot(page, '35-help-topic');
    });
  });
}
