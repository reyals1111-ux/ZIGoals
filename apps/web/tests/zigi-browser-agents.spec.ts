import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {HABITS_KEY} from '../lib/habits';
import {navLink} from './phone-nav';

/**
 * Session V Part 16 end to end: browser AI agents (WebMCP). No test browser offers WebMCP without Chrome's testing flag,
 * so a stand-in `document.modelContext` keeps what the page registers, drops a tool when its signal aborts, and lets the
 * test call a tool the way an agent would. Checked: no card and nothing loaded without the API; the switch is off by
 * default and nothing is offered until the person turns it on; the lookups follow the gates (no Health tool while Health
 * is not shared, nothing on Settings or on a private screen); the page changing takes the tools away and offers them
 * again; ZIGi shows each request with exactly what went back; a proposal only ever becomes cards in ZIGi's panel, and
 * nothing is written until the person adds one; "Turn off browser agents" takes every tool away.
 */
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
type Logged = {kind: 'register' | 'abort'; name: string};
type Agent = {names: () => string[]; log: Logged[]; tool: (name: string) => {description: string; annotations: Record<string, boolean>; inputSchema: unknown} | null; call: (name: string, input: unknown) => Promise<string>};
async function fakeModelContext(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, {name: string; description: string; annotations: Record<string, boolean>; inputSchema: unknown; execute: (input: unknown, options: {signal: AbortSignal}) => Promise<string>}>();
    const log: {kind: string; name: string}[] = [];
    const context = {
      registerTool(tool: {name: string; description: string; annotations: Record<string, boolean>; inputSchema: unknown; execute: (input: unknown, options: {signal: AbortSignal}) => Promise<string>}, options?: {signal?: AbortSignal}) {
        if (tools.has(tool.name)) return Promise.reject(new DOMException(`${tool.name} is already registered`, 'InvalidStateError'));
        if (options?.signal?.aborted) return Promise.resolve();
        tools.set(tool.name, tool); log.push({kind: 'register', name: tool.name});
        options?.signal?.addEventListener('abort', () => { if (tools.get(tool.name) === tool) { tools.delete(tool.name); log.push({kind: 'abort', name: tool.name}); } }, {once: true});
        return Promise.resolve();
      },
    };
    Object.defineProperty(document, 'modelContext', {configurable: true, value: context});
    const agent = {
      names: () => [...tools.keys()].sort(), log,
      tool: (name: string) => { const t = tools.get(name); return t ? {description: t.description, annotations: t.annotations, inputSchema: t.inputSchema} : null; },
      call: (name: string, input: unknown) => { const t = tools.get(name); if (!t) return Promise.reject(new Error(`no tool ${name}`)); return t.execute(input, {signal: new AbortController().signal}); },
    };
    Object.assign(window, {__agent: agent});
  });
}
async function seed(page: Page, extra: Record<string, unknown> = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const settings = {...defaultAiSettings(), enabled: true, mode: 'subscription', subscriptionApp: 'chatgpt'};
  const values = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(settings),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]))};
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
const names = (page: Page) => page.evaluate(() => (window as unknown as {__agent: Agent}).__agent.names());
const agentLog = (page: Page) => page.evaluate(() => (window as unknown as {__agent: Agent}).__agent.log.slice());
const toolInfo = (page: Page, name: string) => page.evaluate(n => (window as unknown as {__agent: Agent}).__agent.tool(n), name);
const call = (page: Page, name: string, input: unknown) => page.evaluate(([n, i]) => (window as unknown as {__agent: Agent}).__agent.call(n as string, i), [name, input] as const);
const stored = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);
/** A card's address, as a real page load from another page (a fragment-only navigation before hydration can lose its hash). */
async function settingsAt(page: Page, anchor: string) { await page.goto('/app'); await page.goto(`/app/settings#${anchor}`); }
const ON = {[AI_OPTIONS_KEY]: {version: 1, webmcp: true}};
const notice = (page: Page) => page.getByRole('region', {name: 'A browser AI agent used ZIGoals’ tools'});
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('without WebMCP there is no card and nothing is offered', async ({page}) => {
  await seed(page, ON);
  await settingsAt(page, 'your-ai');
  await expect(page.locator('details#zigi-setup')).toBeAttached();
  await expect(page.locator('details#zigi-agents')).toHaveCount(0);
  expect(await page.evaluate(() => 'modelContext' in document)).toBe(false);
});

