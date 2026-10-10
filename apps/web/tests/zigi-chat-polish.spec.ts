import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_MEMORY_KEY, AI_OPTIONS_KEY, ZIGI_KEY} from '../lib/ai/store/keys';
import {PLAN_NOTE, SLASH_COMMANDS} from '../lib/ai/slash';
import {LOCAL_LABEL} from '../lib/ai/local-answers/words';

/**
 * Session V Part 10, chat polish, through the real panel against a MOCK local OpenAI-compatible server: the "/" list and
 * the commands, editing the last question, the person's own note on an answer (never sent), copy as Markdown, follow-up
 * chips and a chart drawn from the records, "Continue in my AI" with the exact text shown first, jump to the latest
 * message, the shortcuts sheet, first-run tips, History's Pinned section and page filter, and tables in replies with no
 * way to run anything. Every answer is a MOCK; on both projects.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
type Body = {messages: {role: string; content: unknown}[]};
async function server(page: Page, reply: (body: Body) => string = () => 'MOCK: noted.') {
  const bodies: Body[] = [];
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { const body = JSON.parse(route.request().postData() ?? '{}') as Body; bodies.push(body); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply(body))}); }
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
const box = (page: Page) => panel(page).getByRole('textbox', {name: /^(Message to your AI|Ask ZIGi about your records)$/});
/** Sends what is in the box with the composer's own button (on phones Enter adds a line, by design). */
const submit = (page: Page) => panel(page).locator('.ai-composer button[type=submit]').click();
const say = async (page: Page, text: string) => { await box(page).fill(text); await submit(page); };
/** The words of the person's last message (its "Edit" button aside). */
const lastAsked = (page: Page) => panel(page).locator('.ai-turn-user').last();
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('the "/" list: every command by keyboard; /help and /remember answer on the device, /plan asks for cards, /ask skips the local answer', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {});
  await page.goto('/app');
  await openChat(page);
  await box(page).fill('/');
  const list = panel(page).getByRole('listbox', {name: 'Commands'});
  await expect(list.getByRole('option')).toHaveCount(SLASH_COMMANDS.length);
  await expect(box(page)).toHaveAttribute('aria-controls', (await list.getAttribute('id'))!);
  await box(page).fill('/r');
  await expect(list.getByRole('option')).toHaveText([/^\/review/, /^\/remember/]);
  await box(page).press('ArrowDown');
  await expect(list.getByRole('option', {name: /^\/remember/})).toHaveAttribute('aria-selected', 'true');
  await box(page).press('Enter');
  await expect(box(page)).toHaveValue('/remember ');
  await expect(list).toHaveCount(0);
  // Escape closes the list and leaves the panel open.
  await box(page).fill('/he');
  await expect(list).toBeVisible();
  await box(page).press('Escape');
  await expect(list).toHaveCount(0); await expect(panel(page)).toBeVisible();
  // /help: the commands, answered here.
  await say(page, '/help');
  const help = panel(page).locator('.ai-turn-local').last();
  for (const c of SLASH_COMMANDS) await expect(help).toContainText(`${c.name}: ${c.hint}.`);
  await expect(help).toContainText(LOCAL_LABEL);
  // /remember: a card first, the note only after "Remember".
  await say(page, '/remember I train before work');
  const card = panel(page).locator('.ai-card').last();
  await expect(card.getByRole('heading', {name: 'Remember this?'})).toBeVisible();
  await expect(card).toContainText('I train before work');
  expect(await stored(page, AI_MEMORY_KEY)).toBeNull();
  await card.getByRole('button', {name: 'Remember', exact: true}).click();
  await expect(card).toContainText('Remembered: in What ZIGi knows about me');
  expect((await stored(page, AI_MEMORY_KEY))!.notes).toEqual([expect.objectContaining({text: 'I train before work', source: 'zigi'})]);
  expect(bodies).toEqual([]);
  // /plan: the message goes with the planning note; /ask: a lookup goes to the AI instead of being answered here.
  await say(page, '/plan run a 10k in spring');
  await expect.poll(() => bodies.length).toBe(1);
  expect(systemOf(bodies[0]!)).toContain(PLAN_NOTE);
  expect(bodies[0]!.messages.at(-1)).toEqual({role: 'user', content: 'run a 10k in spring'});
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: noted.');
  await say(page, '/ask How much water did I drink today?');
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1]!.messages.at(-1)).toEqual({role: 'user', content: 'How much water did I drink today?'});
  // The questions answered here never reach the AI later.
  expect(JSON.stringify(bodies[1])).not.toContain('/help');
});

