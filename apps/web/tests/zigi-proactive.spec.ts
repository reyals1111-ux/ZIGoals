import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY, ZIGI_KEY} from '../lib/ai/store/keys';
import {SAY_IT_NICER} from '../lib/ai/proactive/brief';
import {REFLECT_ASK} from '../lib/ai/proactive/review';

/**
 * Session V Part 9: ZIGi's proactive side through the real panel, against a MOCK local OpenAI-compatible server. The
 * brief and the chips are made on the device; a chip hidden for today is the only write; "Say it nicer", the reflection
 * and "Ask ZIGi about this" send nothing until the person clicks, and the brief card on Today appears only with ZIGi on.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
type Body = {messages: {role: string; content: unknown}[]};
async function server(page: Page) {
  const bodies: Body[] = [];
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { bodies.push(JSON.parse(route.request().postData() ?? '{}') as Body); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('MOCK: a calm reply.')}); }
    return route.fulfill({status: 404, body: ''});
  });
  return bodies;
}
async function seed(page: Page, settings: Partial<AiSettings> | null, extra: Record<string, string> = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const ai = settings ? {[AI_SETTINGS_KEY]: JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, ...settings}), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'})} : {};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...ai, ...extra});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
const stored = (page: Page, key: string) => page.evaluate(k => { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v) as Record<string, any>; }, key); // eslint-disable-line @typescript-eslint/no-explicit-any
const systemOf = (body: Body) => String(body.messages[0]!.content);
/** Session Z-Cloud Part 2: the brief, Your week and Patterns wait in the Suggestions sheet's "Your day" tab, the chips in "Ideas". */
async function sheetTab(page: Page, name: 'Ideas' | 'Your day' | 'Yours') {
  const sheet = panel(page).getByRole('region', {name: 'Suggestions for you'});
  if (!await sheet.isVisible()) await panel(page).getByRole('button', {name: 'Suggestions', exact: true}).click();
  await sheet.getByRole('tab', {name}).click();
  return sheet;
}
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('the greeting: a brief and chips from the records, made on the device; hiding a chip is the only write; "Say it nicer" sends the brief only on click', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {});
  await page.goto('/app');
  await openChat(page);
  await sheetTab(page, 'Your day');
  const brief = panel(page).getByRole('region', {name: 'Your morning brief'});
  await expect(brief).toContainText('Your day, from your records');
  await expect(brief).toContainText('Made on this device from your records · no AI used');
  for (const line of await brief.locator('li').allTextContents()) expect(line).toMatch(/^(Still open today: |From yesterday: |One to start with: |Coming up: )/);
  await sheetTab(page, 'Ideas');
  const chips = panel(page).getByRole('group', {name: 'Suggestions'});
  await expect(chips.getByRole('button').first()).toBeVisible();
  expect(bodies).toEqual([]);
  expect(await stored(page, ZIGI_KEY)).toBeNull();
  // A chip from the records can be hidden for today; T's starters always fill the row.
  const hide = chips.getByRole('button', {name: /^Hide for today: /}).first();
  const hidden = (await hide.getAttribute('aria-label'))!.replace('Hide for today: ', '');
  await hide.click();
  await expect(chips.getByRole('button', {name: hidden, exact: true})).toHaveCount(0);
  expect((await stored(page, ZIGI_KEY))!.dismissed).toEqual({day: DAY, ids: [expect.any(String)]});
  expect(await chips.getByRole('button').count()).toBeGreaterThanOrEqual(3);
  // "Say it nicer": the exact data is shown first, then sent with the request on click.
  await sheetTab(page, 'Your day');
  await brief.getByText('What “Say it nicer” sends').click();
  const shown = await brief.locator('pre').textContent();
  await brief.getByRole('button', {name: 'Say it nicer'}).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]!.messages.at(-1)).toEqual({role: 'user', content: SAY_IT_NICER});
  expect(systemOf(bodies[0]!)).toContain(shown!.split('\n')[1]!);
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: a calm reply.');
});

