import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_ACTIONS_KEY, AI_MEMORY_KEY, AI_OPTIONS_KEY, ZIGI_REMINDERS_KEY} from '../lib/ai/store/keys';
import {FASTING_KEY} from '../lib/fasting/schema';
import {REMINDERS_KEY} from '../lib/reminders/schema';
import {WEEKLY_REVIEW_KEY} from '../lib/weekly-review/schema';
import {PLATFORM_KEY} from '../lib/positions';

/**
 * Session X-Local Part 5a, owner addition 4, "accepted means correct": for every writing kind, a MOCK reply becomes a
 * card, Add writes the record, and the stored record is checked field by field (units, dates, times in the person's
 * zone); then Undo puts every store back exactly as it was before the card. Run in three zones: UTC (CI's), the
 * owner's (Europe/Brussels) and one that is already on the next day at the test's moment (Asia/Tokyo), so "today",
 * "yesterday" and clock times prove they follow the device's zone. The two pre-fill kinds write nothing and are proven
 * in your-ai.spec.ts (the form opens filled in, nothing saved). Every reply here is a MOCK; the records are the Showcase's.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const HEALTH_KEY = 'zigoals:health:v1', HABITS_KEY = 'zigoals:habits:v1';
const KEYS = [HEALTH_KEY, HABITS_KEY, PLATFORM_KEY, FASTING_KEY, REMINDERS_KEY, ZIGI_REMINDERS_KEY, WEEKLY_REVIEW_KEY, AI_MEMORY_KEY, DASHBOARD_SETTINGS_KEY, AI_ACTIONS_KEY] as const;
type Snap = Record<string, any>;
type Body = {messages: {role: string; content: unknown}[]};
type Reply = (body: Body) => string;
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const block = (value: unknown) => `Here it is.\n\n\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
async function server(page: Page, replies: readonly Reply[]) {
  let n = 0;
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { const body = JSON.parse(route.request().postData() ?? '{}') as Body; const reply = replies[Math.min(n++, replies.length - 1)]!; return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply(body))}); }
    return route.fulfill({status: 404, body: ''});
  });
}
async function seed(page: Page) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const ai = {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, includeHealth: true, pageShare: {...base.pageShare, health: true}};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'})});
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
async function send(page: Page, text: string) { await page.getByLabel('Message to your AI').fill(text); await page.getByRole('button', {name: 'Send', exact: true}).click(); await expect(panel(page).locator('.ai-card').last()).toBeVisible(); }
const snapshot = (page: Page): Promise<Snap> => page.evaluate(keys => Object.fromEntries(keys.map(k => { const v = localStorage.getItem(k); return [k, v === null ? null : JSON.parse(v)]; })), KEYS as unknown as string[]);
/**
 * What the app's own save paths leave behind that is not a record: `updatedAt` stamps, the water operation ledger (an
 * accepted operation stays listed after its entry is removed, as after a manual removal), an empty Session W group
 * (`sleep`, `meditation`, `moods`, `links`) left by the group's own remove, and the module version that the first group
 * raised. Everything else must be byte-identical after Undo.
 */