// Phase 2 (P2.2b): the asks are lookups, not plans — a plan asked of a model that answers without a card gets the one repair round, which this test is not about.
test('edit the last question: ↑ or "Edit" puts it back, sending replaces it and its answer; Escape cancels', async ({page}) => {
  const bodies = await server(page, body => `MOCK: you said ${String(body.messages.at(-1)!.content)}`);
  await seed(page, {});
  await page.goto('/app');
  await openChat(page);
  await say(page, 'Tell me about my week');
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: you said Tell me about my week');
  await box(page).press('ArrowUp');
  await expect(box(page)).toHaveValue('Tell me about my week');
  await expect(panel(page).getByText('Editing your last message')).toBeVisible();
  await box(page).press('Escape');
  await expect(box(page)).toHaveValue(''); await expect(panel(page)).toBeVisible();
  await panel(page).getByRole('button', {name: 'Edit your last message'}).click();
  await expect(box(page)).toHaveValue('Tell me about my week');
  await say(page, 'Tell me about my weekend');
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: you said Tell me about my weekend');
  await expect(panel(page).locator('.ai-turn-user')).toHaveCount(1);
  await expect(lastAsked(page)).toHaveText('Tell me about my weekend');
  expect(bodies.at(-1)!.messages.filter(m => m.role !== 'system').map(m => m.content)).toEqual(['Tell me about my weekend']);
});

