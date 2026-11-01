import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY} from '../lib/ai/settings';
import {NOVA_SETUP_KEY} from '../lib/nova/setup';
import {NOVA_HERMES_KEY} from '../lib/nova/hermes-record';

/**
 * "Connect your Hermes Agent" (owner follow-up 3, N11; lane NC) with a MOCK Hermes API server on 127.0.0.1:8642 (the
 * shapes of docs/research/session-ak/HERMES_AGENT.md: /health with platform and version, /v1/models, SSE with a
 * keepalive and a tool-progress event, 401 gateway_auth_failed). Covers: gateway down, this site not allowed (CORS), the
 * wrong key, a working connection that names the model, Hermes as NOVA's brain, the privacy rule and its preview, a
 * streamed first run with the redacted request, and the summary file made on the device with nothing sent.
 */
const SHOWCASE_EVENING = '2026-09-20T19:00:00.000Z', HERMES = 'http://127.0.0.1:8642', KEY = 'ab'.repeat(32);
type Mode = 'up' | 'down' | 'cors';
type Seen = {url: string; auth?: string; body: string | null};
async function mockHermes(page: Page, mode: Mode, seen: Seen[] = []) {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:3\d{3})(?!127\.0\.0\.1:8642)/, route => route.abort());
  await page.route(`${HERMES}/**`, (route: Route) => {
    const request = route.request(), url = request.url(), headers = request.headers();
    seen.push({url, auth: headers.authorization, body: request.postData()});
    if (mode === 'down') return route.abort('connectionrefused');
    // Hermes's allowlist without this site: a bare 403 the page cannot read; a no-cors probe still gets its opaque answer.
    if (mode === 'cors') return headers['sec-fetch-mode'] === 'no-cors' ? route.fulfill({status: 403, body: ''}) : route.abort('failed');
    if (url.endsWith('/health')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({status: 'ok', platform: 'hermes-agent', version: '0.22.5'})});
    if (headers.authorization !== `Bearer ${KEY}`) return route.fulfill({status: 401, contentType: 'application/json', body: JSON.stringify({error: {message: 'Invalid gateway API key (API_SERVER_KEY)', type: 'gateway_auth_error', code: 'gateway_auth_failed'}})});
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'hermes-agent', object: 'model', owned_by: 'hermes'}]})});
    if (url.endsWith('/v1/chat/completions')) {
      const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'c', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
      const body = [chunk({role: 'assistant'}), ': keepalive\n\n', 'event: hermes.tool.progress\ndata: {"tool":"memory","status":"running"}\n\n', chunk({content: 'Monday: review goals. '}), chunk({content: 'Wednesday: savings check.'}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
      return route.fulfill({status: 200, contentType: 'text/event-stream', body});
    }
    return route.fulfill({status: 404, body: ''});
  });
  return seen;
}
async function seed(page: Page, extra: Record<string, string> = {}) {
  await page.clock.install({time: SHOWCASE_EVENING});
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase('2026-09-20').records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...extra});
  await page.goto('/app/nova/hermes');
  await expect(page.getByRole('heading', {name: 'Connect your Hermes Agent', level: 1})).toBeVisible();
}
const open = async (page: Page, label: string, id: string) => { await page.getByRole('button', {name: new RegExp(`^${label}:`)}).first().click(); const p = page.locator(`[data-hermes-panel="${id}"]`); await expect(p).toBeVisible(); return p; };
const connect = async (page: Page, key = KEY) => {
  const panel = await open(page, 'Connect it in ZIGoals', 'connect');
  await panel.getByLabel('API_SERVER_KEY').fill(key);
  await panel.getByRole('button', {name: /Test \/health and \/v1\/models|Check again/}).click();
  return panel;
};

test('ten planets; the install, API server and gateway commands per OS, one per block, with this site and a key made here', async ({page}) => {
  await mockHermes(page, 'up');
  await seed(page);
  await expect(page).toHaveTitle(/Connect your Hermes Agent/);
  const install = await open(page, 'Install Hermes', 'install');
  await install.getByRole('button', {name: 'Windows'}).click();
  await expect(install.locator('[data-command] code').first()).toHaveText('iex (irm https://hermes-agent.nousresearch.com/install.ps1)');
  await install.getByLabel(/Paste what/).fill('Hermes Agent v0.22.5 (2026-10-22)');
  await install.getByRole('button', {name: 'Check the version'}).click();
  await expect(install.getByText('Hermes Agent 0.22.5 is installed.')).toBeVisible();
  const api = await open(page, 'Turn on its API server', 'api');
  await api.getByRole('button', {name: 'Linux'}).click();
  await api.getByRole('button', {name: 'Make a key here'}).click();
  const commands = await api.locator('[data-command] code').allTextContents();
  expect(commands).toContain('hermes config set API_SERVER_ENABLED true');
  expect(commands.some(c => /^hermes config set API_SERVER_KEY [0-9a-f]{64}$/.test(c))).toBe(true);
  expect(commands).toContain(`hermes config set API_SERVER_CORS_ORIGINS ${new URL(page.url()).origin}`);
  expect(await page.evaluate(() => Object.values(localStorage).some(v => /[0-9a-f]{64}/.test(v) && v.includes('API_SERVER')))).toBe(false);
});

