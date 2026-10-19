import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner} from './plan';
beforeAll(() => loadAaPlanner()); // the AA and AF planners share one lazy chunk
import {createHabit, emptyHabitData, type HabitData, type HabitInput} from '../../habits';
import {createEmptyHealth, healthSchema} from '../../health';
import {emptyPlatform} from '../../positions';
import {emptyReminders} from '../../reminders/schema';
import {presetSettings} from '../../dashboard-settings';
import {emptyWeeklyReview} from '../../weekly-review/schema';
import {emptyChecklist, emptyChecklistDays, type Checklist} from '../../checklist/schema';
import {addCustom, addFavourite} from '../../checklist/store';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../../af-checklist-keys';
import {STAKING_PREFILL_KEY} from '../../af-signing-keys';
import {ZIGI_KEY} from '../store/keys';
import type {Handle} from '../context/types';
import {applyPlan, planAction, type ChecklistEnv, type Env, type Plan, type Stores} from './plan';
import {actionSchema, PREFILL_KINDS, WRITING_KINDS, type Action} from './schema';
import {applyDeviceWrite, DEVICE_WRITE_KEYS} from './device-writes';
import {AUTO_ACCEPT_NEVER} from './auto-accept';
import {STAKING_PREFILL_ROUTE, stakingPrefillRecord, stashStakingPrefill} from './staking-prefill';
import {CHECKLIST_UNREADABLE} from './checklist-writes';
import {runnerEffect, lookPatched} from '../../../components/ai/runner-effects';
import {withChoice} from '../../pages/visibility';