test('off by default: the card explains it, nothing is offered until the person turns it on, then only what the gates allow', async ({page}) => {
  await fakeModelContext(page);
  await seed(page);
  await settingsAt(page, 'zigi-agents');
  const card = page.locator('details#zigi-agents');
  await expect(card).toHaveAttribute('open', '');
  await expect(card).toContainText('look up your records the way ZIGi does');
  await expect(card).toContainText('nothing is written until you add one');
  await expect(card).toContainText('What an agent reads goes to the AI that runs it');
  const use = card.getByRole('switch', {name: 'Let browser AI agents use ZIGoals tools'});
  await expect(use).toHaveAttribute('aria-checked', 'false');
  await page.goto('/app/habits');
  await expect(page.getByRole('button', {name: /Open ZIGi/})).toBeVisible();
  expect(await names(page)).toEqual([]);
  await settingsAt(page, 'zigi-agents');
  await use.click();
  await expect(use).toHaveAttribute('aria-checked', 'true');
  expect(JSON.parse((await stored(page, AI_OPTIONS_KEY))!)).toMatchObject({version: 1, webmcp: true});
  // Settings itself offers nothing.
  expect(await names(page)).toEqual([]);
  await page.goto('/app/habits');
  await expect.poll(() => names(page)).toContain('zigoals_habit_stats');
  const offered = await names(page);
  expect(offered).toEqual(expect.arrayContaining(['zigoals_list_habits', 'zigoals_habit_checkins', 'zigoals_list_goals', 'zigoals_holdings', 'zigoals_today_summary', 'zigoals_propose_changes']));
  for (const health of ['water', 'steps', 'weight', 'diary_entries', 'nutrient_totals', 'fasting', 'counters', 'search_foods']) expect(offered).not.toContain(`zigoals_${health}`);
  expect(offered.every(n => /^zigoals_[a-z_]+$/.test(n))).toBe(true);
  expect(await toolInfo(page, 'zigoals_habit_stats')).toMatchObject({annotations: {readOnlyHint: true, untrustedContentHint: true}, inputSchema: {type: 'object'}});
  expect(await toolInfo(page, 'zigoals_propose_changes')).toMatchObject({annotations: {consequentialHint: true}});
});

test('a lookup answers from the records of the moment, and ZIGi shows exactly what went back', async ({page}) => {
  await fakeModelContext(page);
  await seed(page, ON);
  await page.goto('/app/habits');
  await expect.poll(() => names(page)).toContain('zigoals_habit_stats');
  const text = await call(page, 'zigoals_habit_stats', {habit: 'Meditate', range: 'this month', metric: 'minutes'});
  const result = JSON.parse(text) as {tool: string; about: string; source: string; data: Record<string, unknown>};
  expect(result).toMatchObject({tool: 'habit_stats', about: 'Meditate · this month'});
  expect(result.source).toContain('Habits journal');
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText('Read: Meditate · this month');
  await notice(page).getByText('What it got').click();
  await expect(notice(page).locator('pre')).toHaveText(text);
  // JSON text as input (Chrome before 155) gives the same answer.
  expect(await call(page, 'zigoals_habit_stats', JSON.stringify({habit: 'Meditate', range: 'this month', metric: 'minutes'}))).toBe(text);
  await expect(notice(page).getByRole('listitem')).toHaveCount(2);
  await notice(page).getByRole('button', {name: 'Close', exact: true}).click();
  await expect(notice(page)).toHaveCount(0);
});

