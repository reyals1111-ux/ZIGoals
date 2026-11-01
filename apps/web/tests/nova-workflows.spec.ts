import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_MEMORY_KEY, AI_USAGE_KEY} from '../lib/ai/store/keys';
import {NOVA_SETUP_KEY} from '../lib/nova/setup';
import {NOVA_BRIEFS_KEY} from '../lib/nova/briefs';
import {NOVA_WORKFLOWS_KEY} from '../lib/nova/workflows/schema';

/**
 * Session AK (owner follow-up 2, N6/N7/N2): NOVA's workflows, memory and cost meter end to end with a MOCK local model
 * (OpenAI-compatible on 127.0.0.1:1234, answered by page.route; nothing leaves the browser). The panels open from
 * `/app/nova#nova-<panel>` (the mount contract of components/nova/panels/nova-panels.tsx `panelFromHash`; lane NA mounts
 * them on the dashboard), the briefs at `/app/nova#briefs`.
 */
const LOCAL_BASE = 'http://127.0.0.1:1234';
const SHOWCASE_EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null, usage?: Record<string, number>) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}], ...(usage ? {usage} : {})})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop', {prompt_tokens: 300, completion_tokens: 40}), 'data: [DONE]\n\n'].join('');
const connectedLocal = (): AiSettings => ({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: LOCAL_BASE});
async function seed(page: Page, extra: Record<string, unknown> = {}) {
  await page.clock.install({time: SHOWCASE_EVENING});
  await page.goto('/app/settings');
  const records = buildShowcase('2026-09-20').records;
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    ...records,
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}),
    [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    [AI_SETTINGS_KEY]: JSON.stringify(connectedLocal()),
    [NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: 'strict'}),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, JSON.stringify(v)])),
  });
}
/** The MOCK local server: the model list, and words with no number of their own for every chat request. */
async function mockLocal(page: Page, sent: string[] = []) {
  await page.route(`${LOCAL_BASE}/**`, async route => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}, {id: 'mock-small'}]})});
    if (url.endsWith('/v1/chat/completions')) { sent.push(route.request().postData() ?? ''); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('A steady week. Your habits held, a goal step is coming up, and your evenings could use a little more rest.')}); }
    return route.fulfill({status: 404, body: ''});
  });
  return sent;
}
const external: string[] = [];
test.beforeEach(async ({page}) => {
  external.length = 0;
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:(?:3\d{3}|1234))/, route => { external.push(route.request().url()); return route.abort(); });
});
test.afterEach(() => { expect(external.filter(u => !/fonts\.g|localhost/.test(u))).toEqual([]); });

test('"Review my week" with a MOCK local model: steps show live, the words are the model\'s, the card is confirmed and undone', async ({page}) => {
  const sent = await mockLocal(page);
  await seed(page);
  await page.goto('/app/nova#nova-workflows');
  const panels = page.getByRole('region', {name: 'Workflows'});
  await panels.getByRole('button', {name: 'Run Review my week and suggest three adjustments'}).click();
  const run = page.getByRole('region', {name: 'Review my week and suggest three adjustments'});
  await expect(run.getByRole('heading', {name: 'Review my week and suggest three adjustments'})).toBeFocused();
  const habitsStep = run.locator('.nova-wf-step').filter({hasText: 'Read your habits of the last seven days'});
  await expect(habitsStep).toHaveAttribute('data-state', 'done');
  await expect(habitsStep).toContainText(/done on \d+ of \d+ scheduled days/);
  await expect(run.getByText('WORDED BY YOUR LOCAL MODEL')).toBeVisible();
  await expect(run.getByText('A steady week.')).toBeVisible();
  // Only records left the page for the local model; Health is not shared, so no sleep line went with them.
  expect(sent).toHaveLength(1);
  expect(sent[0]).toContain('Records (made on the device)');
  expect(sent[0]).not.toContain('Sleep:');
  // The card goes through ZIGi's one engine: nothing is written until Add; Undo takes it back.
  const cards = run.getByLabel('Cards from Review my week and suggest three adjustments');
  await expect(cards.getByRole('button', {name: /^(Add|Apply)$/})).toBeVisible();
  await cards.getByRole('button', {name: /^(Add|Apply)$/}).click();
  await expect(cards.getByRole('button', {name: /^Undo/})).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), 'zigoals:ai-actions:v1')).toContain('review-intention');
  await cards.getByRole('button', {name: /^Undo/}).click();
  await expect(cards.getByRole('button', {name: /^Undo/})).toBeHidden();
  expect(await page.evaluate(k => localStorage.getItem(k) ?? '', 'zigoals:ai-actions:v1')).not.toContain('review-intention');
  // The run is noted for the setup guide's check.
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), NOVA_WORKFLOWS_KEY))!).runs['review-week']).toBeTruthy();
});