test('your week and patterns, on the device; the reflection goes to the AI only on click, with the figures shown first', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {});
  await page.goto('/app');
  await openChat(page);
  await sheetTab(page, 'Your day');
  await panel(page).getByRole('button', {name: 'Your week', exact: true}).click();
  const week = panel(page).getByRole('region', {name: 'Your week with ZIGi'});
  await expect(week).toContainText(/Your review week, \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}, read on this device/);
  await expect(week).toContainText('habit check-ins');
  await expect(week.getByRole('table')).toBeVisible();
  await expect(week).toContainText('Health is not part of this review');
  await week.getByText('What the reflection request sends').click();
  await expect(week.locator('pre')).toContainText("## My review week (figures from ZIGi's tools on this device)");
  expect(bodies).toEqual([]);
  await week.getByRole('button', {name: 'Ask my AI for a reflection'}).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]!.messages.at(-1)).toEqual({role: 'user', content: REFLECT_ASK});
  expect(systemOf(bodies[0]!)).toContain('"tool":"weekly_review"');
  await panel(page).getByRole('button', {name: 'New chat'}).click();
  await sheetTab(page, 'Your day');
  await panel(page).getByRole('button', {name: 'Patterns', exact: true}).click();
  const patterns = panel(page).getByRole('region', {name: 'Patterns in your records'});
  await expect(patterns).toContainText('A pattern in your own records, not proof of a cause.');
  await expect(patterns).toContainText('Only pairings with at least 14 paired days in the last 60, and at least 5 days on each side.');
  await patterns.getByRole('button', {name: 'Back to the chat'}).click();
  await expect(panel(page).locator('.ai-greeting-text')).toBeVisible();
  await sheetTab(page, 'Your day');
  await expect(panel(page).getByRole('region', {name: 'Your morning brief'})).toBeVisible();
});

test('"Ask ZIGi about this" from a number\'s menu: the question and a removable chip, nothing sent before Send; gone when the launcher hides', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {});
  await page.goto('/app/wealth');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.zigiLauncher ?? '')).toBe('shown');
  const total = page.locator('.wealth-hero-total');
  await total.getByRole('button', {name: /^Options for/}).click();
  await total.getByRole('button', {name: 'Ask ZIGi about this'}).click();
  await expect(panel(page)).toBeVisible();
  await expect(page.getByLabel('Message to your AI')).toHaveValue('What is my net worth?');
  await expect(panel(page).getByRole('group', {name: 'Records ZIGi chose for this question'})).toContainText('Wealth totals');
  expect(bodies).toEqual([]);
  // The launcher hidden: the root mark goes, and the menu offers no "Ask ZIGi".
  await page.evaluate(([key]) => { const s = JSON.parse(localStorage.getItem(key!)!); localStorage.setItem(key!, JSON.stringify({...s, launcherHidden: true})); }, [AI_SETTINGS_KEY]);
  await page.reload();
  await expect(page.getByTestId('ai-launcher')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.dataset.zigiLauncher ?? null)).toBeNull();
  await page.locator('.wealth-hero-total').getByRole('button', {name: /^Options for/}).click();
  await expect(page.locator('.wealth-hero-total').getByRole('button', {name: 'Ask ZIGi about this'})).toHaveCount(0);
});

test('Today: the brief card only with ZIGi on, at the lowest priority; "Not today" hides it for the day; nothing written on view', async ({page}) => {
  await seed(page, {});
  await page.goto('/app');
  const forYou = page.getByRole('region', {name: 'For you'});
  await expect(forYou).toBeVisible();
  const showMore = forYou.getByRole('button', {name: /^Show more/});
  if (await showMore.count()) await showMore.click();
  const card = forYou.getByRole('article', {name: "ZIGi's morning brief"});
  await expect(card).toContainText('Made on this device from your records · no AI used');
  expect(await stored(page, ZIGI_KEY)).toBeNull();
  await card.getByRole('button', {name: 'Not today'}).click();
  await expect(card).toHaveCount(0);
  expect((await stored(page, ZIGI_KEY))!.dismissed).toEqual({day: DAY, ids: ['brief']});
  // ZIGi off (and nothing hidden): no card at all.
  await page.evaluate(keys => { for (const k of keys) localStorage.removeItem(k); }, [AI_SETTINGS_KEY, ZIGI_KEY]);
  await page.reload();
  await expect(page.getByRole('region', {name: 'For you'})).toBeVisible();
  await expect(page.getByRole('article', {name: "ZIGi's morning brief"})).toHaveCount(0);
});

test('with no AI connected the panel still shows the brief, your week and patterns, all on the device', async ({page}) => {
  await seed(page, null);
  await page.goto('/app');
  await openChat(page);
  await sheetTab(page, 'Your day');
  await expect(panel(page).getByRole('region', {name: 'Your morning brief'})).toBeVisible();
  await expect(panel(page).getByRole('region', {name: 'Your morning brief'}).getByRole('button', {name: 'Say it nicer'})).toHaveCount(0);
  await panel(page).getByRole('button', {name: 'Your week', exact: true}).click();
  await expect(panel(page).getByRole('region', {name: 'Your week with ZIGi'})).toContainText('read on this device');
  await expect(panel(page).getByRole('button', {name: 'Ask my AI for a reflection'})).toHaveCount(0);
});