/** Session AF (L4): the planner's cases for the Checklist, the brief's choices and the staking review hand-off. */
const DAY = '2026-10-19', now = new Date('2026-10-19T08:00:00Z'), AT = new Date('2026-09-01T06:00:00Z');
const ID = {read: '11111111-1111-4111-8111-111111111111', push: '22222222-2222-4222-8222-222222222222', walk: '33333333-3333-4333-8333-333333333333'};
const VALOPER = 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl';
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});
function habits(): HabitData {
  let d = {...emptyHabitData(), timeZone: 'UTC'} as HabitData;
  d = createHabit(d, input('Read'), AT, ID.read);
  d = createHabit(d, input('Push-ups', {measurement: {kind: 'count', unit: 'times'}, target: 20}), AT, ID.push);
  d = createHabit(d, input('Walk'), AT, ID.walk);
  return d;
}
const stores = (): Stores => ({habits: habits(), health: healthSchema.parse({...createEmptyHealth(), schemaVersion: 4}), platform: emptyPlatform(), fasting: {version: 1, sessions: []}, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: emptyWeeklyReview(), memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true}});
const handles = (s: Stores): Handle[] => s.habits.habits.map((h, i) => ({handle: `h${i + 1}`, kind: 'habit' as const, id: h.id, label: h.title}));
function path(): Checklist {
  let r = emptyChecklist();
  r = addFavourite(r, {kind: 'habit', habitId: ID.push}, {id: 'ck_push', at: AT});
  r = addCustom(r, {label: 'Buy running shoes'}, {id: 'ck_shoes', at: AT});
  r = addFavourite(r, {kind: 'health', input: 'water'}, {id: 'ck_water', at: AT, label: 'Water'});
  return r;
}
const checklist = (record = path(), unreadable = false): ChecklistEnv => ({record, days: emptyChecklistDays(), date: DAY, unreadable});
const env = (extra: Partial<Env> = {}): Env => { const s = stores(); return {stores: s, handles: handles(s), now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC', checklist: checklist(), ...extra}; };
const plan = (raw: Record<string, unknown>, e = env()): Plan => { const r = planAction(actionSchema.parse(raw) as Action, e); if (!r.ok) throw new Error(r.message); return r.plan; };
const refusal = (raw: Record<string, unknown>, e = env()): string => { const r = planAction(actionSchema.parse(raw) as Action, e); if (r.ok) throw new Error('expected a refusal'); return r.message; };

describe('checklist-tick: a dot on today\'s path by its name', () => {
  test('the person\'s own item is ticked on the path through the Checklist lane\'s entry; never automatic, no Undo but the dot', () => {
    const p = plan({kind: 'checklist-tick', item: 'running shoes'});
    expect(p.target).toBe('form'); expect(p.write(stores())).toEqual({}); expect(p.undo).toBeNull();
    expect(p.card).toMatchObject({kind: 'checklist-tick', title: 'Tick on your Checklist: Buy running shoes', where: 'Checklist'});
    expect(p.device).toEqual({key: CHECKLIST_DAYS_KEY, patch: {check: {item: 'Buy running shoes', done: true, day: DAY}}, label: 'Ticked on your Checklist: Buy running shoes'});
    expect(runnerEffect(p)).toMatchObject({kind: 'record', key: CHECKLIST_DAYS_KEY});
    expect(plan({kind: 'checklist-tick', item: 'Buy running shoes', done: false}).device?.patch).toEqual({check: {item: 'Buy running shoes', done: false, day: DAY}});
    expect(refusal({kind: 'checklist-tick', item: 'running shoes', day: 'yesterday'})).toMatch(/for today only/);
  });
  test('a habit dot is the habit\'s own check-in (exact Undo), named by its title; a habit off the path is checked in itself', () => {
    const s = stores(), p = plan({kind: 'checklist-tick', item: 'push-ups'});
    expect(p.target).toBe('habits'); expect(p.card.kind).toBe('checklist-tick'); expect(p.card.title).toBe('Check in: Push-ups'); expect(p.card.lines.at(-1)).toBe('Your Checklist dot follows the check-in');
    const after = applyPlan(p, s);
    expect(after.habits.habits.find(h => h.id === ID.push)!.entries.find(e => e.date === DAY)?.count).toBe(20);
    expect(applyPlan({...p, write: p.undo!.write}, after).habits.habits.find(h => h.id === ID.push)!.entries.find(e => e.date === DAY)).toBeUndefined();
    const off = plan({kind: 'checklist-tick', item: 'Read'});
    expect(off.target).toBe('habits'); expect(off.card.lines.at(-1)).toBe('Not on your Checklist: this checks in the habit itself');
    // No Checklist on this device: still the habit's check-in.
    expect(plan({kind: 'checklist-tick', item: 'walk'}, env({checklist: null})).card.lines.at(-1)).toBe('A habit check-in');
    // Unticking a habit dot sets the day to not done.
    expect(plan({kind: 'checklist-tick', item: 'Read', done: false}).card.lines[0]).toBe('Mark as not done');
  });
  test('a Health dot asks for the amount; an unknown name is refused in plain words, never guessed', () => {
    expect(refusal({kind: 'checklist-tick', item: 'water'})).toBe('Water logs a Health entry: say how much ("log a glass of water"), or tick it on the Checklist itself.');
    expect(refusal({kind: 'checklist-tick', item: 'juggling'})).toBe('No Checklist item or habit is called "juggling".');
  });
});
describe('checklist-add-favourite and checklist-add-custom', () => {
  test('a habit the person has is starred through the Checklist\'s own mutator; already there, unknown or unreadable is refused', () => {
    const p = plan({kind: 'checklist-add-favourite', item: 'Read'});
    expect(p).toMatchObject({target: 'form', undo: null, card: {title: 'Star on your Checklist: Read', where: 'Checklist'}, device: {key: CHECKLIST_KEY, patch: {star: {habitId: ID.read, label: 'Read'}}}});
    const next = applyDeviceWrite(CHECKLIST_KEY, path(), p.device!.patch) as Checklist;
    expect(next.items.map(i => i.ref?.habitId).filter(Boolean)).toEqual([ID.push, ID.read]);
    expect(refusal({kind: 'checklist-add-favourite', item: 'Push-ups'})).toBe('Push-ups is already on your Checklist.');
    expect(refusal({kind: 'checklist-add-favourite', item: 'Juggle'})).toMatch(/^No habit is called "Juggle"/);
    expect(refusal({kind: 'checklist-add-favourite', item: 'Read'}, env({checklist: checklist(path(), true)}))).toBe(CHECKLIST_UNREADABLE);
    expect(refusal({kind: 'checklist-add-favourite', item: 'Read'}, env({checklist: null}))).toBe('The Checklist is not on this device yet, so nothing was proposed.');
  });
  test('the person\'s own item is added in their words; a duplicate is refused; the entry adds it', () => {
    const p = plan({kind: 'checklist-add-custom', text: '  read 5   pages '});
    expect(p.device).toEqual({key: CHECKLIST_KEY, patch: {add: {text: 'read 5 pages'}}, label: 'On your Checklist: read 5 pages'});
    expect((applyDeviceWrite(CHECKLIST_KEY, path(), p.device!.patch) as Checklist).items.filter(i => i.kind === 'custom').map(i => i.label)).toEqual(['Buy running shoes', 'read 5 pages']);
    expect(refusal({kind: 'checklist-add-custom', text: 'buy running SHOES'})).toBe('"buy running SHOES" is already on your Checklist.');
    expect(DEVICE_WRITE_KEYS).toEqual(expect.arrayContaining([CHECKLIST_KEY, CHECKLIST_DAYS_KEY]));
  });
  test('the days entry ticks a custom item for the day it is given (L3\'s entry; the path is read from the device)', () => {
    expect(() => applyDeviceWrite(CHECKLIST_DAYS_KEY, emptyChecklistDays(), {bogus: 1})).toThrow();
  });
});
describe('set-brief: ZIGi\'s own record, merged', () => {
  test('a device patch of the brief only; the runner merges it and keeps the look', () => {
    const p = plan({kind: 'set-brief', evening: false, eveningTime: '21:30'});
    expect(p).toMatchObject({target: 'form', undo: null, device: {key: ZIGI_KEY, patch: {brief: {evening: false, eveningTime: '21:30'}}}});
    expect(p.card.lines).toEqual(['Evening recap: off', 'Evening recap from 21:30', 'Kept on this device; change it again in Settings → ZIGi · Your day']);
    const effect = runnerEffect(p);
    expect(effect).toEqual({kind: 'device', patch: {brief: {evening: false, eveningTime: '21:30'}}});
    expect(lookPatched({version: 1, skin: 'origami-nebula', brief: {morning: false}}, (effect as unknown as {patch: never}).patch)).toEqual({version: 1, skin: 'origami-nebula', brief: {morning: false, evening: false, eveningTime: '21:30'}});
    expect(runnerEffect({device: {key: ZIGI_KEY, patch: {brief: {eveningTime: 'late'}}}})).toBeNull();
    expect(actionSchema.safeParse({kind: 'set-brief'}).success).toBe(false);
  });
});
describe('prefill-staking (ADR-028 D7, H47): the staking review, filled in; nothing is signed or sent by ZIGi', () => {
  test('a form hand-off: no write, no Undo, never batched, never automatic; the plain fields only', () => {
    const p = plan({kind: 'prefill-staking', amount: 100});
    expect(PREFILL_KINDS).toContain('prefill-staking'); expect(WRITING_KINDS).not.toContain('prefill-staking'); expect(AUTO_ACCEPT_NEVER).toContain('prefill-staking');
    expect(p.target).toBe('form'); expect(p.write(stores())).toEqual({}); expect(p.undo).toBeNull(); expect(p.device).toBeUndefined(); expect(p.navigate).toBeUndefined();
    expect(p.staking).toEqual({network: 'practice', action: 'delegate', amount: '100'});
    expect(p.card.title).toBe('Fill in the staking review');
    expect(p.card.lines).toEqual(['Stake 100 ZIG · practice network (no real value)', 'Validator: you choose on the review', 'Opens the Staking page with these fields filled in; nothing is signed or sent until you review it there and sign in your own wallet', 'ZIGi never signs, sends or holds keys']);
    expect(STAKING_PREFILL_ROUTE.startsWith('/app/staking')).toBe(true);
  });
  test('the validator by its address or by the name the Earn page read; never one ZIGi chose; a claim carries no amount', () => {
    const e = env({earn: {validators: [{operator: VALOPER, moniker: 'ZIG Sentinel - Foundation 1'}]}});
    expect(plan({kind: 'prefill-staking', validator: 'zig sentinel - foundation 1', amount: '12.5', network: 'real'}, e).staking).toEqual({network: 'real', action: 'delegate', validator: VALOPER, amount: '12.5'});
    expect(plan({kind: 'prefill-staking', validator: 'zig sentinel - foundation 1'}, e).card.lines[1]).toBe('Validator: ZIG Sentinel - Foundation 1');
    const unknown = plan({kind: 'prefill-staking', validator: 'The best one'}, e);
    expect(unknown.staking).toEqual({network: 'practice', action: 'delegate'}); expect(unknown.card.lines[1]).toMatch(/you choose \(no validator named “The best one”/);
    expect(plan({kind: 'prefill-staking', validator: VALOPER}).staking?.validator).toBe(VALOPER);
    expect(plan({kind: 'prefill-staking', action: 'claim', amount: '5'}).staking).toEqual({network: 'practice', action: 'claim'});
    expect(plan({kind: 'prefill-staking', network: 'real'}).card.lines[0]).toMatch(/real network \(real ZIG; you switch the form to the real network yourself, and the first time it asks you to confirm\)/);
    expect(actionSchema.safeParse({kind: 'prefill-staking', amount: '1e9'}).success).toBe(false);
    expect(actionSchema.safeParse({kind: 'prefill-staking', action: 'transfer'}).success).toBe(false);
  });
  test('the stash is exactly what the staking form reads, once: {version, at, network, action, validator?, amount?}', () => {
    const m = new Map<string, string>(), storage = {setItem: (k: string, v: string) => { m.set(k, v); }};
    expect(stashStakingPrefill({network: 'practice', action: 'delegate', validator: VALOPER, amount: '100'}, storage, now)).toBe(true);
    expect(JSON.parse(m.get(STAKING_PREFILL_KEY)!)).toEqual({version: 1, at: now.toISOString(), network: 'practice', action: 'delegate', validator: VALOPER, amount: '100'});
    expect(JSON.parse(stakingPrefillRecord({network: 'real', action: 'claim', validator: 'not-a-valoper', amount: '3'}, now))).toEqual({version: 1, at: now.toISOString(), network: 'real', action: 'claim'});
    expect(stashStakingPrefill({network: 'practice', action: 'delegate'}, {setItem: () => { throw new Error('full'); }})).toBe(false);
  });
});
describe('open-page: the Checklist and Earn (Session AF)', () => {
  test('the Checklist and Earn open; Earn\'s Start here and Academy are views; Earn follows Wealth\'s switch', () => {
    expect(plan({kind: 'open-page', page: 'checklist'}).navigate).toEqual({href: '/app/checklist', label: 'Checklist'});
    expect(plan({kind: 'open-page', page: 'earn'}).navigate).toEqual({href: '/app/earn', label: 'Earn'});
    expect(plan({kind: 'open-page', page: 'earn', view: 'start-here'}).navigate).toEqual({href: '/app/earn#start-here', label: 'Earn → Start here'});
    expect(plan({kind: 'open-page', page: 'earn', view: 'academy'}).navigate).toEqual({href: '/app/earn#academy', label: 'Earn → Earn Academy'});
    expect(refusal({kind: 'open-page', page: 'habits', view: 'academy'})).toMatch(/on Earn/);
    const s = stores(), hidden: Stores = {...s, settings: {...s.settings, pages: withChoice(s.settings.pages ?? {version: 1, choices: {}} as never, 'wealth', false, now.toISOString())} as Stores['settings']};
    expect(refusal({kind: 'open-page', page: 'earn'}, env({stores: hidden}))).toBe('Earn follows Wealth, which is hidden in Settings → Your pages & buttons; show it there first.');
    expect(plan({kind: 'open-page', page: 'checklist'}, env({stores: hidden})).navigate?.href).toBe('/app/checklist');
  });
});
