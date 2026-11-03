import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner} from './plan';
beforeAll(() => loadAaPlanner()); // the F9 planner rides in the AA chunk with Session AK's
import {buildShowcase} from '../../showcase-data';
import {accountsSchema, ACCOUNTS_KEY, type Accounts} from '../../accounts/schema';
import {DEBT_PLANNER_KEY, debtPlannerSchema, emptyDebtPlanner, type DebtPlannerRecord} from '../../debt-planner/store';
import {SAVINGS_CHALLENGES_KEY, emptySavingsChallenges, savingsChallengesSchema, type SavingsChallenges} from '../../savings-challenges/challenges';
import {SUPPLEMENTS_KEY, emptySupplements, supplementsSchema, type Supplements} from '../../supplements/schema';
import {AGENDA_KEY, emptyAgenda, type AgendaRecord} from '../../agenda/store';
import {emptyHabitData} from '../../habits';
import {createEmptyHealth, healthSchema} from '../../health';
import {platformSchema, type Platform} from '../../positions';
import {emptyReminders} from '../../reminders/schema';
import {presetSettings} from '../../dashboard-settings';
import {emptyWeeklyReview} from '../../weekly-review/schema';
import {emptyAutoRules} from '../../auto-rules/schema';
import {emptyBills} from '../../bills/schema';
import type {Handle} from '../context/types';
import {planAction, type Env, type Plan, type Stores} from './plan';
import {actionSchema, KIND_ALIASES, type Action} from './schema';
import {applyDeviceWrite, DEVICE_WRITE_KEYS} from './device-writes';
import {AUTO_ACCEPT_NEVER, autoAcceptVerdict} from './auto-accept';
import {answerOnly} from './decline';
import {runnerEffect} from '../../../components/ai/runner-effects';
import type {F9Records} from './plan-ak-f9';

/**
 * Owner follow-up 1 (F9): the planner's cases for the F4–F5 cards, on the Showcase's own records. Every card is a confirm
 * card (a form card, never batched, never automatic), each writes through its feature's own functions, money is never
 * moved or paid, and a name is matched against the person's records (one match, never a guess).
 */
const DAY = '2026-10-31', now = new Date(`${DAY}T10:00:00Z`);
const {records} = buildShowcase(DAY);
const parse = <T>(key: string, schema: {parse: (v: unknown) => T}) => schema.parse(JSON.parse(records[key]!));
const platform = parse(`zigoals:platform:v1`, platformSchema) as Platform;
const f9 = (over: Partial<F9Records> = {}): F9Records => ({supplements: parse(SUPPLEMENTS_KEY, supplementsSchema) as Supplements, accounts: parse(ACCOUNTS_KEY, accountsSchema) as Accounts,
  debtPlanner: parse(DEBT_PLANNER_KEY, debtPlannerSchema) as DebtPlannerRecord, savingsChallenges: parse(SAVINGS_CHALLENGES_KEY, savingsChallengesSchema) as SavingsChallenges, ...over});
