import {expect, test, type ConsoleMessage, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';

/**
 * Session Z-Local Part 1: the WebKit freeze Session Y saw twice in CI (ADR-018 Y42) and nowhere else: in
 * `zigi-auto-accept.spec.ts`, after an auto-accepted card's Undo and a second message, the page stopped answering for
 * the rest of the test (desktop, `:42`); on the phone, Send stayed disabled after the first message (`:73`). Both ran
 * under Playwright's installed clock with a MOCK model; neither reproduced on the owner's Mac in 60 isolated runs, 48
 * under eight concurrent pages, or two full WebKit suite runs. This spec loops the two scenarios and records what the
 * page was doing last: ZIGi's state changes, every image decode and poster load, the model request's start and end, and
 * a heartbeat on the browser's own timers (taken before the fake clock installs). The log travels in the console (so a
 * retained trace keeps it) and is attached to the test when a round times out, even if the page no longer answers.
 * Runs in CI's WebKit job (the config's `webkit-*` match) and in Chrome; every round must end with the reply's card.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const ROUNDS = Number(process.env.ZIGI_FREEZE_ROUNDS ?? '6'), REPLY_MS = 20_000;
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const block = (value: unknown) => `Here you go.\n\n\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
const WATER_AND_WEIGHT = block([{kind: 'log-water', millilitres: 300}, {kind: 'log-weight', value: 72.5, unit: 'kg'}]);
async function server(page: Page) {
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(WATER_AND_WEIGHT)});
    return route.fulfill({status: 404, body: ''});
  });
}
/** The probe: registered before the clock installs, so its heartbeat keeps the browser's real timers. Console only; no page state. */
async function probe(page: Page) {
  await page.addInitScript(() => {
    const t0 = performance.now(), nativeInterval = window.setInterval.bind(window), now = () => (performance.now() - t0).toFixed(0);
    const log = (...parts: unknown[]) => console.log(`[zigi-probe ${now()}]`, ...parts);
    nativeInterval(() => log('heartbeat'), 250);
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function (this: HTMLImageElement) { const src = this.currentSrc || this.src; log('decode start', src.slice(-40)); const p = decode.call(this); p.then(() => log('decode done', src.slice(-40)), e => log('decode failed', src.slice(-40), String(e))); return p; };
    const fetch0 = window.fetch;
    window.fetch = function (input, init) { const url = String(input instanceof Request ? input.url : input); const chat = url.includes('/v1/chat/completions'); if (chat) log('request start'); const p = fetch0.call(window, input, init); if (chat) p.then(r => log('request answered', r.status), e => log('request failed', String(e))); return p; };
    window.addEventListener('DOMContentLoaded', () => {
      const watch = () => {
        const button = document.querySelector('[data-testid="ai-launcher"] button[data-state]'); if (!button) return false;
        log('state', button.getAttribute('data-state'));
        new MutationObserver(() => log('state', button.getAttribute('data-state'))).observe(button, {attributes: true, attributeFilter: ['data-state']});
        return true;
      };
      if (!watch()) { const again = nativeInterval(() => { if (watch()) clearInterval(again); }, 200); }
      document.addEventListener('load', event => { const t = event.target; if (t instanceof HTMLImageElement && /figures\/zigi/.test(t.currentSrc || t.src)) log('poster loaded', (t.currentSrc || t.src).slice(-40)); }, true);
    });
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
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
/** A step with the reply watched: a step that overruns attaches the probe's log (what the page did last) before failing. */
function watched(page: Page) {
  const lines: string[] = [];
  page.on('console', (m: ConsoleMessage) => { const text = m.text(); if (text.startsWith('[zigi-probe')) { lines.push(text); if (lines.length > 4000) lines.shift(); } });
  return {
    lines,
    async step(name: string, run: () => Promise<void>) {
      const started = Date.now();
      try { await run(); }
      catch (error) {
        test.info().annotations.push({type: 'freeze', description: `${name} overran after ${Date.now() - started} ms`});
        await test.info().attach('zigi-probe.log', {body: lines.slice(-400).join('\n'), contentType: 'text/plain'});
        throw error;
      }
    },
  };
}
test('desktop and phone: after an auto-accepted card is undone, a second message is answered, every round (the Y42 freeze)', async ({page}) => {
  test.setTimeout(ROUNDS * 60_000);
  const w = watched(page);
  await probe(page);
  await server(page);
  for (let round = 1; round <= ROUNDS; round++) {
    await seed(page, {autoAccept: {kinds: {'log-water': true, 'log-weight': true}}});
    await page.goto('/app/health');
    await page.getByRole('button', {name: /Open ZIGi/}).click();
    await expect(panel(page)).toBeVisible();
    const cards = panel(page).locator('.ai-card');
    await w.step(`round ${round}: first message`, async () => {
      await page.getByLabel('Message to your AI').fill('Drank 300 ml and I weigh 72.5 kg');
      await page.getByRole('button', {name: 'Send', exact: true}).click();
      await expect(cards.nth(0)).toHaveClass(/ai-card-auto/, {timeout: REPLY_MS});
      await expect(panel(page).getByTestId('ai-auto-toast')).toContainText('Added by ZIGi: Add water', {timeout: REPLY_MS});
    });
    await w.step(`round ${round}: undo`, async () => {
      await panel(page).getByTestId('ai-auto-toast').getByRole('button', {name: /^Undo/}).click();
      await expect(cards.nth(0)).toHaveClass(/ai-card-undone/, {timeout: REPLY_MS});
    });
    await w.step(`round ${round}: second message`, async () => {
      await page.getByLabel('Message to your AI').fill('Another 300 ml');
      await page.getByRole('button', {name: 'Send', exact: true}).click();
      await expect(cards).toHaveCount(4, {timeout: REPLY_MS});
      await expect(panel(page).locator('.ai-card-auto')).toHaveCount(1, {timeout: REPLY_MS});
    });
  }
  // The heartbeat kept beating throughout: the browser's own timers never stopped for longer than a reply.
  expect(w.lines.filter(l => l.includes('heartbeat')).length).toBeGreaterThan(ROUNDS * 4);
});
test('Health not shared: the first message is answered as a proposal, every round (the Y42 phone freeze)', async ({page}) => {
  test.setTimeout(ROUNDS * 60_000);
  const w = watched(page);
  await probe(page);
  await server(page);
  for (let round = 1; round <= ROUNDS; round++) {
    await seed(page, {autoAccept: {kinds: {'log-water': true}}}, {includeHealth: false});
    await page.goto('/app/health');
    await page.getByRole('button', {name: /Open ZIGi/}).click();
    await expect(panel(page)).toBeVisible();
    await w.step(`round ${round}: first message with Health closed`, async () => {
      await page.getByLabel('Message to your AI').fill('Drank 300 ml');
      await expect(page.getByRole('button', {name: 'Send', exact: true})).toBeEnabled({timeout: REPLY_MS});
      await page.getByRole('button', {name: 'Send', exact: true}).click();
      await expect(panel(page).locator('.ai-card').first()).toHaveClass(/ai-card-proposed/, {timeout: REPLY_MS});
      await expect(panel(page).locator('.ai-card-auto')).toHaveCount(0);
    });
  }
});