test('the page changing takes the tools away and offers them again; a private screen takes them all away', async ({page}) => {
  await fakeModelContext(page);
  await seed(page, ON);
  await page.goto('/app/habits');
  await expect.poll(() => names(page)).toContain('zigoals_habit_stats');
  const before = (await agentLog(page)).length;
  await (await navLink(page, 'Goals')).click();
  await page.waitForURL('**/app/goals');
  const since = async () => (await agentLog(page)).slice(before).filter(l => l.name === 'zigoals_habit_stats').map(l => l.kind);
  await expect.poll(since).toEqual(['abort', 'register']);
  // A private screen (any sheet of the page's own): nothing is offered while it shows.
  await page.goto('/app/wealth');
  await expect.poll(() => names(page)).toContain('zigoals_holdings');
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  await expect(page.locator('dialog.wealth-sheet[open]')).toBeVisible();
  await expect.poll(() => names(page)).toEqual([]);
  await page.locator('dialog.wealth-sheet[open]').getByRole('button', {name: 'Close dialog'}).click();
  await expect(page.locator('dialog.wealth-sheet[open]')).toHaveCount(0);
  await expect.poll(() => names(page)).toContain('zigoals_holdings');
});

test('a proposal only ever becomes cards in ZIGi\'s panel: nothing is written until the person adds one', async ({page}) => {
  await fakeModelContext(page);
  await seed(page, ON);
  await page.goto('/app/habits');
  await expect.poll(() => names(page)).toContain('zigoals_propose_changes');
  // The agent looks the habit up first: the handle it gets is the one its proposal may use.
  const list = JSON.parse(await call(page, 'zigoals_list_habits', {})) as {data: {habits: {handle: string; title: string}[]}};
  const meditate = list.data.habits.find(h => h.title === 'Meditate')!;
  expect(meditate.handle).toMatch(/^h\d+$/);
  const habitsBefore = await stored(page, HABITS_KEY);
  const today = (raw: string | null) => (JSON.parse(raw!) as {habits: {title: string; entries: {date: string; count: number}[]}[]}).habits.find(h => h.title === 'Meditate')!.entries.find(e => e.date === DAY) ?? null;
  const answer = await call(page, 'zigoals_propose_changes', {actions: [{kind: 'check-in', habit: meditate.handle, minutes: 10}, {kind: 'check-in', habit: 'h99', value: 1}, {kind: 'transfer-funds', amount: 100}]});
  expect(answer).toMatch(/^Shown to the person as one card in ZIGi's panel on this page\. Nothing is written until they add a card/);
  expect(answer).toContain('Not accepted: "h99" is not a handle ZIGoals\' lookups gave on this tab');
  expect(answer.split('\n').filter(l => l.startsWith('Not accepted: '))).toHaveLength(2);
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible();
  const batch = panel.getByRole('article', {name: /^Proposed by a browser AI agent at /});
  await expect(batch).toContainText('Nothing is written until you add a card.');
  const card = batch.getByTestId('ai-proposals');
  await expect(card).toContainText('Meditate');
  expect(await stored(page, HABITS_KEY)).toBe(habitsBefore);
  await batch.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(batch).toContainText('Undo is available for ten seconds');
  expect(today(await stored(page, HABITS_KEY))).not.toEqual(today(habitsBefore));
  // ZIGi's notice lists the request too, once the panel is closed.
  await panel.getByRole('button', {name: 'Close ZIGi', exact: true}).click();
  await expect(notice(page)).toContainText('Proposed one change: they are cards in ZIGi’s panel');
});

test('"Turn off browser agents" in ZIGi\'s notice takes every tool away', async ({page}) => {
  await fakeModelContext(page);
  await seed(page, ON);
  await page.goto('/app/goals');
  await expect.poll(() => names(page)).toContain('zigoals_list_goals');
  await call(page, 'zigoals_list_goals', {});
  await notice(page).getByRole('button', {name: 'Turn off browser agents'}).click();
  await expect.poll(() => names(page)).toEqual([]);
  await expect(notice(page)).toHaveCount(0);
  expect(JSON.parse((await stored(page, AI_OPTIONS_KEY))!)).toMatchObject({webmcp: false});
});
