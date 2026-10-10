import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {ZIGI_SUGGESTIONS_KEY} from '../lib/z-device-keys';

/**
 * Session Z-Cloud Part 2 (ADR-019): ZIGi's panel, premium and clean, through the real panel on a production build, both
 * projects. One header row at every width (the computer widths on the desktop project, the phone widths on the mobile
 * project); nothing overlaps, sticks out or sits under 44 px; the composer's box, mic and Send share one centre line; a new
 * chat is one greeting and the box, suggestions in their sheet; the person's own frequent questions (device only, Health
 * only while shared, "Forget all"); acted-on cards as one-line receipts; an earlier reply's untouched cards folded. Every
 * AI answer is a MOCK (a local OpenAI-compatible server answered by page.route).
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const TITLE = 'ZIGi · Your Personal AI Companion';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const block = (value: unknown) => `Here you go.\n\n\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
async function server(page: Page, reply: () => string = () => 'MOCK: noted.') {
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply())});
    return route.fulfill({status: 404, body: ''});
  });
}
async function seed(page: Page, ai: Partial<AiSettings> | null, showcase = true) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const values: Record<string, string> = {...(showcase ? buildShowcase(DAY).records : {}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})};
  if (ai) values[AI_SETTINGS_KEY] = JSON.stringify({...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, ...ai});
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page, path = '/app') { await page.goto(path); await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
const box = (page: Page) => panel(page).getByRole('textbox', {name: /^(Message to your AI|Ask ZIGi about your records)$/});
async function say(page: Page, text: string) { await box(page).fill(text); await panel(page).locator('.ai-composer button[type=submit]').click(); }
/** Every visible control's box, the header's rows, the composer's centre line, anything outside the panel. */
async function layout(page: Page) {
  return panel(page).evaluate(root => {
    const rect = (el: Element) => el.getBoundingClientRect();
    const shown = (el: Element) => { const r = rect(el), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden], details:not([open]) > :not(summary)'); };
    const tools = [...root.querySelectorAll('.ai-chat-tools > button, .ai-chat-tools > .ai-more > button')].filter(shown).map(el => { const r = rect(el); return {name: el.getAttribute('aria-label'), mid: (r.top + r.bottom) / 2, w: r.width, h: r.height, tip: el.getAttribute('data-tip')}; });
    const identity = rect(root.querySelector('.ai-chat-identity')!), figure = rect(root.querySelector('.ai-chat-head > .zigi')!), firstTool = rect(root.querySelector('.ai-chat-tools')!);
    const composer = [...root.querySelectorAll('.ai-composer > textarea, .ai-composer > button')].filter(shown).map(el => { const r = rect(el); return (r.top + r.bottom) / 2; });
    const panelBox = rect(root), outside = [...root.querySelectorAll('*')].filter(shown).filter(el => { const r = rect(el); return r.right > panelBox.right + 1 || r.left < panelBox.left - 1; }).map(el => el.className || el.tagName);
    const small = [...root.querySelectorAll('button, a[href], summary, textarea')].filter(shown).filter(el => !el.closest('.ai-more-list[hidden]')).map(el => ({name: el.getAttribute('aria-label') || (el as HTMLElement).innerText.trim().slice(0, 40), w: rect(el).width, h: rect(el).height})).filter(t => t.w < 43.5 || t.h < 43.5);
    return {tools, identityRight: identity.right, figureRight: figure.right, toolsLeft: firstTool.left, composer, outside, small};
  });
}
const WIDTHS = {desktop: [768, 1024, 1440], mobile: [320, 360, 390, 430]} as const;
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('one header row at every width: the full name, glyph buttons with names and tips, nothing overlapping or under 44 px', async ({page}, info) => {
  await server(page);
  await seed(page, {});
  for (const width of WIDTHS[info.project.name as keyof typeof WIDTHS]) {
    await page.setViewportSize({width, height: 860});
    await openChat(page);
    await expect(panel(page)).toHaveAccessibleName(TITLE);
    await expect(panel(page).getByRole('heading', {name: TITLE})).toBeVisible();
    await expect(panel(page).locator('.ai-chat-via-text')).toHaveText('via your local server · mock-chat');
    const l = await layout(page);
    const names = l.tools.map(t => t.name);
    // Pop out shows only where the browser offers Document Picture-in-Picture.
    const pop = names.includes('Pop out ZIGi into a mini window') ? ['Pop out ZIGi into a mini window'] : [];
    expect(names).toEqual(width >= 768 ? ['New chat', 'Expand the chat', ...pop, 'More: history, customize, settings and help', 'Close ZIGi'] : ['New chat', 'More: history, customize, settings and help', 'Close ZIGi']);
    for (const t of l.tools) { expect(t.w, `${t.name} at ${width}`).toBeGreaterThanOrEqual(44); expect(t.h).toBeGreaterThanOrEqual(44); expect(t.tip).toBeTruthy(); }
    expect(Math.max(...l.tools.map(t => t.mid)) - Math.min(...l.tools.map(t => t.mid)), `one row at ${width}`).toBeLessThanOrEqual(1);
    expect(l.figureRight).toBeLessThanOrEqual(l.identityRight);
    expect(l.identityRight, `the title stops before the buttons at ${width}`).toBeLessThanOrEqual(l.toolsLeft + 1);
    expect(Math.max(...l.composer) - Math.min(...l.composer), `the composer's centre line at ${width}`).toBeLessThanOrEqual(1);
    expect(l.outside, `nothing outside the panel at ${width}`).toEqual([]);
    expect(l.small, `targets at ${width}`).toEqual([]);
    await page.keyboard.press('Escape');
    if (await panel(page).count()) await panel(page).getByRole('button', {name: 'Close ZIGi'}).click();
  }
});