function normalise(snap: Snap): Snap {
  const out = JSON.parse(JSON.stringify(snap, (key, value: unknown) => key === 'updatedAt' || key === 'waterOperations' ? undefined : value)) as Snap;
  const health = out[HEALTH_KEY], settings = out[DASHBOARD_SETTINGS_KEY];
  if (health) { for (const [group, list] of [['sleep', 'nights'], ['meditation', 'sessions']] as const) if (health[group] && !health[group][list].length && !health[group].goal) delete health[group]; if (health.moods && !Object.keys(health.moods.days).length) delete health.moods; delete health.schemaVersion; }
  if (settings) { if (settings.links && !settings.links.items.length) delete settings.links; delete settings.schemaVersion; }
  return out;
}
const systemOf = (body: Body) => String(body.messages[0]!.content);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The handle the page context gave a record (h1, g2, f3, r1), read from the request as the AI would. */
const handle = (body: Body, prefix: string, title: string) => new RegExp(`(${prefix}\\d+): ${esc(title)}`).exec(systemOf(body))?.[1] ?? `${prefix}0`;
/** The calendar day of the test's moment in a zone, and the day before it. */
const dayIn = (zone: string, shift = 0) => { const d = new Date(Date.parse(EVENING) + shift * 86_400_000); return new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(d); };
const clockIn = (iso: string, zone: string) => new Intl.DateTimeFormat('en-GB', {timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false}).format(new Date(iso));
const near = (iso: string) => { const ms = Date.parse(iso) - Date.parse(EVENING); expect(ms, `${iso} is within a minute of the test's moment`).toBeGreaterThanOrEqual(0); expect(ms).toBeLessThan(60_000); };
const habitOf = (snap: Snap, title: string) => snap[HABITS_KEY].habits.find((h: any) => h.title === title);
const goalOf = (snap: Snap, name: string) => snap[PLATFORM_KEY].goals.find((g: any) => g.name === name);
const rule = (h: any) => h.rules[h.rules.length - 1];
type Ctx = {zone: string; today: string; yesterday: string};
type Case = {kind: string; page: string; ask: string; reply: Reply; setup?: {ask: string; reply: Reply}[]; check: (after: Snap, before: Snap, ctx: Ctx) => void; visible?: {page: string; text: string}; daySensitive?: boolean};
const CASES: readonly Case[] = [
  {kind: 'log-water', page: '/app/health', ask: 'Log 300 ml of water', reply: () => block({kind: 'log-water', millilitres: 300}), daySensitive: true,
    check: (after, before, {today}) => { const water = after[HEALTH_KEY].daily.water; expect(water.length).toBe(before[HEALTH_KEY].daily.water.length + 1); expect(water.at(-1)).toMatchObject({date: today, amountMilli: 300_000, unit: 'ml'}); }},
  {kind: 'log-weight', page: '/app/health', ask: 'I weigh 72.5 kg', reply: () => block({kind: 'log-weight', value: 72.5, unit: 'kg'}), daySensitive: true,
    check: (after, _before, {today}) => { const mine = after[HEALTH_KEY].weights.filter((w: any) => w.date === today); expect(mine).toHaveLength(1); expect(mine[0].grams).toBe(72_500); }},
  {kind: 'log-steps', page: '/app/health', ask: 'Walked 8000 steps in 40 minutes', reply: () => block({kind: 'log-steps', steps: 8000, minutes: 40}), daySensitive: true,
    check: (after, before, {today}) => { const activity = after[HEALTH_KEY].activity; expect(activity.length).toBe(before[HEALTH_KEY].activity.length + 1); expect(activity.at(-1)).toMatchObject({date: today, name: 'Walk', steps: 8000, minutes: 40}); }},
  {kind: 'log-food (AI estimate)', page: '/app/health', ask: 'Two eggs for breakfast', reply: () => block({kind: 'log-food', name: 'Two eggs', meal: 'Breakfast', estimate: {kcal: 140, protein_g: 12, serving_g: 100}}), daySensitive: true, visible: {page: '/app/health', text: 'Two eggs'},
    check: (after, before, {today}) => {
      const {diary, foods} = after[HEALTH_KEY]; expect(diary.length).toBe(before[HEALTH_KEY].diary.length + 1); expect(foods.length).toBe(before[HEALTH_KEY].foods.length + 1);
      const food = foods.at(-1), entry = diary.at(-1);
      expect(food).toMatchObject({name: 'Two eggs', brand: 'AI estimate', servingGrams: 100, nutrients: {kcal: 140, proteinMg: 12_000, carbsMg: null, fatMg: null}});
      expect(entry).toMatchObject({date: today, meal: 'Breakfast', sourceKind: 'food', sourceId: food.id, quantityMilli: 1000});
    }},
  {kind: 'log-food (own food)', page: '/app/health', ask: 'Log my first food for lunch', reply: body => block({kind: 'log-food', name: 'x', meal: 'Lunch', food: handle(body, 'f', FIRST_FOOD)}), daySensitive: true,
    check: (after, before, {today}) => { const {diary, foods} = after[HEALTH_KEY]; expect(foods.length).toBe(before[HEALTH_KEY].foods.length); expect(diary.length).toBe(before[HEALTH_KEY].diary.length + 1); expect(diary.at(-1)).toMatchObject({date: today, meal: 'Lunch', sourceKind: 'food', sourceId: before[HEALTH_KEY].foods.find((f: any) => f.name === FIRST_FOOD).id, quantityMilli: 1000}); }},
  {kind: 'log-measurement', page: '/app/health', ask: 'Waist 82 cm', reply: () => block({kind: 'log-measurement', kind_of: 'waist', value: 82, unit: 'cm'}), daySensitive: true,
    check: (after, before, {zone}) => { const list = after[HEALTH_KEY].measurements ?? []; expect(list.length).toBe((before[HEALTH_KEY].measurements ?? []).length + 1); const m = list.at(-1); expect(m).toMatchObject({kind: 'waist', quantityMilli: 82_000, unit: 'cm', timezone: zone, sourceLabel: 'ZIGi · your AI'}); near(m.observedAt); }},
  {kind: 'check-in', page: '/app/habits', ask: 'Meditated 20 minutes', reply: body => block({kind: 'check-in', habit: handle(body, 'h', 'Meditate'), minutes: 20}), daySensitive: true,
    check: (after, _before, {today}) => { const entry = habitOf(after, 'Meditate').entries.find((e: any) => e.date === today); expect(entry).toMatchObject({date: today, count: 20}); }},
  {kind: 'skip', page: '/app/habits', ask: 'Skip reading today, rest day', reply: body => block({kind: 'skip', habit: handle(body, 'h', 'Read'), reason: 'rest day'}), daySensitive: true,
    check: (after, _before, {today}) => { const entry = habitOf(after, 'Read').entries.find((e: any) => e.date === today); expect(entry).toMatchObject({date: today, disposition: 'skipped', note: 'rest day'}); }},
  {kind: 'create-habit', page: '/app/habits', ask: 'New habit: evening walk, 20 minutes, Mon Wed Fri', reply: () => block({kind: 'create-habit', title: 'Evening walk', measurement: 'minutes', target: 20, schedule: {weekdays: [1, 3, 5]}, timeOfDay: 'evening', description: 'Around the block'}), daySensitive: true, visible: {page: '/app/habits', text: 'Evening walk'},
    check: (after, before, {today}) => {
      const habits = after[HABITS_KEY].habits; expect(habits.length).toBe(before[HABITS_KEY].habits.length + 1);
      const h = habits.at(-1); expect(h).toMatchObject({title: 'Evening walk', description: 'Around the block', category: 'Personal', timeOfDay: 'evening', startDate: today, entries: []});
      expect(rule(h)).toMatchObject({from: today, type: 'build', measurement: {kind: 'duration', unit: 'minutes'}, target: 20, targetPeriod: 'day', schedule: {kind: 'weekdays', days: [1, 3, 5]}, state: 'active'});
    }},
  {kind: 'start-fast', page: '/app/health', ask: 'Start a 16 hour fast', reply: () => block({kind: 'start-fast', targetHours: 16}),
    check: (after, before, {zone}) => { const sessions = after[FASTING_KEY].sessions; expect(sessions.length).toBe(before[FASTING_KEY].sessions.length + 1); const f = sessions.at(-1); expect(f).toMatchObject({targetHours: 16, endedAt: null, timeZone: zone}); near(f.startedAt); }},
  {kind: 'stop-fast', page: '/app/health', ask: 'Stop my fast', reply: () => block({kind: 'stop-fast'}), setup: [{ask: 'Start a 16 hour fast', reply: () => block({kind: 'start-fast', targetHours: 16})}],
    check: (after, before) => { const f = after[FASTING_KEY].sessions.at(-1); expect(before[FASTING_KEY].sessions.at(-1).endedAt).toBeNull(); expect(f).toMatchObject({targetHours: 16, stoppedBy: 'person'}); near(f.endedAt); }},
  {kind: 'create-goal (VALUE)', page: '/app/goals', ask: 'A goal: new laptop, 1500 euros by June 2027', reply: () => block({kind: 'create-goal', name: 'New laptop', type: 'VALUE', target: 1500, currency: 'EUR', targetDate: '2027-06-01', category: 'Custom'}), visible: {page: '/app/goals', text: 'New laptop'},
    check: (after, before) => { const goals = after[PLATFORM_KEY].goals; expect(goals.length).toBe(before[PLATFORM_KEY].goals.length + 1); const g = goals.at(-1); expect(g).toMatchObject({name: 'New laptop', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '150000', targetDate: '2027-06-01', category: 'Custom', notes: '', milestones: []}); near(g.createdAt); }},
  {kind: 'create-goal (PROJECT)', page: '/app/goals', ask: 'A project: renovate the kitchen, plans then quotes, by March 2027', reply: () => block({kind: 'create-goal', name: 'Renovate the kitchen', type: 'PROJECT', milestones: ['Plans drawn', 'Quotes in'], targetDate: '2027-03-01'}),
    check: (after, before) => { const goals = after[PLATFORM_KEY].goals; expect(goals.length).toBe(before[PLATFORM_KEY].goals.length + 1); expect(goals.at(-1)).toMatchObject({name: 'Renovate the kitchen', type: 'PROJECT', target: '1', decimals: 0, targetDate: '2027-03-01', milestones: [{title: 'Plans drawn', done: false}, {title: 'Quotes in', done: false}]}); }},
  {kind: 'add-goal-note', page: '/app/goals', ask: 'Note on my emergency fund: booked the flights', reply: body => block({kind: 'add-goal-note', goal: handle(body, 'g', 'Emergency fund'), note: 'Booked the flights.'}),
    check: (after, before) => { expect(goalOf(after, 'Emergency fund').notes).toBe(`${goalOf(before, 'Emergency fund').notes ? `${goalOf(before, 'Emergency fund').notes}\n` : ''}Booked the flights.`); }},
  {kind: 'create-food', page: '/app/health', ask: 'Add a food: protein shake, 300 ml, 200 kcal, 30 g protein', reply: () => block({kind: 'create-food', name: 'Protein shake', serving_ml: 300, estimate: {kcal: 200, protein_g: 30}}),
    check: (after, before) => { const foods = after[HEALTH_KEY].foods; expect(foods.length).toBe(before[HEALTH_KEY].foods.length + 1); expect(foods.at(-1)).toMatchObject({name: 'Protein shake', brand: 'AI estimate', servingGrams: null, servingMl: 300, nutrients: {kcal: 200, proteinMg: 30_000, carbsMg: null, fatMg: null}}); }},
  {kind: 'create-recipe', page: '/app/health', ask: 'A recipe: lentil soup, 4 servings, 250 g red lentils', reply: () => block({kind: 'create-recipe', name: 'Lentil soup', servings: 4, ingredients: [{name: 'Red lentils', grams: 250, estimate_per_100g: {kcal: 116}}]}),
    check: (after, before) => {
      const {recipes, foods} = after[HEALTH_KEY]; expect(recipes.length).toBe(before[HEALTH_KEY].recipes.length + 1); expect(foods.length).toBe(before[HEALTH_KEY].foods.length + 1);
      const food = foods.at(-1), recipe = recipes.at(-1);
      expect(food).toMatchObject({name: 'Red lentils', brand: 'AI estimate', servingGrams: 100, nutrients: {kcal: 116, proteinMg: null, carbsMg: null, fatMg: null}});
      expect(recipe).toMatchObject({name: 'Lentil soup', portionsMilli: 4000, items: [{foodId: food.id, quantityMilli: 2500}]});
    }},
  {kind: 'plan-meal', page: '/app/health', ask: 'Plan the lentil soup for dinner', reply: body => block({kind: 'plan-meal', recipe: handle(body, 'r', 'Lentil soup'), servings: 1, meal: 'Dinner'}), daySensitive: true,
    setup: [{ask: 'A recipe: lentil soup, 4 servings, 250 g red lentils', reply: () => block({kind: 'create-recipe', name: 'Lentil soup', servings: 4, ingredients: [{name: 'Red lentils', grams: 250}]})}],
    check: (after, before, {today}) => {
      const {plans, savedMeals} = after[HEALTH_KEY].daily; expect(plans.length).toBe(before[HEALTH_KEY].daily.plans.length + 1); expect(savedMeals.length).toBe(before[HEALTH_KEY].daily.savedMeals.length + 1);
      const meal = savedMeals.at(-1); expect(meal.name).toBe('Lentil soup'); expect(plans.at(-1)).toMatchObject({date: today, meal: 'Dinner', savedMealId: meal.id});
    }},
  {kind: 'grocery-item', page: '/app/health', ask: 'Add oat milk and spinach to my groceries', reply: () => block({kind: 'grocery-item', items: ['Oat milk', 'Spinach']}),
    check: after => { expect(after[HEALTH_KEY].daily.groceryNotes).toMatch(/(^|\n)- Oat milk\n- Spinach$/); }},
  {kind: 'counter', page: '/app/health', ask: '20 push-ups', reply: () => block({kind: 'counter', counter: 'Push-ups', count: 20}), daySensitive: true,
    check: (after, before, {today}) => {
      const counter = after[HEALTH_KEY].exercise.counters.find((c: any) => c.name === 'Push-ups'), day = (snap: Snap) => snap[HEALTH_KEY].exercise.days.find((d: any) => d.counterId === counter.id && d.date === today);
      expect(day(after).count).toBe((day(before)?.count ?? 0) + 20);
    }},
  {kind: 'create-reminder (habit)', page: '/app/habits', ask: 'Remind me to meditate at 7:30', reply: body => block({kind: 'create-reminder', for: 'habit', habit: handle(body, 'h', 'Meditate'), time: '07:30'}),
    check: after => { expect(after[REMINDERS_KEY].habits[habitOf(after, 'Meditate').id]).toEqual({time: '07:30'}); }},
  {kind: 'create-reminder (water)', page: '/app', ask: 'Remind me to drink water at 10', reply: () => block({kind: 'create-reminder', for: 'water', time: '10:00'}),
    check: after => { expect(after[REMINDERS_KEY].water).toEqual({time: '10:00'}); }},
  {kind: 'create-reminder (goal)', page: '/app/goals', ask: 'A weekly check-in on my emergency fund, Sundays at 18:00', reply: body => block({kind: 'create-reminder', for: 'goal', goal: handle(body, 'g', 'Emergency fund'), time: '18:00', weekday: 0}),
    check: after => { expect(after[ZIGI_REMINDERS_KEY].goalCheckIns[`private:${goalOf(after, 'Emergency fund').id}`]).toEqual({weekday: 0, time: '18:00'}); }},
  {kind: 'review-intention', page: '/app', ask: 'My intention this week: walk after lunch on three days', reply: () => block({kind: 'review-intention', intention: 'Walk after lunch on three days'}),
    check: (after, before) => { const mine = (snap: Snap) => (snap[WEEKLY_REVIEW_KEY]?.reviews ?? []).filter((r: any) => r.notes?.intention === 'Walk after lunch on three days'); expect(mine(before)).toHaveLength(0); expect(mine(after)).toHaveLength(1); }},
  {kind: 'remember', page: '/app', ask: 'Remember that I am training for a half marathon in April', reply: () => block({kind: 'remember', text: 'Training for a half marathon in April', category: 'goals'}),
    check: (after, before) => { const notes = after[AI_MEMORY_KEY]?.notes ?? []; expect(notes.length).toBe((before[AI_MEMORY_KEY]?.notes ?? []).length + 1); expect(notes.at(-1)).toMatchObject({text: 'Training for a half marathon in April', category: 'goals', source: 'zigi'}); }},
  {kind: 'log-sleep', page: '/app/health', ask: 'Last night I slept from 22:30 to 06:30, a 4', reply: () => block({kind: 'log-sleep', wake: '06:30', bedtime: '22:30', quality: 4, day: 'yesterday'}), daySensitive: true,
    check: (after, before, {zone, yesterday}) => {
      const nights = after[HEALTH_KEY].sleep?.nights ?? []; expect(nights.length).toBe((before[HEALTH_KEY].sleep?.nights ?? []).length + 1);
      const n = nights.at(-1); expect(n).toMatchObject({kind: 'night', quality: 4, timeZone: zone});
      expect(dayIn(zone, 0) >= yesterday).toBe(true); expect(clockIn(n.end, zone)).toBe('06:30'); expect(new Intl.DateTimeFormat('en-CA', {timeZone: zone}).format(new Date(n.end))).toBe(yesterday);
      expect(clockIn(n.start, zone)).toBe('22:30'); expect(Date.parse(n.end) - Date.parse(n.start)).toBe(8 * 3_600_000);
    }},
  {kind: 'log-meditation', page: '/app/health', ask: 'Yesterday I meditated 15 minutes at 7:30', reply: () => block({kind: 'log-meditation', minutes: 15, time: '07:30', day: 'yesterday', note: 'after the run'}), daySensitive: true,
    check: (after, before, {zone, yesterday}) => {
      const sessions = after[HEALTH_KEY].meditation?.sessions ?? []; expect(sessions.length).toBe((before[HEALTH_KEY].meditation?.sessions ?? []).length + 1);
      const s = sessions.at(-1); expect(s).toMatchObject({seconds: 900, kind: 'manual', timeZone: zone, note: 'after the run'});
      expect(clockIn(s.startedAt, zone)).toBe('07:30'); expect(new Intl.DateTimeFormat('en-CA', {timeZone: zone}).format(new Date(s.startedAt))).toBe(yesterday);
    }},
  {kind: 'add-milestone', page: '/app/goals', ask: 'A milestone on my emergency fund at 1000', reply: body => block({kind: 'add-milestone', goal: handle(body, 'g', 'Emergency fund'), title: 'First 1,000 saved', value: 1000}),
    check: (after, before) => { const ms = goalOf(after, 'Emergency fund').milestones; expect(ms.length).toBe(goalOf(before, 'Emergency fund').milestones.length + 1); expect(ms.at(-1)).toMatchObject({title: 'First 1,000 saved', done: false, target: '100000'}); }},
  {kind: 'start-challenge', page: '/app/habits', ask: 'A 30 day reading challenge', reply: body => block({kind: 'start-challenge', habit: handle(body, 'h', 'Read'), days: 30}), daySensitive: true,
    check: (after, _before, {zone}) => { const end = dayIn(zone, 29), h = habitOf(after, 'Read'); expect(h.endCondition).toEqual({kind: 'date', date: end}); expect(rule(h).endCondition).toEqual({kind: 'date', date: end}); }},
  {kind: 'stack-habit', page: '/app/habits', ask: 'Put meditation right after reading', reply: body => block({kind: 'stack-habit', habit: handle(body, 'h', 'Meditate'), after: handle(body, 'h', 'Read')}),
    check: after => { expect(habitOf(after, 'Meditate').stackAfterId).toBe(habitOf(after, 'Read').id); }},
  {kind: 'edit-habit', page: '/app/habits', ask: 'Rename meditate to evening meditation, 15 minutes, in the evening', reply: body => block({kind: 'edit-habit', habit: handle(body, 'h', 'Meditate'), title: 'Evening meditation', target: 15, timeOfDay: 'evening'}), daySensitive: true, visible: {page: '/app/habits', text: 'Evening meditation'},
    check: (after, before, {today}) => { const h = habitOf(after, 'Evening meditation'); expect(h.id).toBe(habitOf(before, 'Meditate').id); expect(h.timeOfDay).toBe('evening'); expect(rule(h)).toMatchObject({from: today, target: 15, measurement: rule(habitOf(before, 'Meditate')).measurement}); expect(h.entries).toEqual(habitOf(before, 'Meditate').entries); }},
  {kind: 'edit-goal', page: '/app/goals', ask: 'Rename my emergency fund to Emergency fund 2027, by May 2027', reply: body => block({kind: 'edit-goal', goal: handle(body, 'g', 'Emergency fund'), name: 'Emergency fund 2027', targetDate: '2027-05-01', notes: 'Three months of costs'}), visible: {page: '/app/goals', text: 'Emergency fund 2027'},
    check: (after, before) => { const was = goalOf(before, 'Emergency fund'), g = goalOf(after, 'Emergency fund 2027'); expect(g).toEqual({...was, name: 'Emergency fund 2027', targetDate: '2027-05-01', notes: 'Three months of costs'}); }},
  {kind: 'log-mood', page: '/app', ask: 'Today felt good, a calm evening', reply: () => block({kind: 'log-mood', mood: 4, note: 'Calm evening'}), daySensitive: true,
    check: (after, _before, {today}) => { const mood = after[HEALTH_KEY].moods.days[today]; expect(mood).toMatchObject({mood: 4, note: 'Calm evening'}); near(mood.at); }},
  {kind: 'add-link', page: '/app', ask: 'Add my running club link https://www.strava.com/clubs/zig', reply: () => block({kind: 'add-link', label: 'Running club', url: 'https://www.strava.com/clubs/zig'}), visible: {page: '/app', text: 'Running club'},
    check: (after, before) => { const items = after[DASHBOARD_SETTINGS_KEY].links.items; expect(items.length).toBe((before[DASHBOARD_SETTINGS_KEY].links?.items ?? []).length + 1); expect(items.at(-1)).toMatchObject({label: 'Running club', url: 'https://www.strava.com/clubs/zig', icon: 'strava', order: items.length - 1}); near(items.at(-1).createdAt); }},
  {kind: 'add-widget', page: '/app/habits', ask: 'Put my meditation streak on Today', reply: body => block({kind: 'add-widget', widget: 'habit', habit: handle(body, 'h', 'Meditate'), metric: 'streak', title: 'Meditation streak'}), visible: {page: '/app', text: 'Meditation streak'},
    check: (after, before) => { const widgets = after[DASHBOARD_SETTINGS_KEY].widgets; expect(widgets.length).toBe(before[DASHBOARD_SETTINGS_KEY].widgets.length + 1); expect(widgets.at(-1)).toMatchObject({kind: 'habit', metric: 'streak', entity: habitOf(after, 'Meditate').id, title: 'Meditation streak', size: 'compact', hidden: false, revision: 1}); }},
];
const FIRST_FOOD = JSON.parse(buildShowcase(DAY).records['zigoals:health:v1']!).foods[0].name as string;
const ZONES = ['UTC', 'Europe/Brussels', 'Asia/Tokyo'] as const;

