import {test, type Page, type Route} from '@playwright/test';
import {desktopOnly, expect, hydrated, offlineApis, seedRecords, stored, strayRequests, ZONE} from './journey-helpers';
import {createHabit, emptyHabitData, HABITS_KEY} from '../../lib/habits';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema} from '../../lib/positions';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../../lib/ai/store/keys';
import {AK_ACTION_KINDS} from '../../lib/ai/actions/schema-ak';
import {sendToZigi, zigiPanel} from '../zigi-open';

/**
 * Session AK F2, journey 8: ZIGi and every card kind Session AK added (set-auto-rule, set-bill-reminder, grocery-list,
 * goal-draft, what-if, scan-food, start-soundscape), proposed by the person's own AI — a MOCK local OpenAI-compatible
 * server (no model, no network). Auto-accept is switched on in the device record for every one of those kinds and for
 * water: water is added by ZIGi itself (the control), while every AK card, and the money ones above all, waits for the
 * person's tap and writes nothing before it. Each card then does what it says. Fictional records.
 */
test.use({actionTimeout: 20_000, timezoneId: ZONE});
desktopOnly();
const AI = 'http://127.0.0.1:1234', HABIT = 'aaaaaaaa-0000-4000-8000-0000000000a8';
const block = (value: unknown) => `Here you go.\n\n\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
const FIRST = [
  {kind: 'log-water', millilitres: 250},
  {kind: 'set-auto-rule', habit: 'Fictional run', source: 'workout', workout_type: 'cardio'},
  {kind: 'set-bill-reminder', title: 'Fictional gym', amount: 29, currency: 'EUR', cadence: 'monthly', next_due: '2026-11-15'},
  {kind: 'grocery-list', items: ['Fictional oats', 'Fictional apples']},
];
const THIRD = [{kind: 'goal-draft', name: 'Fictional new bike', target: 900, currency: 'EUR'}]; // with a date: bug J8-1, below
const SECOND = [
  {kind: 'what-if', goal: 'Fictional bike fund', extra_per_month: 50},
  {kind: 'scan-food', mode: 'barcode', barcode: '4006381333931'},
  {kind: 'start-soundscape', preset: 'focus'},
];
async function mockModel(page: Page) {
  const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
  let turn = 0;
  await page.route(`${AI}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({json: {object: 'list', data: [{id: 'mock-chat'}]}});
    if (url.endsWith('/v1/chat/completions')) { const reply = block([FIRST, SECOND, THIRD][Math.min(turn++, 2)]); return route.fulfill({contentType: 'text/event-stream', body: [chunk({role: 'assistant', content: reply}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('')}); }
    return route.fulfill({status: 404, body: ''});
  });
}
const cards = (page: Page) => zigiPanel(page).locator('.ai-card');
const card = (page: Page, title: RegExp | string) => cards(page).filter({hasText: title});
const primary = /^(Add|Apply|Add reminder)$/;

