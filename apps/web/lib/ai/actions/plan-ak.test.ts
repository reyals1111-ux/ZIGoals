import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner} from './plan';
beforeAll(() => loadAaPlanner()); // the AK planner rides in the AA chunk
import {createHabit, emptyHabitData, type HabitData, type HabitInput} from '../../habits';
import {createEmptyHealth, healthSchema} from '../../health';
import {emptyPlatform, type Platform} from '../../positions';
import {emptyReminders} from '../../reminders/schema';
import {presetSettings} from '../../dashboard-settings';
import {emptyWeeklyReview} from '../../weekly-review/schema';
import {AUTO_RULES_KEY, emptyAutoRules, type AutoRules} from '../../auto-rules/schema';
import {BILLS_KEY, emptyBills, type BillsRecord} from '../../bills/schema';
import {GROCERY_KEY, emptyGroceryRecord} from '../../grocery/schema';
import {GOAL_WIZARD_DRAFT_KEY} from '../../goals/nl-bundle-create';
import {PROJECTION_LABEL} from '../../goals/what-if';
import type {Handle} from '../context/types';
import {planAction, type Env, type Plan, type Stores} from './plan';
import {actionSchema, type Action} from './schema';
import {applyDeviceWrite, DEVICE_WRITE_KEYS} from './device-writes';
import {AUTO_ACCEPT_NEVER, autoAcceptVerdict} from './auto-accept';
import {akEffect} from './ak-effects';
import {runnerEffect} from '../../../components/ai/runner-effects';
import {showcaseSources} from '../tools/fixtures';
import {mondayOf} from './plan-ak';