test('a template saved as my own, exported without personal words', async ({page}) => {
  await mockLocal(page);
  await seed(page);
  await page.goto('/app/nova#nova-workflows');
  const panels = page.getByRole('region', {name: 'Workflows'});
  await panels.getByRole('button', {name: 'Edit and save as your own: Where did my money go this month?'}).click();
  await panels.getByLabel('Name').fill('Money for jane@example.com');
  await panels.getByRole('button', {name: 'Save'}).click();
  await expect(panels.getByText('Saved as your own workflow.')).toBeVisible();
  const download = page.waitForEvent('download');
  await panels.getByRole('button', {name: 'Export my workflows'}).click();
  const file = await (await download).path();
  const text = await (await import('node:fs/promises')).readFile(file!, 'utf8');
  expect(text).toContain('zigoals-nova-workflows');
  expect(text).not.toContain('jane@example.com');
});

test('Memory: remember a person, pin it, forget it and undo; one memory with ZIGi', async ({page}) => {
  await seed(page);
  await page.goto('/app/nova#nova-memory');
  // Exactly "Memory": the right panel's "05 Memory and scopes" section is a region too, with its own empty line (lane NV).
  const panels = page.getByRole('region', {name: 'Memory', exact: true});
  await expect(panels.getByText('Nothing remembered yet.')).toBeVisible();
  await panels.getByLabel('Kind').first().selectOption('person');
  // Session AH Part 2 (AF16, as tests/zigi-af.ts fillComposer): a fill that lands while the panel re-renders just after it
  // opens can be reset to empty (seen here 2 runs in 6 on 3101; the same textarea, its React state never got the text), so
  // the words are filled until the box holds them and Remember is enabled, then pressed once (lane NV).
  const what = panels.getByLabel('What to remember'), remember = panels.getByRole('button', {name: 'Remember'});
  await expect(async () => { await what.fill('Sam is my running partner'); await expect(what).toHaveValue('Sam is my running partner', {timeout: 1_000}); await expect(remember).toBeEnabled({timeout: 1_000}); }).toPass({timeout: 15_000});
  await remember.click();
  await expect(panels.getByRole('heading', {name: /People/})).toBeVisible();
  await expect(panels.getByText(/Written by you · NOVA/)).toBeVisible();
  await panels.getByRole('button', {name: 'Pin "Sam is my running partner"'}).click();
  await expect(panels.getByRole('heading', {name: /Pinned/})).toBeVisible();
  const stored = JSON.parse((await page.evaluate(k => localStorage.getItem(k), AI_MEMORY_KEY))!);
  expect(stored.notes[0]).toMatchObject({text: 'Sam is my running partner', category: 'other', source: 'person', kind: 'person', pinned: true});
  await panels.getByRole('button', {name: 'Forget "Sam is my running partner"'}).click();
  await expect(panels.getByText('Nothing remembered yet.')).toBeVisible();
  await panels.getByRole('button', {name: 'Undo'}).click();
  await expect(panels.getByText('Sam is my running partner')).toBeVisible();
  // ZIGi's own notes page reads the same memory.
  await page.goto('/app/settings#zigi-notes');
  await expect(page.getByText('Sam is my running partner').first()).toBeAttached();
});

test('Cost meter: an estimate per provider, the local model free, a daily cap that warns', async ({page}) => {
  const now = new Date(SHOWCASE_EVENING), month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  await seed(page, {[AI_USAGE_KEY]: {version: 1, prices: {openai: {input: '2', output: '8', currency: 'USD'}}, months: {[month]: {openai: {input: 1_000_000, output: 250_000, requests: 4}, local: {input: 5000, output: 900, requests: 3}, gemini: {input: 10, output: 10, requests: 1}}}}});
  await page.goto('/app/nova#nova-cost');
  const panels = page.getByRole('region', {name: 'Cost'});
  await expect(panels.getByText('An estimate, not a bill.')).toBeVisible();
  const table = panels.getByRole('table');
  await expect(table.getByRole('row', {name: /OpenAI/})).toContainText('about 4.00 USD (from your prices)');
  await expect(table.getByRole('row', {name: /Local model/})).toContainText('Free, on your device');
  await expect(table.getByRole('row', {name: /Gemini/})).toContainText('Price unknown — an estimate is not possible');
  await panels.getByLabel('Amount').last().fill('0.5');
  await panels.getByLabel('Amount').last().blur();
  await expect(panels.getByText('Daily cap saved: counting per day starts now.')).toBeVisible();
  await panels.getByLabel('Ask before sending').check();
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), AI_USAGE_KEY))!).dailyCap).toEqual({amount: '0.5', currency: 'USD', mode: 'ask'});
});

test('Briefs: the Showcase\'s morning brief and evening recap are made on the device, kept, and marked read when opened', async ({page}) => {
  await seed(page);
  await page.goto('/app/nova#briefs');
  const briefs = page.locator('#briefs');
  await expect(briefs.getByText(/Morning brief ·/).first()).toBeVisible();
  await expect(briefs.getByText(/Evening recap ·/).first()).toBeVisible();
  await expect(briefs.getByText(/\d+ unread/)).toBeVisible();
  await briefs.getByText(/Evening recap ·/).first().click();
  const stored = JSON.parse((await page.evaluate(k => localStorage.getItem(k), NOVA_BRIEFS_KEY))!);
  expect(stored.briefs.some((b: {kind: string; readAt?: string}) => b.kind === 'evening' && b.readAt)).toBe(true);
});
