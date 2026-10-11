import {expect, test, type Page, type Route} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {ZIGI_KEY} from '../lib/ai/store/keys';
import {createHabit, habitDataSchema, HABITS_KEY, type HabitData} from '../lib/habits';
import {REMINDERS_KEY} from '../lib/reminders/schema';

/**
 * ZIGi v2: the owner's screenshot gallery (Session V Part 18, pushed to `review/session-v-screens`). Opt-in:
 * `ZIGI_V2_CAPTURES=1` writes every state at 1440×900, 1024×768 and 390×844 with reduced motion into
 * `ZIGI_V2_CAPTURES_DIR` (default `test-results/zigi-v2-captures`). Every AI answer is a MOCK served by page.route;
 * nothing leaves the browser. Without the flag the file is skipped, so the suite's totals do not change. A capture tool,
 * not an assertion suite: its expectations only keep a broken page from producing a blank gallery.
 */
const enabled = process.env.ZIGI_V2_CAPTURES === '1';
const OUT = process.env.ZIGI_V2_CAPTURES_DIR ?? join(process.cwd(), 'test-results', 'zigi-v2-captures');
const VIEWPORTS = [{name: 'desktop-1440', width: 1440, height: 900, phone: false}, {name: 'tablet-1024', width: 1024, height: 768, phone: false}, {name: 'phone-390', width: 390, height: 844, phone: true}] as const;
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z', HABIT_ID = '20000000-0000-4000-8000-000000000042';
const chunk = (body: Record<string, unknown>) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', ...body})}\n\n`;
const answer = (text: string) => [chunk({choices: [{index: 0, delta: {role: 'assistant', content: text}, finish_reason: null}]}), chunk({choices: [{index: 0, delta: {}, finish_reason: 'stop'}], usage: {prompt_tokens: 520, completion_tokens: 60}}), 'data: [DONE]\n\n'].join('');
const calls = (list: {name: string; args: Record<string, unknown>}[]) => [
  ...list.map((c, index) => chunk({choices: [{index: 0, delta: {tool_calls: [{index, id: `call_MOCK_${index}`, type: 'function', function: {name: c.name, arguments: JSON.stringify(c.args)}}]}, finish_reason: null}]})),
  chunk({choices: [{index: 0, delta: {}, finish_reason: 'tool_calls'}], usage: {prompt_tokens: 300, completion_tokens: 40}}), 'data: [DONE]\n\n',
].join('');
const block = (value: unknown) => `\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
type Body = {messages: {role: string; content: unknown}[]};
const systemOf = (body: Body) => String(body.messages[0]!.content);
const handleFor = (body: Body, title: string) => new RegExp(`(h\\d+): ${title}`).exec(systemOf(body))?.[1] ?? 'h0';
/** A MOCK LM Studio that takes tools; `reply` writes each answer. */
async function server(page: Page, reply: (body: Body) => string) {
  const handler = async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/api/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({models: [{type: 'llm', key: 'mock-chat', loaded_instances: [], capabilities: {vision: false, trained_for_tool_use: true}}]})});
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: reply(JSON.parse(route.request().postData() ?? '{}') as Body)});
    return route.fulfill({status: 404, body: ''});
  };
  await page.route(`${BASE}/**`, handler);
}
const connected = {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE};
function records(): Record<string, string> {
  const base = buildShowcase(DAY).records;
  const evening = createHabit(habitDataSchema.parse(JSON.parse(base[HABITS_KEY]!)) as HabitData, {title: 'Stretch evening', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'), HABIT_ID);
  const habits = createHabit(evening, {title: 'Stretch morning', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-01T12:00:00Z'));
  return {...base, [HABITS_KEY]: JSON.stringify(habits), [REMINDERS_KEY]: JSON.stringify({version: 1, habits: {[HABIT_ID]: {time: '18:00'}}, dismissed: {}})};
}
async function seed(page: Page, {ai = false, zigi}: {ai?: boolean; zigi?: Record<string, unknown>} = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const values = {...records(), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    ...(ai ? {[AI_SETTINGS_KEY]: JSON.stringify(connected)} : {}), ...(zigi ? {[ZIGI_KEY]: JSON.stringify({version: 1, ...zigi})} : {})};
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
const openButton = (page: Page) => page.getByRole('button', {name: /Open ZIGi/});
async function openChat(page: Page) { await openButton(page).click(); await expect(panel(page)).toBeVisible(); }
async function askLocal(page: Page, text: string) { await panel(page).getByLabel('Ask ZIGi about your records').fill(text); await panel(page).getByRole('button', {name: 'Send', exact: true}).click(); }
async function ask(page: Page, text: string) { await page.getByLabel('Message to your AI').fill(text); await page.getByRole('button', {name: 'Send', exact: true}).click(); }
async function settingsAt(page: Page, anchor: string) { await page.goto('/app'); await page.goto(`/app/settings#${anchor}`); }
test.skip(!enabled, 'Set ZIGI_V2_CAPTURES=1 to write the gallery');
test.setTimeout(600_000);
test.use({timezoneId: 'UTC', reducedMotion: 'reduce'});
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({viewport: {width: viewport.width, height: viewport.height}});
    const dir = join(OUT, viewport.name);
    const shot = async (page: Page, name: string, full = false) => { mkdirSync(dir, {recursive: true}); await page.waitForTimeout(400); await page.screenshot({path: join(dir, `${name}.png`), fullPage: full, animations: 'disabled', caret: 'hide'}); };

    test('launcher sizes, hidden with the edge tab, Customize and Meet ZIGi', async ({page}) => {
      for (const size of ['s', 'm', 'l'] as const) {
        await seed(page, {zigi: {size}});
        await page.goto('/app');
        await expect(page.getByTestId('ai-launcher')).toBeVisible();
        await shot(page, `01-launcher-size-${size}`);
      }
      await seed(page);
      await page.goto('/app');
      await page.getByRole('button', {name: /Hide ZIGi/}).click();
      await shot(page, '02-launcher-hidden-undo');
      await page.clock.fastForward(11_000);
      await expect(page.getByRole('button', {name: /Show ZIGi/})).toBeVisible();
      await shot(page, '03-edge-tab');
      await page.getByRole('button', {name: /Show ZIGi/}).click();
      await openChat(page);
      await panel(page).getByRole('button', {name: 'Customize ZIGi'}).click();
      await shot(page, '04-customize');
      await page.goto('/app/zigi');
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await shot(page, '05-meet-zigi');
    });

    test('answers on the device: a lookup, a choice, your week and patterns', async ({page}) => {
      await seed(page);
      await page.goto('/app/health');
      await openChat(page);
      await shot(page, '06-panel-before-setup');
      await askLocal(page, 'How many minutes did I meditate this month?');
      await expect(panel(page).locator('.ai-turn-local').last()).toContainText('minutes');
      await shot(page, '07-local-answer');
      await panel(page).locator('.ai-turn-local').last().getByText('Records used').click();
      await shot(page, '08-local-answer-records');
      await askLocal(page, 'What is my stretch streak?');
      await expect(panel(page).locator('.ai-turn-local').last()).toContainText('Which one do you mean?');
      await shot(page, '09-local-answer-choice');
      await page.goto('/app');
      await openChat(page);
      await panel(page).getByRole('button', {name: 'Your week', exact: true}).click();
      await expect(panel(page).getByRole('region', {name: 'Your week with ZIGi'})).toBeVisible();
      await shot(page, '10-your-week');
      await page.goto('/app/habits');
      await openChat(page);
      await panel(page).getByRole('button', {name: 'Patterns', exact: true}).click();
      await shot(page, '11-patterns');
    });

    test('with an AI: tool chips, question chips, cards for the new kinds', async ({page}) => {
      await server(page, body => {
        const last = String(body.messages.at(-1)?.content ?? '');
        if (body.messages.some(m => m.role === 'tool')) return answer('MOCK: a little more meditation than last week, with Tuesday the longest; ten minutes after lunch would fit.');
        if (last.includes('plan my week')) return calls([{name: 'habit_stats', args: {habit: 'Meditate', range: 'this week', metric: 'minutes'}}, {name: 'habit_stats', args: {habit: 'Meditate', range: 'last week', metric: 'minutes'}}]);
        if (last.includes('breakfast')) return answer(`Five cards for your morning.\n\n${block([{kind: 'log-food', name: 'Two eggs', meal: 'Breakfast', estimate: {kcal: 140, protein_g: 12}}, {kind: 'log-food', name: 'Toast', meal: 'Breakfast', estimate: {kcal: 80}}, {kind: 'log-food', name: 'Coffee', meal: 'Breakfast'}, {kind: 'check-in', habit: handleFor(body, 'Meditate'), minutes: 30}, {kind: 'log-water', glasses: 2}])}`);
        if (last.includes('Kyoto')) return answer(`A plan you can change before adding.\n\n${block({kind: 'plan-goal', name: 'Kyoto spring', target: 4000, currency: 'EUR', targetDate: '2027-04-01', category: 'Travel', milestones: ['Flights', 'Rail pass'], habits: [{title: 'Save a little daily', measurement: 'done'}, {title: 'Japanese practice', measurement: 'minutes', target: 15}]})}`);
        if (last.includes('recipe')) return answer(`Here is the bowl as a recipe.\n\n${block({kind: 'create-recipe', name: 'Weekend bowl', servings: 2, ingredients: [{name: 'Blueberries', grams: 80, estimate_per_100g: {kcal: 57}}, {name: 'Honey', grams: 10}]})}\n\n${block({kind: 'grocery-item', items: ['Oat milk', 'Spinach', 'Lemons']})}`);
        return answer('MOCK: here is what I see in your records.');
      });
      await seed(page, {ai: true});
      await page.goto('/app/habits');
      await openChat(page);
      await ask(page, 'Help me plan my week around meditation');
      await expect(panel(page).getByRole('group', {name: 'ZIGi looked at'})).toBeVisible();
      await panel(page).getByRole('group', {name: 'ZIGi looked at'}).scrollIntoViewIfNeeded();
      await shot(page, '12-tool-chips');
      await panel(page).getByRole('button', {name: 'New chat'}).click();
      await page.getByLabel('Message to your AI').fill('How many minutes did I meditate this month?');
      await page.waitForTimeout(600);
      await shot(page, '13-question-chips');
      await page.getByLabel('Message to your AI').fill('');
      await panel(page).getByRole('button', {name: 'Log mode'}).click();
      await page.getByLabel('Message to your AI').fill('Two eggs, toast and a coffee for breakfast, 30 minutes meditation and 2 glasses of water');
      await panel(page).getByRole('button', {name: 'Log', exact: true}).click();
      await expect(panel(page).locator('.ai-card')).toHaveCount(5);
      await panel(page).locator('.ai-card').first().scrollIntoViewIfNeeded();
      await shot(page, '14-cards-breakfast');
      await panel(page).getByRole('button', {name: 'Log mode'}).click();
      await panel(page).getByRole('button', {name: 'New chat'}).click();
      await ask(page, 'Help me plan Kyoto next spring');
      await expect(panel(page).locator('.ai-card').first()).toBeVisible();
      await panel(page).locator('.ai-card').first().scrollIntoViewIfNeeded();
      await shot(page, '15-cards-plan-goal');
      await panel(page).getByRole('button', {name: 'New chat'}).click();
      await ask(page, 'Make my weekend bowl a recipe and add oat milk, spinach and lemons to groceries');
      await expect(panel(page).locator('.ai-card').first()).toBeVisible();
      await panel(page).locator('.ai-card').first().scrollIntoViewIfNeeded();
      await shot(page, '16-cards-recipe-groceries');
    });

    test('Settings: groups, context pack, the chooser, reminders', async ({page}) => {
      await seed(page, {ai: true});
      await settingsAt(page, 'your-ai');
      await expect(page.locator('.ai-settings-body')).toBeVisible();
      await page.locator('.ai-settings-body').getByRole('heading', {name: 'Connection', level: 3}).scrollIntoViewIfNeeded();
      await shot(page, '17-settings-groups');
      await settingsAt(page, 'zigi-pack');
      const pack = page.locator('details.ai-pack');
      await expect(pack).toHaveAttribute('open', '');
      await pack.getByText('Preview the exact text').click();
      await shot(page, '18-context-pack');
      await settingsAt(page, 'zigi-setup');
      const chooser = page.locator('details#zigi-setup');
      await expect(chooser).toHaveAttribute('open', '');
      await chooser.getByRole('radio', {name: 'A ChatGPT, Claude, Gemini or Grok subscription'}).check();
      await chooser.getByRole('radio', {name: 'On a computer'}).check();
      await chooser.getByRole('radio', {name: 'The best answers'}).check();
      await chooser.locator('h4').scrollIntoViewIfNeeded();
      await shot(page, '19-setup-chooser');
      await settingsAt(page, 'zigi-reminders');
      await expect(page.locator('details#zigi-reminders')).toHaveAttribute('open', '');
      await shot(page, '20-zigi-reminders');
    });

    test('the knock, and the mini window', async ({page, context}) => {
      await seed(page, {zigi: {knock: {enabled: true, offer: 'accepted'}}});
      await page.goto('/app/habits');
      await expect(page.locator('.zigi-knock')).toBeVisible();
      await shot(page, '21-knock');
      await page.locator('.zigi-knock').getByRole('button', {name: 'Do it now'}).click();
      await expect(page.locator('.zigi-knock .ai-card').first()).toBeVisible();
      await shot(page, '22-knock-do-it-now');
      if (viewport.phone) return;
      await seed(page);
      await page.goto('/app/habits');
      await openChat(page);
      await askLocal(page, 'How many minutes did I meditate this month?');
      await expect(panel(page).locator('.ai-turn-assistant, .ai-turn-local')).not.toHaveCount(0);
      const button = panel(page).getByRole('button', {name: 'Pop out ZIGi into a mini window'});
      if (!(await button.count())) return;
      const opened = context.waitForEvent('page');
      await button.click();
      const mini = await opened;
      await expect(mini.locator('section.ai-chat-pip')).toBeVisible();
      await shot(page, '23-mini-window-tab');
      mkdirSync(dir, {recursive: true});
      await mini.screenshot({path: join(dir, '24-mini-window.png'), animations: 'disabled', caret: 'hide', timeout: 10_000}).catch(() => { /* a mini window whose event loop does not run cannot be captured */ });
    });
  });
}