test('@journey 8 ZIGi: every new AK card is proposed and confirmed by the person; money is never auto-accepted', async ({page}) => {
  test.setTimeout(180_000);
  const stray = strayRequests(page, u => u.origin === AI);
  await page.clock.install({time: new Date('2026-11-04T17:00:00Z')});
  await offlineApis(page);
  await mockModel(page);
  const base = defaultAiSettings();
  const goal = privateGoalSchema.parse({id: '88', name: 'Fictional bike fund', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '120000', targetDate: '2027-09-30', notes: '', createdAt: '2026-09-01T08:00:00.000Z', milestones: []});
  const autoAccept = {kinds: Object.fromEntries([...AK_ACTION_KINDS, 'log-water'].map(k => [k, true])), dailyCap: 20, days: {}};
  await seedRecords(page, {
    [HABITS_KEY]: createHabit(emptyHabitData(), {title: 'Fictional run', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T08:00:00Z'), HABIT),
    [PLATFORM_KEY]: {...emptyPlatform(), goals: [goal]},
    [AI_SETTINGS_KEY]: {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: AI, includeHealth: true, pageShare: {...base.pageShare, health: true}},
    [AI_OPTIONS_KEY]: {version: 1, toolMode: 'attach', autoAccept},
  });

  // First answer: water (auto-accepted, the control), a rule, a bill and a grocery list (each waits for the person).
  await page.goto('/app'); await hydrated(page);
  await page.getByRole('button', {name: /Open ZIGi/}).first().click();
  await expect(zigiPanel(page)).toBeVisible({timeout: 15_000});
  await sendToZigi(page, 'Water, a rule for my runs, my gym bill and two groceries');
  await expect(cards(page)).toHaveCount(4, {timeout: 15_000});
  await expect(card(page, 'water').or(card(page, 'Water')).first()).toHaveClass(/ai-card-auto/);
  for (const title of [/Auto-complete:/, 'Bill reminder: Fictional gym', /Add to your grocery list: 2 items/]) {
    const c = card(page, title);
    await expect(c).toHaveClass(/ai-card-proposed/);
    await expect(c.getByRole('button', {name: primary})).toBeVisible();
  }
  // Nothing of theirs is written before a tap.
  expect(await stored(page, 'zigoals:bills:v1')).toBeNull();
  expect(await stored(page, 'zigoals:auto-rules:v1')).toBeNull();
  // The person confirms each.
  await card(page, 'Bill reminder: Fictional gym').getByRole('button', {name: 'Add reminder', exact: true}).click();
  await expect.poll(async () => (await stored<{bills: {title: string; amount: string}[]}>(page, 'zigoals:bills:v1'))?.bills.map(b => b.title)).toEqual(['Fictional gym']);
  await card(page, /Auto-complete:/).getByRole('button', {name: primary}).click();
  await expect.poll(async () => JSON.stringify(await stored(page, 'zigoals:auto-rules:v1'))).toContain(HABIT);
  await card(page, /Add to your grocery list/).getByRole('button', {name: primary}).click();
  await expect(card(page, /Add to your grocery list/)).toHaveClass(/ai-card-(added|opened)/);
  await expect.poll(async () => JSON.stringify(await stored(page, 'zigoals:grocery:v1'))).toContain('Fictional oats');

  // Second answer: a what-if, a scan and a soundscape: each opens or plays on a tap only.
  await sendToZigi(page, 'What if I add 50 a month, scan this barcode, and some focus sound');
  await expect(cards(page)).toHaveCount(7, {timeout: 15_000});
  for (const [title, button] of [[/What if: Fictional bike fund/, 'Open the what-if'], ['Log a food by its barcode', 'Open'], [/Play the .* soundscape/, 'Play']] as const) {
    const c = card(page, title);
    await expect(c).toHaveClass(/ai-card-proposed/);
    await expect(c.getByRole('button', {name: button, exact: true})).toBeVisible();
  }
  // Third answer, on Goals (where the goal form card is offered): the goal form, filled in.
  await page.keyboard.press('Escape');
  await page.goto('/app/goals'); await hydrated(page);
  await page.getByRole('button', {name: /Open ZIGi/}).first().click();
  await expect(zigiPanel(page)).toBeVisible({timeout: 15_000});
  await sendToZigi(page, 'Fill in a goal for a new bike, 900 euros');
  const draft = card(page, /Goal form, filled in: Fictional new bike/);
  const refused = zigiPanel(page).getByRole('group').filter({hasText: 'I couldn’t turn that into an entry.'});
  await expect(draft.or(refused).first()).toBeVisible({timeout: 15_000});
  if (await refused.isVisible()) { await refused.getByText('I couldn’t turn that into an entry.').click(); expect(await refused.innerText(), 'the goal form card was refused').toBe(''); }
  await expect(draft).toHaveClass(/ai-card-proposed/);
  const goalsBefore = (await stored<{goals: unknown[]}>(page, PLATFORM_KEY))!.goals.length;
  // The goal form opens filled in; nothing is created until the person finishes the wizard.
  await card(page, /Goal form, filled in/).getByRole('button', {name: 'Open the form', exact: true}).click();
  await page.waitForURL('**/app/goals/new');
  await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('Fictional new bike');
  expect((await stored<{goals: unknown[]}>(page, PLATFORM_KEY))!.goals).toHaveLength(goalsBefore);
  expect(stray).toEqual([]);
});

// Bug J8-1 (docs/review/session-ak/JOURNEY_BUGS.md): ZIGi's parser rewrites every card's "date" to "day" (a repair for
// log cards), but the goal form card's own field is "date" (as the protocol example the model is given shows), so a
// goal-draft with a date is refused: "Unrecognized key: \"day\"".
test.fixme('@journey 8b bug J8-1: the goal form card with a date is proposed, not refused', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T17:00:00Z')});
  await offlineApis(page);
  const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
  await page.route(`${AI}/**`, route => route.request().url().endsWith('/v1/models') ? route.fulfill({json: {object: 'list', data: [{id: 'mock-chat'}]}})
    : route.fulfill({contentType: 'text/event-stream', body: [chunk({role: 'assistant', content: block([{kind: 'goal-draft', name: 'Fictional new bike', target: 900, currency: 'EUR', date: '2027-05-01'}])}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('')}));
  const base = defaultAiSettings();
  await seedRecords(page, {[AI_SETTINGS_KEY]: {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: AI}, [AI_OPTIONS_KEY]: {version: 1, toolMode: 'attach'}});
  await page.goto('/app/goals'); await hydrated(page);
  await page.getByRole('button', {name: /Open ZIGi/}).first().click();
  await sendToZigi(page, 'Fill in a goal for a new bike, 900 euros by May');
  await expect(card(page, /Goal form, filled in: Fictional new bike/)).toContainText('By May 1, 2027');
});