/** Session AK (Part 12): the planner's cases for this session's kinds: every card is a confirm card, never automatic. */
const DAY = '2026-10-21', now = new Date('2026-10-21T08:00:00Z'), AT = new Date('2026-09-01T06:00:00Z');
const ID = {walk: '33333333-3333-4333-8333-333333333333', gym: '44444444-4444-4444-8444-444444444444'};
const input = (title: string): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}});
function habits(): HabitData {
  let d = {...emptyHabitData(), timeZone: 'UTC'} as HabitData;
  d = createHabit(d, input('Walk'), AT, ID.walk);
  d = createHabit(d, input('Gym'), AT, ID.gym);
  return d;
}
const stores = (platform: Platform = emptyPlatform()): Stores => ({habits: habits(), health: healthSchema.parse({...createEmptyHealth(), schemaVersion: 4}), platform, fasting: {version: 1, sessions: []}, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: emptyWeeklyReview(), memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true}});
const handlesOf = (s: Stores): Handle[] => [...s.habits.habits.map((h, i) => ({handle: `h${i + 1}`, kind: 'habit' as const, id: h.id, label: h.title})), ...s.platform.goals.map((g, i) => ({handle: `g${i + 1}`, kind: 'goal' as const, id: `private:${g.id}`, label: g.name}))];
const records = (autoRules: AutoRules = emptyAutoRules(), bills: BillsRecord = emptyBills()) => ({autoRules, bills});
const env = (extra: Partial<Env> = {}, platform?: Platform): Env => { const s = stores(platform); return {stores: s, handles: handlesOf(s), now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC', akRecords: records(), ...extra}; };
const plan = (raw: Record<string, unknown>, e = env()): Plan => { const r = planAction(actionSchema.parse(raw) as Action, e); if (!r.ok) throw new Error(r.message); return r.plan; };
const refusal = (raw: Record<string, unknown>, e = env()): string => { const r = planAction(actionSchema.parse(raw) as Action, e); if (r.ok) throw new Error('expected a refusal'); return r.message; };
const AK = ['set-auto-rule', 'set-bill-reminder', 'grocery-list', 'goal-draft', 'what-if', 'scan-food', 'start-soundscape'] as const;

test('every AK kind is a confirm card: a form card (never batched), on the never list, never automatic even when switched on', () => {
  const all = {version: 1 as const, autoAccept: {kinds: Object.fromEntries(AK.map(k => [k, true])), dailyCap: 100, days: {}}};
  for (const kind of AK) { expect(AUTO_ACCEPT_NEVER).toContain(kind); expect(autoAcceptVerdict(all, kind, DAY, true)).toEqual({ok: false, reason: 'never'}); }
  for (const key of [AUTO_RULES_KEY, BILLS_KEY, GROCERY_KEY]) expect(DEVICE_WRITE_KEYS).toContain(key);
});

describe('set-auto-rule', () => {
  test('a new rule: the rules\' own sentence, a device write through the rules\' engine, no Undo but the habit\'s rules', () => {
    const p = plan({kind: 'set-auto-rule', habit: 'h1', source: 'steps', threshold: 8000});
    expect(p.target).toBe('form'); expect(p.write(stores())).toEqual({}); expect(p.undo).toBeNull();
    expect(p.card.title).toBe('Auto-complete: When steps ≥ 8,000 → Walk is done');
    expect(p.device?.key).toBe(AUTO_RULES_KEY);
    expect(runnerEffect(p)).toMatchObject({kind: 'record', key: AUTO_RULES_KEY});
    const after = applyDeviceWrite(AUTO_RULES_KEY, emptyAutoRules(), p.device!.patch) as AutoRules;
    expect(after.rules).toHaveLength(1); expect(after.rules[0]).toMatchObject({habitId: ID.walk, source: 'steps', comparator: 'at-least', threshold: 8000, unit: 'steps'});
  });
  test('adjusting: a second card for the same habit and source replaces that rule (same id and start); the same rule again is refused', () => {
    const first = plan({kind: 'set-auto-rule', habit: 'Walk', source: 'steps', threshold: 8000});
    const rules = applyDeviceWrite(AUTO_RULES_KEY, emptyAutoRules(), first.device!.patch) as AutoRules;
    const e = env({akRecords: records(rules)});
    const second = plan({kind: 'set-auto-rule', habit: 'h1', source: 'steps', threshold: 10000}, e);
    expect(second.card.lines[0]).toBe('Replaces: When steps ≥ 8,000 → Walk is done');
    const after = applyDeviceWrite(AUTO_RULES_KEY, rules, second.device!.patch) as AutoRules;
    expect(after.rules).toHaveLength(1); expect(after.rules[0]!.id).toBe(rules.rules[0]!.id); expect(after.rules[0]!.threshold).toBe(10000); expect(after.rules[0]!.createdAt).toBe(rules.rules[0]!.createdAt);
    expect(refusal({kind: 'set-auto-rule', habit: 'h1', source: 'steps', threshold: 8000}, e)).toMatch(/already set/);
  });
  test('a workout rule without a figure is "when one is logged"; a habit of this reply (new1) is named; unknown habits and bad figures are refused', () => {
    expect(plan({kind: 'set-auto-rule', habit: 'Gym', source: 'workout', workout_type: 'strength'}).card.title).toBe('Auto-complete: When a strength workout is logged → Gym is done');
    const refs = new Map([['new1', {id: '55555555-5555-4555-8555-555555555555', title: 'Stretch'}]]);
    expect(plan({kind: 'set-auto-rule', habit: 'new1', source: 'sleep', threshold: 7}, env({refs})).card.lines).toContain('For the new habit "Stretch": add that card first');
    expect(refusal({kind: 'set-auto-rule', habit: 'new2', source: 'sleep', threshold: 7})).toMatch(/not proposed in this reply/);
    expect(refusal({kind: 'set-auto-rule', habit: 'Juggling', source: 'steps', threshold: 8000})).toBeTruthy();
    expect(refusal({kind: 'set-auto-rule', habit: 'h1', source: 'sleep', threshold: 30})).toMatch(/24 hours/);
    expect(() => actionSchema.parse({kind: 'set-auto-rule', habit: 'h1', source: 'contribution'})).toThrow();
    expect(refusal({kind: 'set-auto-rule', habit: 'h1', source: 'steps', threshold: 8000}, env({akRecords: {...records(), unreadable: true}}))).toMatch(/cannot be read/);
  });
});

describe('set-bill-reminder (money: a reminder only, never automatic)', () => {
  test('a new bill through the bills\' own checks; its note to self rides along', () => {
    const p = plan({kind: 'set-bill-reminder', title: 'Gym membership', amount: 29.99, currency: 'EUR', cadence: 'monthly', next_due: '2026-11-05', note: 'cancel before March'});
    expect(p.card.title).toBe('Bill reminder: Gym membership'); expect(p.card.lines).toContain('A reminder only: ZIGoals never pays, cancels or moves money');
    const after = applyDeviceWrite(BILLS_KEY, emptyBills(), p.device!.patch) as BillsRecord;
    expect(after.bills).toHaveLength(1); expect(after.bills[0]).toMatchObject({title: 'Gym membership', amount: '29.99', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-05', origin: 'manual', cancelNote: 'cancel before March'});
    expect(refusal({kind: 'set-bill-reminder', title: 'Gym', amount: 10})).toMatch(/next due/);
    expect(refusal({kind: 'set-bill-reminder', title: 'Gym', next_due: '2026-11-05'})).toMatch(/how much/);
    expect(refusal({kind: 'set-bill-reminder', title: 'Gym', amount: '12.345', next_due: '2026-11-05'})).toMatch(/two decimals/);
  });
  test('a bill already there: only its note changes; without a note the card is refused', () => {
    const bills = applyDeviceWrite(BILLS_KEY, emptyBills(), plan({kind: 'set-bill-reminder', title: 'Spotify', amount: 10.99, next_due: '2026-11-02'}).device!.patch) as BillsRecord;
    const e = env({akRecords: records(emptyAutoRules(), bills)});
    const p = plan({kind: 'set-bill-reminder', title: 'spotify', note: 'cancel after the trip', cancel_by: '2026-12-01'}, e);
    expect(p.device?.patch).toEqual({note: {billId: bills.bills[0]!.id, note: 'cancel after the trip', cancelBy: '2026-12-01'}});
    expect((applyDeviceWrite(BILLS_KEY, bills, p.device!.patch) as BillsRecord).bills[0]).toMatchObject({amount: '10.99', cancelNote: 'cancel after the trip', cancelBy: '2026-12-01'});
    expect(refusal({kind: 'set-bill-reminder', title: 'Spotify', amount: 1}, e)).toMatch(/already in your bills/);
  });
});

test('grocery-list: this week\'s or next week\'s list (Monday first), each name once, a Health card', () => {
  const p = plan({kind: 'grocery-list', items: ['Oats', 'Spinach', 'oats']});
  expect(mondayOf(DAY)).toBe('2026-10-19');
  expect(p.healthContent).toBe(true); expect(p.card.title).toBe('Add to your grocery list: 2 items');
  const after = applyDeviceWrite(GROCERY_KEY, emptyGroceryRecord(), p.device!.patch) as ReturnType<typeof emptyGroceryRecord>;
  expect(after.added?.['2026-10-19']?.map(i => i.name)).toEqual(['Oats', 'Spinach']);
  expect((plan({kind: 'grocery-list', items: ['Milk'], week: 'next'}).device!.patch as {add: {weekStart: string}}).add.weekStart).toBe('2026-10-26');
});

test('goal-draft: the Goal wizard\'s own draft is kept for the form; nothing is saved; a currency the wizard lacks is typed there', () => {
  const p = plan({kind: 'goal-draft', name: 'House deposit', target: 30000, currency: 'EUR', date: '2028-06-01', suggested_per_month: 1500});
  expect(p.navigate).toEqual({href: '/app/goals/new', label: 'Goals → New goal'});
  expect(p.card.lines).toContain('Opens the goal form filled in; nothing is saved until you create the goal there');
  expect(p.card.lines.some(l => /a suggestion, not filled in/.test(l))).toBe(true);
  const effect = akEffect(p)!;
  expect(effect.stash?.key).toBe(GOAL_WIZARD_DRAFT_KEY); expect(effect.stash?.value).toMatchObject({from: 'words', name: 'House deposit', type: 'VALUE', target: '30000', asset: 'EUR', date: '2028-06-01'});
  expect(effect.stash?.value).not.toHaveProperty('planAmount'); // the suggestion is never a pre-fill
  expect(plan({kind: 'goal-draft', name: 'Trip', target: 5000, currency: 'GBP'}).card.lines[0]).toMatch(/type it in the form/);
  // A stash only ever reaches the wizard's own key on its own page, with its own text fields.
  expect(akEffect({...p, navigate: {href: '/app/settings', label: 'x'}})).toBeNull();
  expect(akEffect({...p, ak: {stash: {key: 'zigoals:platform:v1', value: {from: 'words'}}}})).toBeNull();
  expect(akEffect({...p, ak: {stash: {key: GOAL_WIZARD_DRAFT_KEY, value: {from: 'words', name: 'x', secret: 'y'}}}})).toBeNull();
});

test('what-if: an answer card labelled a projection; it writes nothing and opens the goal\'s own what-if', () => {
  const platform = showcaseSources(DAY).platform, goal = platform.goals.find(g => g.status !== 'closed' && g.type !== 'PROJECT')!;
  const e = env({}, platform);
  const r = planAction(actionSchema.parse({kind: 'what-if', goal: goal.name, extra_per_month: 100}) as Action, e);
  expect(r.ok).toBe(true); // the Showcase's Emergency fund has a recorded pace
  if (r.ok) {
    expect(r.plan.card.lines[0]).toMatch(/^With 100 USD more a month$/); expect(r.plan.card.lines[2]).toMatch(/days sooner/);
    expect(r.plan.target).toBe('form'); expect(r.plan.device).toBeUndefined(); expect(r.plan.write(stores())).toEqual({});
    expect(r.plan.card.lines).toContain(PROJECTION_LABEL); expect(r.plan.navigate?.href).toMatch(/#what-if$/);
    expect(runnerEffect(r.plan)).toMatchObject({kind: 'navigate'});
  }
  expect(refusal({kind: 'what-if', goal: 'A house on the moon', extra_per_month: 100}, e)).toMatch(/No goal of yours/);
  expect(() => actionSchema.parse({kind: 'what-if', goal: 'g1'})).toThrow(); // a what-if says what changes
});

test('scan-food: opens the barcode lookup, the label reader or the meal photo; never logs', () => {
  const b = plan({kind: 'scan-food', mode: 'barcode', barcode: '5449000000996'});
  expect(b.navigate?.href).toBe('/app/health?barcode=5449000000996#diary'); expect(runnerEffect(b)).toMatchObject({kind: 'navigate', href: '/app/health?barcode=5449000000996#diary'});
  expect(b.card.lines).toContain('Nothing is logged until you check the values and confirm there');
  expect(plan({kind: 'scan-food', mode: 'meal-photo'}).navigate?.href).toBe('/app/health#foods');
  expect(plan({kind: 'scan-food', mode: 'label'}).ak?.button).toBe('Open');
  expect(() => actionSchema.parse({kind: 'scan-food', mode: 'barcode', barcode: '123; drop'})).toThrow();
});

test('start-soundscape: the card\'s own button starts it (the runner calls startSoundscape inside the tap); nothing else', () => {
  const p = plan({kind: 'start-soundscape', preset: 'wind-down'});
  expect(akEffect(p)).toEqual({soundscape: 'wind-down'}); expect(p.ak?.button).toBe('Play'); expect(p.navigate).toBeUndefined(); expect(p.device).toBeUndefined();
  expect(p.card.lines).toContain('Fades out after 30 minutes');
  expect(akEffect({ak: {soundscape: 'thunder'}})).toBeNull();
});

test('the weekly review is the Life review\'s week: "weekly-review" is an alias, the week its default', () => {
  expect(actionSchema.parse({kind: 'open-review'})).toEqual({kind: 'open-review', period: 'week'});
});
