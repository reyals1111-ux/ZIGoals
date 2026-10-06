import {expect, test, type Page, type Request} from '@playwright/test';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {closeMore, navLink} from './phone-nav';

/**
 * Session V Part 17: ZIGoals hosted in the app. In every build without NEXT_PUBLIC_ZIGI_HOSTED=on (today: all of them),
 * the app never asks /api/zigi and shows nothing. In a hosted build (run with ZIGI_HOSTED_BUILD=on against one), a
 * signed-in, invited account sees the card, reads the disclosure, agrees, and ZIGi answers through /api/zigi only, with
 * the reply labelled "via ZIGoals hosted"; an account that is not invited, or a paused relay, shows nothing. Accounts
 * and the relay are fixtures (a MOCK reply); nothing leaves the browser.
 */
const HOSTED = process.env.ZIGI_HOSTED_BUILD === 'on';
const account = '10000000-0000-4000-8000-000000000001';
/** Accounts as in push-reminders.spec.ts: a fixture cloud that also takes the vault, so the account's records unlock. */
async function fixtureAccount(page: Page) {
  let signedIn = false, revision = 0, manifest: unknown = null;
  const rows = new Map<string, {id: string}>();
  await page.route('**/api/private-account*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET') {
      const action = url.searchParams.get('action');
      if (action === 'status') return route.fulfill({json: signedIn ? {signedIn: true, accountId: account} : {signedIn: false}});
      if (action === 'sessions') return route.fulfill({json: {sessions: []}});
      if (action === 'rotation') return route.fulfill({json: {rotation: null}});
      const ids = url.searchParams.get('ids')?.split(',');
      return route.fulfill({json: {protocol: 1, revision, manifest, records: [...rows.values()].filter(row => !ids || ids.includes(row.id)), cursor: null}});
    }
    const body = request.postDataJSON();
    if (body.action === 'verify') { signedIn = true; return route.fulfill({json: {signedIn: true, accountId: account}}); }
    if (body.action === 'session') return route.fulfill({json: {registered: true, id: '30000000-0000-4000-8000-000000000003'}});
    if (body.action === 'sync') {
      const op = body.operation;
      if (op.base !== revision) return route.fulfill({status: 409, json: {error: 'REVISION_CONFLICT'}});
      for (const row of op.changes ?? []) rows.set(row.id, row);
      if (op.manifest) manifest = op.manifest;
      revision = op.base + 1;
      return route.fulfill({json: {revision}});
    }
    return route.fulfill({json: {message: 'Fixture code requested; no email sent.'}});
  });
}
async function signIn(page: Page) {
  await page.getByLabel('Email address', {exact: true}).fill('fixture@example.com');
  await page.getByRole('button', {name: 'Send email code', exact: true}).click();
  await page.getByLabel('Email code', {exact: true}).fill('123456');
  await page.getByRole('button', {name: 'Verify email code', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Encrypted account sync', exact: true})).toBeVisible();
}
/** Sign in and create the vault, which unlocks the account's records on this tab (a full page load locks them again). */
async function signInAndUnlock(page: Page) {
  await signIn(page);
  await page.getByRole('button', {name: 'Turn on encrypted sync (recommended)', exact: true}).click();
  await expect(page.getByLabel('New vault recovery secret', {exact: true})).not.toHaveValue('');
  await page.getByLabel('I saved this vault recovery secret separately.').check();
  await page.getByRole('button', {name: 'Confirm and create vault', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
}
async function go(page: Page, name: string, path: string) { await (await navLink(page, name)).click(); await page.waitForURL(`**${path}`); }
const SSE = 'data: {"id":"m","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"MOCK: about ten minutes a day this month."},"finish_reason":"stop"}]}\n\ndata: {"id":"m","object":"chat.completion.chunk","choices":[],"usage":{"prompt_tokens":400,"completion_tokens":12}}\n\ndata: [DONE]\n\n';
/** A MOCK relay behind /api/zigi: the entitlement it answers, and every chat body it receives. */
async function relay(page: Page, entitlement: unknown) {
  const chats: {body: unknown; account: string | null}[] = [];
  await page.route('**/api/zigi', async route => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({json: entitlement});
    chats.push({body: request.postDataJSON(), account: request.headers()['x-zigoals-account'] ?? null});
    return route.fulfill({status: 200, contentType: 'text/event-stream', body: SSE});
  });
  return chats;
}
const INVITED = {entitled: true, provider: 'OpenAI', model: 'gpt-6-luna', remaining: {requests: 40, tokens: 150000}};
async function settingsAt(page: Page, anchor: string) { await page.goto('/app'); await page.goto(`/app/settings#${anchor}`); }
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
test.beforeEach(async ({page}) => { await page.route('**/api/push*', route => route.fulfill({status: 503, json: {error: 'PUSH_UNAVAILABLE'}})); });

test('a build without ZIGoals hosted never asks /api/zigi and shows no hosted choice', async ({page}) => {
  test.skip(HOSTED, 'the hosted build is checked by the tests below');
  const asked: Request[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/zigi') asked.push(request); });
  await fixtureAccount(page);
  await page.goto('/app/settings');
  await signIn(page);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await expect(panel(page)).toBeVisible();
  await page.goto('/app/settings#your-ai');
  await expect(page.locator('details#zigi-setup')).toBeAttached();
  await expect(page.locator('details#zigi-hosted')).toHaveCount(0);
  expect(asked).toEqual([]);
});

test('an invited account: the disclosure first, then ZIGi answers through /api/zigi only, labelled "via ZIGoals hosted"', async ({page}) => {
  test.skip(!HOSTED, 'needs a build made with NEXT_PUBLIC_ZIGI_HOSTED=on (ZIGI_HOSTED_BUILD=on)');
  const chats = await relay(page, INVITED);
  const outside: string[] = [];
  page.on('request', request => { const host = new URL(request.url()).hostname; if (/openai|anthropic|googleapis|x\.ai|openrouter/.test(host)) outside.push(request.url()); });
  await fixtureAccount(page);
  await page.goto('/app/settings');
  await expect(page.getByRole('button', {name: 'Send email code', exact: true})).toBeEnabled();
  await expect(page.locator('details#zigi-hosted')).toHaveCount(0);
  await signInAndUnlock(page);
  const card = page.locator('details#zigi-hosted');
  await card.locator('summary').click();
  await expect(card).toHaveAttribute('open', '');
  await expect(card).toContainText('Invite only · free during Alpha');
  await expect(card).toContainText('pass through ZIGoals\' server to OpenAI (gpt-6-luna)');
  await expect(card).toContainText('ZIGoals stores none of it and logs none of it');
  const health = card.getByRole('checkbox', {name: /Also let Health go to ZIGoals hosted/});
  await expect(health).not.toBeChecked();
  expect(chats).toEqual([]);
  await card.getByRole('button', {name: 'I agree, use ZIGoals hosted'}).click();
  await expect(card).toContainText('In use, without Health.');
  const options = await page.evaluate(k => { for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i)!; if (key.endsWith(k)) return JSON.parse(localStorage.getItem(key)!); } return null; }, AI_OPTIONS_KEY);
  expect(options).toMatchObject({version: 1, route: 'hosted', hostedConsent: {health: false}});
  await go(page, 'Habits', '/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await expect(panel(page)).toContainText('OpenAI · gpt-6-luna via ZIGoals hosted');
  await panel(page).getByLabel('Message to your AI').fill('How did my habits go this month?');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  const reply = panel(page).locator('.ai-turn-assistant').last();
  await expect(reply).toContainText('MOCK: about ten minutes a day this month.');
  await expect(reply).toContainText('Answer from OpenAI via ZIGoals hosted');
  expect(chats).toHaveLength(1);
  expect(chats[0]!.account).toBe(account);
  expect(chats[0]!.body).toMatchObject({stream: true, messages: expect.arrayContaining([expect.objectContaining({role: 'user', content: 'How did my habits go this month?'})])});
  expect(outside).toEqual([]);
  // "Stop using ZIGoals hosted" goes back to the person's own setup.
  await panel(page).getByRole('button', {name: 'Close ZIGi', exact: true}).click();
  await go(page, 'Settings', '/app/settings');
  await closeMore(page);
  await page.locator('details#zigi-hosted summary').click();
  await page.locator('details#zigi-hosted').getByRole('button', {name: 'Stop using ZIGoals hosted'}).click();
  await expect(page.locator('details#zigi-hosted')).toContainText('ZIGoals hosted is off.');
  // Settings' open vault is a private screen (ZIGi's button hides there); back on Habits.
  await go(page, 'Habits', '/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  // The header says so; the reply already given keeps its hosted label.
  await expect(panel(page).locator('.ai-chat-via-text')).toHaveText('not connected yet');
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('via ZIGoals hosted');
});

test('an account that is not invited, or a paused relay, sees no hosted choice', async ({page}) => {
  test.skip(!HOSTED, 'needs a build made with NEXT_PUBLIC_ZIGI_HOSTED=on (ZIGI_HOSTED_BUILD=on)');
  for (const answer of [{entitled: false, reason: 'not-invited'}, {entitled: false, reason: 'paused'}]) {
    await page.unrouteAll();
    await page.route('**/api/push*', route => route.fulfill({status: 503, json: {error: 'PUSH_UNAVAILABLE'}}));
    await relay(page, answer);
    await fixtureAccount(page);
    await page.goto('/app/settings');
    await signIn(page);
    await settingsAt(page, 'your-ai');
    await expect(page.locator('details#zigi-setup')).toBeAttached();
    await expect(page.locator('details#zigi-hosted'), JSON.stringify(answer)).toHaveCount(0);
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  }
});