test('around an answer: its time, the person\'s own note (kept here, never sent), copy as Markdown, Continue in my AI', async ({page, context, browserName}) => {
  test.skip(browserName === 'webkit', 'Playwright grants no clipboard permission in WebKit: the copy checks run in Chrome and in a real Safari by hand');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const bodies = await server(page, () => 'MOCK: **two** things to try.');
  await seed(page, {});
  await page.goto('/app');
  await openChat(page);
  await say(page, 'What should I focus on?');
  const reply = panel(page).locator('.ai-turn-assistant').last();
  await expect(reply).toContainText('MOCK: two things to try.');
  await expect(reply.locator('time')).toHaveAttribute('datetime', /^2026-09-20T19:/);
  const note = reply.getByRole('group', {name: 'Your own note on this answer (kept on this device, never sent)'});
  await note.getByRole('button', {name: 'Useful', exact: true}).click();
  await expect(note.getByRole('button', {name: 'Useful', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await reply.getByRole('button', {name: 'Copy as Markdown'}).click();
  await expect(reply.getByRole('button', {name: 'Copied as Markdown'})).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('MOCK: **two** things to try.\n\n_Answer from your AI (your local server), not from ZIGoals._');
  // The note is never sent: the next message carries the conversation's words only.
  await say(page, 'And after that?');
  await expect.poll(() => bodies.length).toBe(2);
  expect(JSON.stringify(bodies[1])).not.toMatch(/"feedback"|Useful/);
  // Continue in my AI: the exact text first; copying copies that text.
  await panel(page).locator('.ai-turn-assistant').last().getByRole('button', {name: 'Continue in my AI'}).click();
  const view = panel(page).getByRole('region', {name: 'Continue in my AI'});
  const text = await view.getByLabel('What will be copied').textContent();
  expect(text).toContain('Me: What should I focus on?'); expect(text).toContain('ZIGi (my AI): MOCK: **two** things to try.');
  await view.getByRole('button', {name: 'Copy for my AI'}).click();
  await expect(view.getByRole('status')).toContainText('Copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);
  await view.getByRole('button', {name: 'Back to the chat'}).click();
  await expect(panel(page).locator('.ai-turn-assistant')).toHaveCount(2);
});

test('with no AI: a local answer brings a stat card or a chart from the records and follow-up chips; jump to the latest message', async ({page}) => {
  await seed(page, null);
  await page.goto('/app');
  await openChat(page);
  await say(page, 'How many minutes did I meditate this month?');
  const total = panel(page).locator('.ai-turn-local').last();
  await expect(total).toContainText(LOCAL_LABEL);
  await expect(total.getByRole('group', {name: /: [\d,.]+ minutes$/})).toContainText('From your Habits journal on this device');
  await say(page, 'When did I last meditate?');
  const answer = panel(page).locator('.ai-turn-local').last();
  await expect(answer.getByRole('img', {name: /^Meditate per day: \d+ days with a record from /})).toBeVisible();
  await answer.getByText('Show the figures').click();
  await expect(answer.getByRole('table')).toBeVisible();
  const followups = answer.getByRole('group', {name: 'Follow-up questions'});
  await expect(followups.getByRole('button')).toHaveText(['How many times did I check in Meditate last week?', "What's my longest Meditate streak?"]);
  await followups.getByRole('button', {name: "What's my longest Meditate streak?"}).click();
  await expect(lastAsked(page)).toHaveText("What's my longest Meditate streak?");
  await expect(panel(page).locator('.ai-turn-local').last()).toContainText('longest Meditate streak');
  // A long conversation scrolled up shows "Jump to the latest message"; it goes back down.
  for (let i = 0; i < 4; i++) await say(page, 'When did I last meditate?');
  await expect(panel(page).locator('.ai-turn-local')).toHaveCount(7);
  await panel(page).locator('.ai-chat-log').evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
  const jump = panel(page).getByRole('button', {name: 'Jump to the latest message'});
  await expect(jump).toBeVisible();
  await jump.click();
  await expect(jump).toHaveCount(0);
  // The log scrolls smoothly (instantly under reduced motion): wait for it to arrive, and the button stays away meanwhile.
  await expect.poll(() => panel(page).locator('.ai-chat-log').evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThan(2);
  await expect(jump).toHaveCount(0);
});

test('first-run tips until "Got it"; "?" opens the shortcuts sheet outside the message box, Escape closes only the sheet', async ({page}) => {
  await server(page);
  await seed(page, {});
  await page.goto('/app');
  await openChat(page);
  // Session Z-Cloud Part 2: the first-run tips wait in the Suggestions sheet's Ideas tab.
  await panel(page).getByRole('button', {name: 'Suggestions', exact: true}).click();
  const tips = panel(page).getByRole('complementary', {name: 'Tips'});
  await expect(tips).toContainText('Type / for commands');
  expect(await stored(page, ZIGI_KEY)).toBeNull();
  await tips.getByRole('button', {name: 'Got it'}).click();
  await expect(tips).toHaveCount(0);
  expect((await stored(page, ZIGI_KEY))!.tipsSeen).toEqual(['chat-v1']);
  // "?" typed in the message box is just a character.
  await box(page).fill(''); await box(page).press('Shift+Slash');
  await expect(box(page)).toHaveValue('?');
  await expect(page.getByRole('dialog', {name: 'Keyboard shortcuts'})).toHaveCount(0);
  await box(page).fill('');
  // A control outside the message box (Session Z-Cloud Part 2: History moved into "⋯"; New chat stays in the header).
  const history = panel(page).getByRole('button', {name: 'New chat'});
  await history.focus();
  await page.keyboard.press('Shift+Slash');
  const sheet = page.getByRole('dialog', {name: 'Keyboard shortcuts'});
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Edit your last message');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(panel(page)).toBeVisible();
  await expect(history).toBeFocused();
  await page.reload();
  await openChat(page);
  await panel(page).getByRole('button', {name: 'Suggestions', exact: true}).click();
  await expect(panel(page).getByRole('region', {name: 'Suggestions for you'})).toBeVisible();
  await expect(panel(page).getByRole('complementary', {name: 'Tips'})).toHaveCount(0);
});

test('History: Pin puts a chat under "Pinned"; the page filter uses where each chat started, kept apart from the chat itself', async ({page}) => {
  await server(page);
  await seed(page, {});
  await page.goto('/app/health');
  await openChat(page);
  await say(page, 'Health question');
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: noted.');
  const chatId = await page.evaluate(([key]) => Object.keys(JSON.parse(localStorage.getItem(key!) ?? '{}').chatAreas ?? {})[0], [ZIGI_KEY]);
  expect((await stored(page, ZIGI_KEY))!.chatAreas).toEqual({[chatId!]: 'health'});
  await page.goto('/app/habits');
  await openChat(page);
  await say(page, 'Habits question');
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: noted.');
  await panel(page).getByRole('button', {name: /^More/}).click(); await panel(page).getByRole('button', {name: 'Chat history'}).click();
  const history = panel(page).locator('.ai-history');
  await expect(history.getByRole('button', {name: /^Habits question/})).toBeVisible();
  const row = (title: string) => history.getByRole('listitem').filter({hasText: title});
  await row('Health question').getByRole('button', {name: 'Pin', exact: true}).click();
  const pinned = history.getByRole('region', {name: 'Pinned chats'});
  await expect(pinned).toContainText('Health question');
  await expect(history.getByRole('region', {name: 'Other chats'})).toContainText('Habits question');
  await history.getByLabel('Page').selectOption('habits');
  await expect(history.getByRole('region', {name: 'Pinned chats'})).toHaveCount(0);
  await expect(history).toContainText('Habits question'); await expect(history).not.toContainText('Health question');
  await history.getByLabel('Page').selectOption('all');
  await expect(row('Health question').getByRole('button', {name: 'Pin', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await row('Health question').getByRole('button', {name: 'Pin', exact: true}).click();
  await expect(history.getByRole('region', {name: 'Pinned chats'})).toHaveCount(0);
});

test('a table in a reply is a real table; HTML and scripts in it stay text', async ({page}) => {
  await server(page, () => ['MOCK table:', '', '| Day | Steps |', '|:----|------:|', '| Mon | 4,000 |', '| <img src=x onerror="window.__zigiXss=1"> | <script>window.__zigiXss=2</script> |', '| [link](javascript:alert(1)) | `code` |'].join('\n'));
  await seed(page, {});
  await page.goto('/app');
  await openChat(page);
  await say(page, 'Show me a table');
  const reply = panel(page).locator('.ai-turn-assistant').last();
  const table = reply.getByRole('region', {name: 'Table from the reply'}).getByRole('table');
  await expect(table.getByRole('columnheader')).toHaveText(['Day', 'Steps']);
  await expect(table.getByRole('row')).toHaveCount(4);
  await expect(table.locator('td.ai-align-right').first()).toHaveText('4,000');
  await expect(table).toContainText('<img src=x onerror="window.__zigiXss=1">');
  // ZIGi's own figure sits beside the reply; inside the reply's body nothing can load or run.
  await expect(reply.locator('.ai-turn-body').locator('img, script, iframe, a[href^="javascript"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & {__zigiXss?: number}).__zigiXss ?? null)).toBeNull();
});
