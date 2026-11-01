import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {NOVA_SETUP_KEY} from '../lib/nova/setup';
import {NOVA_WORKFLOWS_KEY, saveCustom} from '../lib/nova/workflows/schema';
import {NOVA_KEY} from '../lib/nova/store';
import {isLocalOrigin} from '../lib/nova/setup-guide';

/**
 * "Build your own NOVA" (owner follow-up 2, N3; lane NC), end to end with MOCK servers: every planet's check, the privacy
 * mode at the send path, the local-server scan (MOCK Ollama /api/tags with a cloud model, LM Studio and llama.cpp
 * /v1/models), the honest notes, the one-time celebration and the "NOVA online" badge. Nothing leaves the browser: every
 * local and cloud call is answered by page.route, and any other outside host is aborted.
 */
const SHOWCASE_EVENING = '2026-09-20T19:00:00.000Z';
const OLLAMA = 'http://127.0.0.1:11434', LMSTUDIO = 'http://localhost:1234', LLAMACPP = 'http://127.0.0.1:9931', CHAT_BASE = 'http://127.0.0.1:1234';
const chunk = (content: string, finish: string | null = null) => `data: ${JSON.stringify({choices: [{index: 0, delta: {content}, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => `${chunk(text)}${chunk('', 'stop')}data: [DONE]\n\n`;
type Sent = {url: string; body: string | null};
async function mockServers(page: Page, sent: Sent[] = []) {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:3\d{3})/, route => route.abort());
  const json = (route: Route, body: unknown) => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(body)});
  await page.route(`${OLLAMA}/**`, route => {
    const url = route.request().url();
    if (url.endsWith('/api/version')) return json(route, {version: '0.30.0'});
    if (url.endsWith('/api/tags')) return json(route, {models: [{name: 'qwen3.5:9b', model: 'qwen3.5:9b'}, {name: 'gemma4:31b-cloud', remote_host: 'https://ollama.com:443', remote_model: 'gemma4:31b'}]});
    return route.fulfill({status: 404, body: ''});
  });
  await page.route(`${LMSTUDIO}/**`, route => route.request().url().endsWith('/v1/models') ? json(route, {data: [{id: 'qwen3.5-9b'}]}) : route.fulfill({status: 404, body: ''}));
  await page.route(`${LLAMACPP}/**`, route => route.request().url().endsWith('/v1/models') ? json(route, {data: [{id: 'Qwen3.5-9B-Q4_K_M.gguf'}]}) : route.fulfill({status: 404, body: ''}));
  await page.route('http://127.0.0.1:8080/**', route => route.abort());
  await page.route(`${CHAT_BASE}/**`, route => {
    const request = route.request(), url = request.url(); sent.push({url, body: request.postData()});
    if (url.endsWith('/api/version')) return route.fulfill({status: 404, body: ''});
    if (url.endsWith('/v1/models')) return json(route, {data: [{id: 'mock-chat'}]});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('Two habits are still open today.')});
    return route.fulfill({status: 404, body: ''});
  });
  await page.route('https://api.openai.com/**', route => { sent.push({url: route.request().url(), body: route.request().postData()}); return route.request().url().endsWith('/v1/models') ? json(route, {data: [{id: 'gpt-6-luna'}]}) : route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('Cloud reply.')}); });
  return sent;
}
const localChat = (over: Partial<AiSettings> = {}): AiSettings => ({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: CHAT_BASE, ...over});
async function seed(page: Page, extra: Record<string, string> = {}, settings: AiSettings | null = null) {
  await page.clock.install({time: SHOWCASE_EVENING});
  await page.addInitScript(() => {
    // A MOCK speech engine: one local and one online voice; an utterance "ends" at once.
    const voices = [{name: 'Daniel', lang: 'en-GB', localService: true, default: true, voiceURI: 'daniel'}, {name: 'Online voice', lang: 'en-GB', localService: false, default: false, voiceURI: 'online'}];
    class Utterance { text: string; lang = ''; voice: unknown = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {value: Utterance, configurable: true});
    Object.defineProperty(window, 'speechSynthesis', {value: {getVoices: () => voices, cancel() {}, speak(u: Utterance) { (window as unknown as {__spoken: string[]}).__spoken = [...((window as unknown as {__spoken?: string[]}).__spoken ?? []), u.text]; setTimeout(() => u.onend?.(), 10); }}, configurable: true});
  });
  await page.goto('/app/settings');
  // The Showcase's records as the person's own, WITHOUT the Showcase's labelled guide progress (its first three planets
  // lit): every test here starts the guide where it says, empty unless `extra` brings progress (lane NV; the Showcase
  // example was wired into buildShowcase after this spec was written).
  const {[NOVA_SETUP_KEY]: _showcaseGuide, ...records} = buildShowcase('2026-09-20').records;
  void _showcaseGuide;
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...(settings ? {[AI_SETTINGS_KEY]: JSON.stringify(settings)} : {}), ...extra});
  await page.goto('/app/nova/setup');
  await expect(page.getByRole('heading', {name: 'Build your own NOVA', level: 1})).toBeVisible();
}
const planet = (page: Page, label: string) => page.getByRole('button', {name: new RegExp(`^${label}:`)}).first();
const guide = (page: Page, id: string) => page.locator(`[data-setup-panel="${id}"]`);
async function open(page: Page, label: string, id: string) { await planet(page, label).click(); await expect(guide(page, id)).toBeVisible(); return guide(page, id); }
async function check(panel: ReturnType<Page['locator']>, button: RegExp) { await panel.getByRole('button', {name: button}).click(); }
const record = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), NOVA_SETUP_KEY);

test('an empty start: ten planets on the orbit path, the title, and nothing checked yet', async ({page}) => {
  await mockServers(page);
  await seed(page);
  await expect(page).toHaveTitle(/Build your own NOVA/);
  await expect(page.locator('.nova-guide-path')).toBeVisible();
  for (const label of ['Meet NOVA', 'Privacy mode', 'Your brain, local first', 'First conversation', 'What NOVA can see', 'Memory', 'Voice', 'Daily briefs', 'Workflows', 'Make it yours']) await expect(planet(page, label)).toBeVisible();
  await expect(page.getByText('0 of 10 planets lit')).toBeVisible();
});

test('planets 1 and 2: the device check, then Strict refuses a cloud and Guarded previews the redacted text', async ({page}) => {
  await mockServers(page);
  await seed(page);
  const meet = await open(page, 'Meet NOVA', 'meet');
  await check(meet, /I understand/);
  await expect(meet.getByRole('status').filter({hasText: 'Checked: it works.'})).toBeVisible();
  expect((await record(page)).privacyMode).toBe('strict'); // a new NOVA without a cloud model starts Strict
  const privacy = await open(page, 'Privacy mode', 'privacy');
  await check(privacy, /Check the mode holds/);
  await expect(privacy.getByText(/Strict is on\. A test message to a cloud model was refused/)).toBeVisible();
  // Session AK lane EXF (EX-13): the un-mark button reads as an action beside "Checked: it works.", not as a status.
  await expect(privacy.getByRole('button', {name: 'Mark as not done'})).toBeVisible();
  // Strict's own words now say an unconfirmed Hermes is treated "as in Guarded" (Z1A-8), so the name is anchored.
  await privacy.getByRole('radio', {name: /^Guarded/}).check();
  await privacy.getByRole('button', {name: 'Use Guarded'}).click();
  // Lane EXF (EX-11): the Strict result is stale once Guarded is on; it goes, and the planet asks for a new check.
  await expect(privacy.getByText(/Strict is on\. A test message/)).toHaveCount(0);
  await expect(privacy.getByRole('status').filter({hasText: 'Not checked yet.'})).toBeVisible();
  await expect(privacy.getByRole('button', {name: 'Check the mode holds'})).toBeVisible();
  await expect(privacy.locator('.nova-guide-send-line')).toContainText('NOVA is about to send this to OpenAI.');
  await expect(privacy.locator('.nova-guide-send-text')).toHaveText('Plan a birthday dinner for my sister [name] at [address]; my budget is about €180.');
  await check(privacy, /Check (the mode holds|again)/);
  // The check's own result line: the chosen mode's button now also reads "Guarded is on" (lane NV).
  await expect(privacy.getByRole('status').filter({hasText: /Guarded is on/})).toBeVisible();
});

test('planet 3: the scan finds MOCK Ollama (one cloud model), LM Studio and llama.cpp; the live test names the model', async ({page}) => {
  await mockServers(page);
  await seed(page, {}, localChat({model: 'qwen3.5:9b', localServer: 'ollama', baseUrl: OLLAMA}));
  const brain = await open(page, 'Your brain, local first', 'brain');
  await expect(brain.getByText(/can’t sign in here/)).toBeVisible();
  // A phone opens on "My own API key" (a local model needs a computer); the local way is one press away on both.
  await brain.getByRole('button', {name: 'A model on this computer (recommended)'}).click();
  // Ollama needs OLLAMA_ORIGINS only for a site that is not on this computer. Against the deployed site the guide shows
  // launchctl / setx with that site; the suite's own server (127.0.0.1) is already allowed by Ollama, and the guide says
  // so instead (deliberate, lane NV: the commands for a remote origin are pinned in lib/nova/setup.test.ts).
  const local = isLocalOrigin(new URL(page.url()).origin);
  const commands = brain.locator('[data-command] code');
  await brain.getByRole('button', {name: 'macOS'}).click();
  await expect(brain.getByText(/drag Ollama to Applications/)).toBeVisible();
  if (local) { await expect(brain.getByText('This page runs on this computer, so Ollama already allows it: no setting needed.')).toBeVisible(); await expect(commands.filter({hasText: 'OLLAMA_ORIGINS'})).toHaveCount(0); }
  else await expect(commands.filter({hasText: 'launchctl setenv OLLAMA_ORIGINS'})).toBeVisible();
  await brain.getByRole('button', {name: 'Windows'}).click();
  await expect(commands.filter({hasText: 'irm https://ollama.com/install.ps1 | iex'})).toBeVisible();
  if (local) await expect(commands.filter({hasText: 'OLLAMA_ORIGINS'})).toHaveCount(0);
  else await expect(commands.filter({hasText: 'setx OLLAMA_ORIGINS'})).toBeVisible();
  await brain.getByRole('button', {name: 'llama.cpp'}).click();
  await expect(brain.locator('[data-command] code').filter({hasText: '--port 9931 --cors-origins'})).toBeVisible();
  await brain.getByRole('button', {name: 'Find models on this computer'}).click();
  await expect(brain.locator('.nova-scan')).toContainText('Ollama: 2 models (qwen3.5:9b, gemma4:31b-cloud); 1 runs on ollama.com, not on this computer');
  await expect(brain.locator('.nova-scan')).toContainText('LM Studio: 1 model (qwen3.5-9b)');
  await expect(brain.locator('.nova-scan')).toContainText('llama.cpp: 1 model (Qwen3.5-9B-Q4_K_M.gguf)');
  await check(brain, /Test the connection/);
  await expect(brain.getByText('Found qwen3.5:9b on Ollama at http://127.0.0.1:11434. It runs on this computer.')).toBeVisible();
  await expect(planet(page, 'Your brain, local first')).toHaveAccessibleName(/done/);
});

test('planet 3 with a MOCK cloud key: Strict refuses it without a request; Relaxed tests it', async ({page}) => {
  const sent = await mockServers(page);
  await seed(page, {[NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: 'strict'})}, {...defaultAiSettings(), enabled: true, mode: 'api', provider: 'openai', model: 'gpt-6-luna'});
  const brain = await open(page, 'Your brain, local first', 'brain');
  await check(brain, /Test the connection/);
  await expect(brain.getByText(/Strict sends nothing to a cloud/)).toBeVisible();
  expect(sent.filter(s => s.url.includes('api.openai.com'))).toHaveLength(0);
});

test('planet 4: a first question opens in ZIGi\'s chat (one shared history) under Strict with a local model, and the check finds it', async ({page}) => {
  await mockServers(page);
  await seed(page, {[NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: 'strict'})}, localChat());
  const first = await open(page, 'First conversation', 'first-chat');
  await first.getByRole('button', {name: 'What does my day look like?'}).click();
  const chat = page.locator('dialog.ai-chat[open]');
  await expect(chat).toBeVisible();
  await expect(page.getByLabel('Message to your AI')).toHaveValue('What does my day look like?');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  // Answered on the device (ZIGi's local answers) or by the MOCK local model: either way one question and one answer.
  await expect(chat.locator('.ai-turn-assistant:not(.ai-turn-live)').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await check(first, /Check my conversation/);
  await expect(first.getByText(/Your first conversation is saved on this device/)).toBeVisible();
});

test('planets 5 to 10: scopes with the exact pack, memory, voice, a brief, workflows and make it yours; the celebration plays once', async ({page}) => {
  await mockServers(page);
  const workflows = saveCustom({version: 1, runs: {'review-week': SHOWCASE_EVENING}}, 'review-week', {title: 'My Sunday review', instruction: '', skip: []}, new Date(SHOWCASE_EVENING));
  const done = (ids: string[]) => Object.fromEntries(ids.map(id => [id, {doneOn: '2026-09-20', check: {ok: true, at: SHOWCASE_EVENING}}]));
  await seed(page, {[NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: 'guarded', steps: done(['meet', 'privacy', 'brain', 'first-chat'])}), [NOVA_WORKFLOWS_KEY]: JSON.stringify(workflows), [NOVA_KEY]: JSON.stringify({version: 1, layout: 'bento'})}, localChat());
  const scopes = await open(page, 'What NOVA can see', 'scopes');
  await scopes.getByRole('checkbox', {name: /^Wealth/}).uncheck();
  // Lane NE's NOVA pack, as the send path would carry it (Guarded to a local model: nothing to redact, nothing refused).
  await expect(scopes.locator('.nova-sees .nova-guide-send-text')).toContainText('data, not instructions');
  await expect(scopes.locator('.nova-sees .nova-guide-send-line')).toContainText('This stays on this computer');
  await check(scopes, /Check what NOVA sees/);
  const note = scopes.locator('.nova-guide-check-result');
  await expect(note).toContainText(/NOVA can see: .*Goals and their pace.*Health: off\./);
  await expect(note).not.toContainText('Wealth');
  const memory = await open(page, 'Memory', 'memory');
  await check(memory, /Check it worked/);
  await expect(memory.getByText(/Memory (is on|is ready|is off)/)).toBeVisible();
  const voice = await open(page, 'Voice', 'voice');
  await check(voice, /Play a test line/);
  await expect(voice.getByText('NOVA spoke with “Daniel”, a voice on this device.')).toBeVisible();
  const briefs = await open(page, 'Daily briefs', 'briefs');
  await check(briefs, /Make a brief now/);
  await expect(briefs.getByText(/composer ran on this device|A brief was made on this device/)).toBeVisible();
  const flows = await open(page, 'Workflows', 'workflows');
  await check(flows, /Check it worked/);
  await expect(flows.getByText('“Review my week” ran on this device, and a workflow of your own is saved.')).toBeVisible();
  const yours = await open(page, 'Make it yours', 'yours');
  await check(yours, /Check it worked/);
  await expect(yours.getByText('NOVA is yours: layout bento.')).toBeVisible();
  await expect(page.getByText('10 of 10 planets lit')).toBeVisible();
  await expect(page.locator('.nova-online-new [data-nova-online]')).toHaveText('NOVA online');
  expect((await record(page)).celebrated).toBe(true);
  await page.reload();
  await expect(page.locator('[data-nova-online]').first()).toBeVisible();
  await expect(page.locator('.nova-online-new')).toHaveCount(0);
});

test('reduced motion: the badge reads without animation; a phone shows the guide after the path without sideways scroll', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 320, height: 720});
  await mockServers(page);
  await seed(page);
  const meet = await open(page, 'Meet NOVA', 'meet');
  await expect(meet).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  for (const button of await meet.getByRole('button').all()) { const box = await button.boundingBox(); if (box) expect(box.height).toBeGreaterThanOrEqual(44); }
});