test('"⋯" lists History, Customize, Settings, Meet ZIGi, Help and the model; arrows move, Escape closes and gives the focus back', async ({page}) => {
  await server(page);
  await seed(page, {});
  await openChat(page);
  const more = panel(page).getByRole('button', {name: 'More: history, customize, settings and help'});
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  const list = panel(page).getByRole('group', {name: 'More'});
  await expect(list).toBeVisible();
  await expect(list.locator('.ai-more-item')).toHaveText([/^Change model \(mock-chat\)/, 'History', 'Customize', 'Settings', 'Meet ZIGi', 'Help']);
  await expect(list.getByRole('link', {name: 'ZIGi settings'})).toHaveAttribute('href', '/app/settings#your-ai');
  await expect(list.getByRole('link', {name: 'Meet ZIGi'})).toHaveAttribute('href', '/app/zigi');
  await expect(list.getByRole('link', {name: 'Help about ZIGi'})).toHaveAttribute('href', '/app/help#help-your-ai-what');
  await expect(list.locator('summary')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(list.getByRole('button', {name: 'Chat history'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(more).toBeFocused();
  await expect(panel(page)).toBeVisible();
  await more.click();
  await list.getByRole('button', {name: 'Chat history'}).click();
  await expect(list).toBeHidden();
  await expect(panel(page).getByRole('region', {name: 'Chat history'})).toBeVisible();
});

test('a new chat is one short greeting and the box; Ideas, Your day and Yours wait in the Suggestions sheet; a tapped idea is sent', async ({page}) => {
  const bodies: string[] = [];
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    bodies.push(route.request().postData() ?? '');
    return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('MOCK: here is your day.')});
  });
  await seed(page, {});
  await openChat(page);
  await expect(panel(page).locator('.ai-greeting-text')).toHaveText('Hi, I’m ZIGi. Ask about your records or tell me what to log. Nothing is written until you add a card.');
  await expect(panel(page).getByRole('region', {name: 'Your morning brief'})).toHaveCount(0);
  await expect(panel(page).getByRole('group', {name: 'Suggestions'})).toHaveCount(0);
  const chip = panel(page).getByRole('button', {name: 'Suggestions', exact: true});
  await expect(chip).toHaveAttribute('aria-expanded', 'false');
  await chip.click();
  const sheet = panel(page).getByRole('region', {name: 'Suggestions for you'});
  await expect(sheet).toBeVisible();
  const tabs = sheet.getByRole('tab');
  await expect(tabs).toHaveText(['Ideas', 'Your day', 'Yours']);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await tabs.first().focus(); await page.keyboard.press('ArrowRight');
  await expect(sheet.getByRole('tab', {name: 'Your day'})).toBeFocused();
  await expect(sheet.getByRole('region', {name: 'Your morning brief'})).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(sheet.getByRole('tabpanel')).toContainText('Questions you ask three times within a month appear here');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(box(page)).toBeFocused();
  expect(bodies).toHaveLength(0);
  await chip.click();
  const idea = sheet.getByRole('group', {name: 'Suggestions'}).getByRole('button').first();
  const text = (await idea.innerText()).trim();
  await idea.click();
  await expect(sheet).toBeHidden();
  await expect(panel(page).locator('.ai-turn-user').last()).toContainText(text);
  await expect.poll(() => bodies.length).toBe(1);
});

