import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {HABITS_KEY} from '../lib/habits';
import {QUESTION_HEADING} from '../lib/ai/context/question';

/**
 * Session V Part 4, the owner's finding: on the Health page, "How many minutes did I meditate this month?" must carry
 * the Meditate habit's figures for this month, on the copy path (a subscription, here Grok, as the owner used) and on
 * the AI path (a MOCK local server). The records chosen from the question are chips the person can take off, and the
 * preview is the exact text. Every provider call is a MOCK; the copy goes to a stubbed clipboard.
 */
const LOCAL_BASE = 'http://127.0.0.1:1234';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z', OWNER = 'How many minutes did I meditate this month?';
async function seed(page: Page, settings: AiSettings) {
  await page.addInitScript(() => {
    const w = window as unknown as {__copied: string[]; __opened: unknown[][]};
    w.__copied = []; w.__opened = [];
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async (text: string) => { w.__copied.push(text); }}});
    window.open = ((...args: unknown[]) => { w.__opened.push(args); return null; }) as typeof window.open;
  });
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(settings)});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
const meditationMinutes = () => { const habits = JSON.parse(buildShowcase(DAY).records[HABITS_KEY]!) as {habits: {title: string; entries: {date: string; count: number; disposition: string}[]}[]}; return habits.habits.find(h => h.title === 'Meditate')!.entries.filter(e => e.date >= '2026-09-01' && e.date <= DAY && e.disposition === 'logged').reduce((s, e) => s + e.count, 0); };
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('copy path (Grok subscription) on Health: the meditation figures for this month go with the question, as a chip that can be taken off', async ({page}, testInfo) => {
  await seed(page, {...defaultAiSettings(), enabled: true, mode: 'subscription', subscriptionApp: 'grok'});
  await page.goto('/app/health');
  await openChat(page);
  await panel(page).getByLabel('Your question').fill(OWNER);
  const chips = panel(page).getByRole('group', {name: 'Records ZIGi chose for this question'});
  await expect(chips).toContainText('Meditate · this month');
  // A lookup is also answered right here, with no AI.
  await expect(panel(page).locator('.ai-bridge-local')).toContainText(`You logged ${meditationMinutes()} minutes of Meditate this month`);
  await expect(panel(page).locator('.ai-bridge-local .ai-turn-label')).toHaveText('Answered on your device · no AI used');
  await panel(page).getByText('What will be copied').click();
  const preview = panel(page).locator('details').filter({hasText: 'What will be copied'}).locator('pre');
  await expect(preview).toContainText(QUESTION_HEADING);
  await expect(preview).toContainText(`"valueText":"${meditationMinutes()} minutes"`);
  await panel(page).getByRole('button', {name: 'Copy for my AI'}).click();
  await expect(panel(page)).toContainText('Copied. Paste it into Grok.');
  const copied = await page.evaluate(() => (window as unknown as {__copied: string[]}).__copied);
  expect(copied).toHaveLength(1);
  expect(copied[0]).toContain(`"valueText":"${meditationMinutes()} minutes"`);
  expect(copied[0]).toContain('"range":{"from":"2026-09-01","to":"2026-09-20","label":"this month"}');
  expect(copied[0]!.endsWith(`My question: ${OWNER}`)).toBe(true);
  expect(copied[0]).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  // Taking the chip off takes the records out of the copy.
  await chips.getByRole('button', {name: 'Leave out Meditate · this month'}).click();
  await expect(preview).not.toContainText('## For this question');
  await panel(page).getByRole('button', {name: 'Copy for my AI'}).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {__copied: string[]}).__copied.length)).toBe(2);
  expect((await page.evaluate(() => (window as unknown as {__copied: string[]}).__copied))[1]).not.toContain('## For this question');
  // Side by side, on a wide screen only: the app's own address, nothing personal, a popup the browser may make a tab.
  const sideBySide = panel(page).getByRole('button', {name: 'Open Grok side by side'});
  if (testInfo.project.name === 'mobile') { await expect(sideBySide).toHaveCount(0); return; }
  await sideBySide.click();
  const opened = await page.evaluate(() => (window as unknown as {__opened: unknown[][]}).__opened);
  expect(opened).toHaveLength(1);
  expect(opened[0]![0]).toBe('https://grok.com/'); expect(opened[0]![1]).toBe('zigoals-ai-app');
  expect(opened[0]![2]).toMatch(/^noopener,popup,width=\d+,height=\d+,left=\d+,top=\d+$/);
});

test('AI path (MOCK local server) on Health: a question that names the habit carries its figures in the system prompt; a removed chip does not', async ({page}) => {
  const bodies: string[] = [];
  const handler = async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { bodies.push(route.request().postData() ?? ''); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream('MOCK: here is a gentle idea.')}); }
    return route.fulfill({status: 404, body: ''});
  };
  await page.route(`${LOCAL_BASE}/**`, handler); await page.route('http://localhost:1234/**', handler);
  await seed(page, {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: LOCAL_BASE});
  await page.goto('/app/health');
  await openChat(page);
  const composer = page.getByLabel('Message to your AI');
  await composer.fill('Help me meditate more this month');
  const chips = panel(page).getByRole('group', {name: 'Records ZIGi chose for this question'});
  await expect(chips).toContainText('Meditate · this month');
  await panel(page).getByText('What your AI sees').click();
  await expect(panel(page).locator('.ai-context-preview pre').last()).toContainText(`"valueText":"${meditationMinutes()} minutes"`);
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel(page).locator('.ai-turn-assistant').last()).toContainText('MOCK: here is a gentle idea.');
  const first = JSON.parse(bodies[0]!) as {messages: {role: string; content: string}[]};
  expect(first.messages[0]!.content).toContain(QUESTION_HEADING);
  expect(first.messages[0]!.content).toContain(`"valueText":"${meditationMinutes()} minutes"`);
  expect(first.messages.at(-1)).toEqual({role: 'user', content: 'Help me meditate more this month'});
  // The same question with the chip taken off: the page's data only.
  await composer.fill('Help me meditate more this month');
  await expect(chips).toContainText('Meditate · this month');
  await chips.getByRole('button', {name: 'Leave out Meditate · this month'}).click();
  await expect(panel(page).getByRole('group', {name: 'Records ZIGi chose for this question'})).toHaveCount(0);
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(JSON.parse(bodies[1]!).messages[0].content).not.toContain('## For this question');
});