const stores = (): Stores => ({habits: {...emptyHabitData(), timeZone: 'UTC'}, health: healthSchema.parse({...createEmptyHealth(), schemaVersion: 4}), platform, fasting: {version: 1, sessions: []}, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: emptyWeeklyReview(), memory: {version: 1}, settings: {...presetSettings('balanced'), version: 1} as Stores['settings']});
const env = (over: Partial<F9Records> = {}): Env => { const s = stores(); const handles: Handle[] = s.platform.goals.map((g, i) => ({handle: `g${i + 1}`, kind: 'goal' as const, id: `private:${g.id}`, label: g.name})); return {stores: s, handles, now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC', akRecords: {autoRules: emptyAutoRules(), bills: emptyBills(), f9: f9(over)}}; };
const plan = (raw: Record<string, unknown>, e = env()): Plan => { const r = planAction(actionSchema.parse(raw) as Action, e); if (!r.ok) throw new Error(r.message); return r.plan; };
const refusal = (raw: Record<string, unknown>, e = env()): string => { const r = planAction(actionSchema.parse(raw) as Action, e); if (r.ok) throw new Error('expected a refusal'); return r.message; };
const F9 = ['log-supplement', 'set-debt-plan', 'start-savings-challenge', 'open-agenda', 'open-wrapped'] as const;

test('every F9 kind is a confirm card: a form card, on the never list, never automatic even when switched on; four records join the writers', () => {
  const all = {version: 1 as const, autoAccept: {kinds: Object.fromEntries(F9.map(k => [k, true])), dailyCap: 100, days: {}}};
  for (const kind of F9) { expect(AUTO_ACCEPT_NEVER).toContain(kind); expect(autoAcceptVerdict(all, kind, DAY, true)).toEqual({ok: false, reason: 'never'}); }
  for (const key of [SUPPLEMENTS_KEY, DEBT_PLANNER_KEY, SAVINGS_CHALLENGES_KEY, AGENDA_KEY]) expect(DEVICE_WRITE_KEYS).toContain(key);
  expect(KIND_ALIASES.supplement).toBe('log-supplement'); expect(KIND_ALIASES.wrapped).toBe('open-wrapped'); expect(KIND_ALIASES.calendar).toBe('open-agenda');
});

describe('log-supplement', () => {
  test('a planned dose on the person\'s own list: the next unlogged time, written through markSupplement; no advice', () => {
    const p = plan({kind: 'log-supplement', name: 'magnesium (showcase)'});
    expect(p.target).toBe('form'); expect(p.undo).toBeNull(); expect(p.healthContent).toBe(true); expect(p.ak?.button).toBe('Log it');
    expect(p.card.title).toBe('Taken: Magnesium (Showcase) (1 tablet)'); expect(p.card.lines.join(' ')).toMatch(/no advice and no dose check/);
    expect(runnerEffect(p)).toMatchObject({kind: 'record', key: SUPPLEMENTS_KEY});
    const after = applyDeviceWrite(SUPPLEMENTS_KEY, f9().supplements, p.device!.patch) as Supplements;
    expect(after.log!.find(m => m.itemId === 'supp_showcase-mag' && m.date === DAY)).toMatchObject({slot: '21:30', status: 'taken'});
  });
  test('already logged is refused; a time it does not have is refused; two matches are a question', () => {
    expect(refusal({kind: 'log-supplement', name: 'Vitamin D (Showcase)'})).toMatch(/already logged/);
    expect(refusal({kind: 'log-supplement', name: 'Magnesium (Showcase)', time: '07:00'})).toMatch(/planned at/);
    expect(refusal({kind: 'log-supplement', name: 'showcase'})).toMatch(/More than one/);
    expect(plan({kind: 'log-supplement', name: 'Vitamin D (Showcase)', status: 'skipped', day: 'yesterday'}).card.lines[0]).toMatch(/^yesterday \(2026-10-30\), the .+ dose \(was taken\)$/);
  });
  test('an item not on the list is added as needed and marked at once (one patch: add, then mark)', () => {
    const p = plan({kind: 'log-supplement', name: 'Iron', dose: '1 tablet'}, env({supplements: emptySupplements()}));
    expect(p.card.lines[0]).toMatch(/^New on your list, as needed/);
    const after = applyDeviceWrite(SUPPLEMENTS_KEY, emptySupplements(), p.device!.patch) as Supplements;
    expect(after.items).toHaveLength(1); expect(after.items![0]).toMatchObject({name: 'Iron', dose: '1 tablet', times: []});
    expect(after.log).toEqual([expect.objectContaining({itemId: after.items![0]!.id, date: DAY, slot: 'any', status: 'taken'})]);
    // The writer checks the patch again: a second add of the same name, or a patch of another shape, is refused.
    expect(() => applyDeviceWrite(SUPPLEMENTS_KEY, after, p.device!.patch)).toThrow(/already on your list/);
    expect(() => applyDeviceWrite(SUPPLEMENTS_KEY, after, {mark: {itemId: 'x', date: DAY, slot: 'noon', status: 'taken', at: now.toISOString()}})).toThrow(/not one a card can make/);
    expect(() => applyDeviceWrite(SUPPLEMENTS_KEY, after, {...p.device!.patch, remove: true})).toThrow(/not one a card can make/);
  });
});

describe('set-debt-plan (money: never automatic; nothing is paid; the accounts are never changed)', () => {
  test('a minimum for a named debt and the extra a month: the planner\'s own figures, with a preview labelled a model', () => {
    const p = plan({kind: 'set-debt-plan', debt: 'credit card', minimum: 40, extra_per_month: 150});
    expect(p.target).toBe('form'); expect(p.ak?.button).toBe('Keep these figures');
    const lines = p.card.lines.join('\n');
    expect(lines).toMatch(/Minimum payment for Credit card: .*40\.00/); expect(lines).toMatch(/Extra a month/); expect(lines).toMatch(/debt-free in .+ \(avalanche\)/);
    expect(lines).toMatch(/A model, not advice/); expect(lines).toMatch(/nothing is paid/);
    const after = applyDeviceWrite(DEBT_PLANNER_KEY, f9().debtPlanner, p.device!.patch) as DebtPlannerRecord;
    expect(after.extra).toBe('150.00'); expect(after.currency).toBe('USD');
    expect(Object.values(after.debts!)).toContainEqual({minimum: '40.00'});
  });
  test('a rate the account already has is changed there; an unknown debt and nothing new are refused; zero extra is no extra', () => {
    expect(refusal({kind: 'set-debt-plan', debt: 'Car loan', rate_percent: 4})).toMatch(/comes from its account/);
    expect(refusal({kind: 'set-debt-plan', debt: 'Yacht', minimum: 10})).toMatch(/No debt of yours/);
    expect(refusal({kind: 'set-debt-plan', extra_per_month: 100})).toMatch(/already keeps these figures/);
    const p = plan({kind: 'set-debt-plan', extra_per_month: 0});
    expect((applyDeviceWrite(DEBT_PLANNER_KEY, f9().debtPlanner, p.device!.patch) as DebtPlannerRecord).extra).toBeUndefined();
    expect(() => actionSchema.parse({kind: 'set-debt-plan', minimum: 30})).toThrow(); // a minimum names its debt
    expect(() => applyDeviceWrite(DEBT_PLANNER_KEY, emptyDebtPlanner(), {set: {minimum: '30.00'}})).toThrow(/not one a card can make/);
    expect(() => applyDeviceWrite(DEBT_PLANNER_KEY, emptyDebtPlanner(), {set: {extra: '-5'}})).toThrow(/not one a card can make/);
  });
});

describe('start-savings-challenge (money: never automatic; nothing moves money)', () => {
  const free = () => env({savingsChallenges: emptySavingsChallenges()});
  test('a 52-week challenge beside one of the person\'s goals, by handle: the step, the year\'s total, the setChallenge write', () => {
    const p = plan({kind: 'start-savings-challenge', goal: 'g1', challenge: '52-week', step: 5}, free());
    expect(p.card.title).toMatch(/^52-week savings challenge: /); expect(p.card.lines.join(' ')).toMatch(/The year adds up to 6890/); expect(p.card.lines.join(' ')).toMatch(/never moves money/);
    const after = applyDeviceWrite(SAVINGS_CHALLENGES_KEY, emptySavingsChallenges(), p.device!.patch) as SavingsChallenges;
    expect(Object.values(after.goals)).toEqual([{kind: '52-week', startedOn: DAY, step: '5', order: 'up'}]);
    expect(() => applyDeviceWrite(SAVINGS_CHALLENGES_KEY, after, p.device!.patch)).toThrow(/already has a challenge/);
  });
  test('no-spend and round-ups; a goal that already has one, a project or an unknown goal are refused; the fields fit the challenge', () => {
    expect(plan({kind: 'start-savings-challenge', goal: 'g1', challenge: 'no-spend', target_days: 20}, free()).card.lines.join(' ')).toMatch(/Aiming for 20 no-spend days/);
    expect(plan({kind: 'start-savings-challenge', goal: 'g1', challenge: 'round-up', round_to: 5}, free()).card.lines.join(' ')).toMatch(/next 5/);
    const taken = platform.goals.find(g => g.id === '9202');
    if (taken) expect(refusal({kind: 'start-savings-challenge', goal: taken.name, challenge: 'round-up'})).toMatch(/already has/);
    expect(refusal({kind: 'start-savings-challenge', goal: 'A castle', challenge: 'round-up'}, free())).toMatch(/No goal of yours/);
    expect(() => actionSchema.parse({kind: 'start-savings-challenge', goal: 'g1', challenge: '52-week'})).toThrow();
    expect(() => actionSchema.parse({kind: 'start-savings-challenge', goal: 'g1', challenge: 'no-spend', round_to: 5})).toThrow();
  });
});

describe('open-agenda and open-wrapped (navigation to relative /app paths only)', () => {
  test('the agenda opens on a view kept as its display choice; Wrapped opens on Journey; nothing else is written', () => {
    const a = plan({kind: 'open-agenda', view: 'month'});
    expect(a.navigate).toEqual({href: '/app/agenda', label: 'Agenda'}); expect(runnerEffect(a)).toMatchObject({kind: 'navigate', href: '/app/agenda'});
    expect((applyDeviceWrite(AGENDA_KEY, emptyAgenda(), a.device!.patch) as AgendaRecord).view).toBe('month');
    expect(() => applyDeviceWrite(AGENDA_KEY, emptyAgenda(), {view: 'year'})).toThrow();
    expect(plan({kind: 'open-agenda'}).device).toBeUndefined();
    const w = plan({kind: 'open-wrapped'});
    expect(runnerEffect(w)).toEqual({kind: 'navigate', href: '/app/journey?wrapped=open', label: 'Journey → ZIGoals Wrapped'}); expect(w.device).toBeUndefined();
  });
  test('a question keeps a navigation card and loses a money card (the device rules)', () => {
    const block = (json: string) => `\n\n\`\`\`zigoals-action\n${json}\n\`\`\``;
    expect(answerOnly(`Here it is.${block('{"kind":"open-wrapped"}')}`, 'Where is my Wrapped?')).toContain('open-wrapped');
    expect(answerOnly(`About March.${block('{"kind":"set-debt-plan","extra_per_month":100}')}`, 'When am I debt-free?')).not.toContain('set-debt-plan');
  });
});