test('not connected: one compact line with "Set up" and "Which setup fits me?", above the box and never over the chat', async ({page}) => {
  await seed(page, null, false);
  await openChat(page);
  const line = panel(page).getByRole('note', {name: 'ZIGi is not connected to an AI'});
  await expect(line).toContainText('Not connected to an AI yet');
  await expect(line.getByRole('link', {name: 'Set up', exact: true})).toHaveAttribute('href', '/app/settings#your-ai');
  await expect(panel(page).locator('.ai-chat-via-text')).toHaveText('not connected yet');
  const [lineBox, logBox, composerBox] = await Promise.all([line.boundingBox(), panel(page).locator('.ai-chat-log').boundingBox(), panel(page).locator('.ai-composer-wrap').boundingBox()]);
  expect(lineBox!.y).toBeGreaterThanOrEqual(logBox!.y + logBox!.height - 1);
  expect(lineBox!.y + lineBox!.height).toBeLessThanOrEqual(composerBox!.y + 1);
  expect(lineBox!.height).toBeLessThanOrEqual(112);
  await expect(box(page)).toHaveAttribute('placeholder', 'Ask about your records');
  await line.getByRole('button', {name: 'Which setup fits me?'}).click();
  await expect(panel(page).getByRole('region', {name: 'Which setup fits me?'})).toBeVisible();
});

test('your own suggestions: three asks within a month make a "Yours" card on this device; pin, remove, Forget all; Health only while shared', async ({page}) => {
  await seed(page, null);
  await openChat(page, '/app/goals');
  const stored = () => page.evaluate(k => localStorage.getItem(k), ZIGI_SUGGESTIONS_KEY);
  // Health is not shared with ZIGi here: a sleep question is never kept.
  for (let i = 0; i < 3; i++) { await say(page, 'How did I sleep this week?'); await expect(panel(page).locator('.ai-turn-user')).toHaveCount(i + 1); }
  expect(await stored()).toBeNull();
  for (let i = 0; i < 2; i++) { await say(page, i ? 'how are my goals going' : 'How are my goals going?'); await expect(panel(page).locator('.ai-turn-user')).toHaveCount(4 + i); }
  await panel(page).getByRole('button', {name: 'Suggestions', exact: true}).click();
  const sheet = panel(page).getByRole('region', {name: 'Suggestions for you'});
  await sheet.getByRole('tab', {name: 'Yours'}).click();
  await expect(sheet.getByRole('list', {name: 'Your own suggestions'})).toHaveCount(0);
  await panel(page).getByRole('button', {name: 'Suggestions', exact: true}).click();
  await say(page, 'How are my goals going??');
  await panel(page).getByRole('button', {name: 'Suggestions', exact: true}).click();
  await sheet.getByRole('tab', {name: 'Yours'}).click();
  const yours = sheet.getByRole('list', {name: 'Your own suggestions'});
  await expect(yours.getByRole('button', {name: /^Yours/})).toHaveText(['Yours How are my goals going??']);
  const record = JSON.parse((await stored())!);
  expect(Object.keys(record.questions)).toEqual(['how are my goals going']);
  expect(record.questions['how are my goals going'].asks).toHaveLength(3);
  await yours.getByRole('button', {name: 'Pin: How are my goals going??'}).click();
  await expect(yours.getByRole('button', {name: 'Unpin: How are my goals going??'})).toHaveAttribute('aria-pressed', 'true');
  expect(JSON.parse((await stored())!).questions['how are my goals going'].pinned).toBe(true);
  // "What ZIGi knows" lists it, with a one-tap "Forget all".
  await page.goto('/app/settings#your-ai');
  const questions = page.getByRole('region', {name: 'Your frequent questions'});
  await page.getByText('What ZIGi knows about me').first().click();
  await expect(questions.getByRole('list', {name: 'Your frequent questions'})).toContainText('How are my goals going??');
  await questions.getByRole('button', {name: 'Forget all'}).click();
  await expect(questions).toContainText('None yet.');
  expect(await stored()).toBeNull();
});