test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
for (const zone of ZONES) {
  test.describe(`in ${zone}`, () => {
    test.use({timezoneId: zone});
    const cases = zone === 'UTC' ? CASES : CASES.filter(c => c.daySensitive);
    for (const c of cases) {
      test(`${c.kind}: accepted means the record is exactly right, and Undo puts it back`, async ({page}, info) => {
        const ctx: Ctx = {zone, today: dayIn(zone), yesterday: dayIn(zone, -1)};
        await server(page, [...(c.setup ?? []).map(s => s.reply), c.reply, c.reply]);
        await seed(page);
        await page.goto(c.page);
        await openChat(page);
        for (const step of c.setup ?? []) { await send(page, step.ask); await panel(page).locator('.ai-card').last().getByRole('button', {name: 'Add', exact: true}).click(); await expect(panel(page).locator('.ai-card').last()).toHaveClass(/ai-card-added/); }
        const before = await snapshot(page);
        await send(page, c.ask);
        const card = panel(page).locator('.ai-card').last();
        await expect(card.locator('.ai-card-refused')).toHaveCount(0);
        await card.getByRole('button', {name: 'Add', exact: true}).click();
        await expect(card).toHaveClass(/ai-card-added/);
        const after = await snapshot(page);
        c.check(after, before, ctx);
        const actions = after[AI_ACTIONS_KEY].actions; expect(actions.length).toBe((before[AI_ACTIONS_KEY]?.actions ?? []).length + 1);
        await panel(page).getByRole('button', {name: /^Undo/}).click();
        await expect(card).toHaveClass(/ai-card-undone/);
        const undone = await snapshot(page);
        expect(normalise(undone), 'every store exactly as before the card').toEqual(normalise(before));
        if (c.visible && zone === 'UTC' && info.project.name === 'desktop') {
          await send(page, c.ask);
          await panel(page).locator('.ai-card').last().getByRole('button', {name: 'Add', exact: true}).click();
          await expect(panel(page).locator('.ai-card').last()).toHaveClass(/ai-card-added/);
          await page.goto(c.visible.page);
          await expect(page.locator('main')).toContainText(c.visible.text);
        }
      });
    }
  });
}