test('gateway down, then this site not allowed (CORS), each named with its fix; no request leaves for anywhere else', async ({page}) => {
  await mockHermes(page, 'down');
  await seed(page);
  const gateway = await open(page, 'Start the gateway', 'gateway');
  await gateway.getByRole('button', {name: 'Is it running?'}).click();
  await expect(gateway.getByText(/Hermes’s gateway is not answering\./)).toBeVisible();
  await page.unroute(`${HERMES}/**`);
  await mockHermes(page, 'cors');
  const browser = await open(page, 'Let the browser reach it', 'browser');
  await browser.getByRole('button', {name: 'Test from this page'}).click();
  await expect(browser.getByText(/does not allow this site yet/)).toBeVisible();
});

test('the wrong key is named; the right one names hermes-agent; Hermes becomes NOVA\'s brain with its key sealed, never in storage', async ({page}) => {
  await mockHermes(page, 'up');
  await seed(page);
  let panel = await connect(page, 'cd'.repeat(32));
  await expect(panel.getByText('Hermes refused the key.').first()).toBeVisible();
  panel = await connect(page);
  await expect(panel.getByText(/Hermes 0\.22\.5 is reachable on this computer: hermes-agent answered in \d+ ms\./)).toBeVisible();
  await panel.getByRole('button', {name: 'Use Hermes as NOVA’s brain'}).click();
  await expect(panel.getByText('NOVA and ZIGi now answer with your Hermes (hermes-agent).')).toBeVisible();
  const settings = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), AI_SETTINGS_KEY);
  expect(settings).toMatchObject({enabled: true, provider: 'local', localServer: 'openai-compatible', baseUrl: HERMES, model: 'hermes-agent'});
  expect(await page.evaluate(k => Object.values(localStorage).join('\n').includes(k), KEY)).toBe(false);
  const record = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), NOVA_HERMES_KEY);
  expect(record).toMatchObject({baseUrl: HERMES, model: 'hermes-agent', lastCheck: {reachable: true, model: 'hermes-agent'}});
});

test('privacy: unconfirmed Hermes gets the redacted copy in Strict (preview and the streamed first run); confirming the four checks sends it as it is', async ({page}) => {
  const seen = await mockHermes(page, 'up');
  await seed(page, {[NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: 'strict'})});
  await connect(page);
  const privacy = await open(page, 'Confirm the privacy mode', 'privacy');
  await expect(privacy.locator('.nova-send-line')).toContainText('NOVA is about to send this to your Hermes Agent.');
  await expect(privacy.locator('.nova-send-text')).toContainText('[name]');
  const run = await open(page, 'First run', 'first-run');
  await run.getByRole('button', {name: 'Ask my Hermes'}).click();
  await expect(run.locator('.nova-reply')).toContainText('Monday: review goals. Wednesday: savings check.');
  await expect(run.getByText(/Your Hermes answered in/)).toBeVisible();
  const asked = seen.filter(s => s.url.endsWith('/v1/chat/completions')).at(-1)!;
  expect(asked.auth).toBe(`Bearer ${KEY}`);
  expect(JSON.parse(asked.body!).tools).toBeUndefined();
  expect(asked.body).toContain('Privacy note');
  const again = await open(page, 'Confirm the privacy mode', 'privacy');
  for (const box of await again.getByRole('group', {name: /four hold/}).getByRole('checkbox').all()) await box.check();
  await again.getByRole('button', {name: 'My Hermes runs a local model'}).click();
  await expect(again.locator('.nova-send-line')).toContainText('This stays on this computer');
  await again.getByRole('button', {name: 'Check the rule holds'}).click();
  await expect(again.getByText(/Strict: your Hermes gets your words as they are\./)).toBeVisible();
});

test('the summary for Hermes: shown first, saved as SKILL.md on the device, nothing sent', async ({page}) => {
  const seen = await mockHermes(page, 'up');
  await seed(page, {[NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: 'guarded'})});
  const further = await open(page, 'Go further', 'further');
  await expect(further.locator('pre').first()).toContainText('name: zigoals-summary');
  const before = seen.length;
  const download = page.waitForEvent('download');
  await further.getByRole('button', {name: 'Save as SKILL.md'}).click();
  expect((await download).suggestedFilename()).toMatch(/SKILL\.md$/);
  expect(seen.length).toBe(before);
  await further.getByRole('checkbox', {name: /listed “zigoals-summary”/}).check();
  await further.getByRole('button', {name: /Check it worked/}).click();
  await expect(further.getByText(/is a skill in your Hermes\. Nothing was sent by ZIGoals\./)).toBeVisible();
});