test('acted-on cards are one-line receipts; a newer reply with cards folds the earlier untouched ones', async ({page}) => {
  let turn = 0;
  await server(page, () => ++turn === 1 ? block([{kind: 'log-water', millilitres: 300}, {kind: 'log-water', millilitres: 250}, {kind: 'log-weight', value: 72.5, unit: 'kg'}]) : block([{kind: 'log-water', millilitres: 200}]));
  await seed(page, {includeHealth: true, pageShare: {...defaultAiSettings().pageShare, health: true}});
  await openChat(page, '/app/health');
  await say(page, 'Drank 300 ml and 250 ml, I weigh 72.5 kg');
  const cards = panel(page).locator('.ai-card');
  await expect(cards).toHaveCount(3);
  await cards.nth(0).getByRole('button', {name: 'Add', exact: true}).click();
  // While its Undo window is open the added card keeps its size, so the Undo below it stays where it was (ADR-019 C32);
  // nothing is left to choose on it but Undo.
  await expect(cards.nth(0)).toHaveClass(/ai-card-added/);
  await expect(cards.nth(0)).not.toHaveClass(/ai-card-receipt/);
  await expect(cards.nth(0).locator('.ai-card-actions .ai-card-status')).toHaveText('Added');
  await expect(cards.nth(0).getByRole('button')).toHaveCount(0);
  const undo = panel(page).getByRole('button', {name: /^Undo · \d+ s$/});
  await expect(undo).toBeVisible();
  const at = (await undo.boundingBox())!;
  await page.waitForTimeout(600);
  expect((await undo.boundingBox())!.y).toBe(at.y);
  // When the window ends it folds into its one-line receipt.
  await expect(cards.nth(0)).toHaveClass(/ai-card-receipt/, {timeout: 15_000});
  await expect(cards.nth(0)).toHaveText(/^✓\s*Added\s*Add water$/);
  expect((await cards.nth(0).boundingBox())!.height).toBeLessThanOrEqual(64);
  await cards.nth(1).getByRole('button', {name: 'Dismiss', exact: true}).click();
  await expect(cards.nth(1)).toHaveClass(/ai-card-receipt/);
  await expect(cards.nth(1).locator('.ai-card-status')).toHaveText('Dismissed');
  await expect(cards.nth(2).getByRole('button', {name: 'Add', exact: true})).toBeVisible();
  await say(page, 'And 200 ml');
  await expect(panel(page).locator('.ai-turn-assistant')).toHaveCount(2);
  const earlier = panel(page).locator('.ai-proposals-earlier');
  await expect(earlier).toHaveCount(1);
  await expect(earlier.locator('summary')).toHaveText('One earlier card, not added');
  await expect(earlier.getByRole('button', {name: 'Add', exact: true})).toBeHidden();
  await expect(panel(page).locator('.ai-turn-assistant').last().getByRole('button', {name: 'Add', exact: true})).toBeVisible();
  await earlier.locator('summary').click();
  await expect(earlier.getByRole('button', {name: 'Add', exact: true})).toBeVisible();
});

test('on a 768 px tablet the top bar never sits over the panel: every header button takes its click', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'the ≤900 px top bar is a computer layout');
  await server(page);
  await seed(page, {});
  await page.setViewportSize({width: 768, height: 860});
  await openChat(page);
  for (const name of ['New chat', 'Expand the chat', 'More: history, customize, settings and help']) {
    const button = panel(page).getByRole('button', {name});
    const b = (await button.boundingBox())!;
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.closest('dialog.ai-chat') !== null, [b.x + b.width / 2, b.y + b.height / 2])).toBe(true);
  }
  await panel(page).getByRole('button', {name: 'More: history, customize, settings and help'}).click();
  await panel(page).getByRole('button', {name: 'Customize ZIGi'}).click();
  await expect(panel(page).getByRole('region', {name: 'Customize ZIGi'})).toBeVisible();
});
