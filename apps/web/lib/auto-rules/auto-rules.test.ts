import {beforeAll, describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth, type HealthData} from '../health';
import {DEFAULT_DISPLAY_LOCALE, setDisplayLocale} from '../visual-format';
import {type AutoRuleInput, applyAutoTick, autoTickLabel, autoTickOn, healthLinkOf, markAutoTickUndone, newAutoRule, proposeAutoTicks, pruneAutoRules, recordAutoTick, removeAutoRule, ruleHabitDays, ruleSatisfied, ruleSentence, setAutoRule, sourceValue, undoAutoTick} from './engine';
import {AUTO_RULES_KEY, autoRulesSchema, emptyAutoRules, type AutoRule, type AutoRules} from './schema';
import {draftForSource, draftOfRule, emptyAutoRuleDraft, ruleFromDraft} from './draft';
import {contributionSources, daySources, healthSources, workoutSources} from './sources';
import type {ContributionEvent, PrivateGoal} from '../positions';

// Session AK (5.6): auto-complete rules, built on AH's Health links.
beforeAll(() => setDisplayLocale(DEFAULT_DISPLAY_LOCALE));
const DAY = '2026-10-01', NOW = new Date(`${DAY}T10:00:00.000Z`), AT = NOW.toISOString();
const WALK = '11111111-1111-4111-8111-111111111111', GYM = '22222222-2222-4222-8222-222222222222', SAVE = '33333333-3333-4333-8333-333333333333', SLEEP = '44444444-4444-4444-8444-444444444444';
const input = (title: string, patch: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, ...patch});
function journal(): HabitData {
  let d: HabitData = {...emptyHabitData(), timeZone: 'UTC'};
  const then = new Date('2026-09-01T10:00:00.000Z');
  d = createHabit(d, input('Walk', {measurement: {kind: 'count', unit: 'steps'}, target: 8000}), then, WALK);
  d = createHabit(d, input('Gym'), then, GYM);
  d = createHabit(d, input('Save'), then, SAVE);
  d = createHabit(d, input('Sleep well'), then, SLEEP);
  return d;
}
const rule = (patch: Partial<AutoRule>): AutoRule => newAutoRule({source: 'steps', comparator: 'at-least', threshold: 8000, habitId: WALK, ...patch} as AutoRuleInput, NOW, patch.id ?? `r-${patch.habitId ?? WALK}-${patch.source ?? 'steps'}`);
const withRules = (...rules: AutoRule[]): AutoRules => rules.reduce((r, x) => setAutoRule(r, x), emptyAutoRules());

describe('schema', () => {
  test('the key is new, loose and versioned; a later field survives a parse', () => {
    expect(AUTO_RULES_KEY).toBe('zigoals:auto-rules:v1');
    const later = {...withRules(rule({})), future: {x: 1}};
    expect(autoRulesSchema.parse(later)).toMatchObject({future: {x: 1}});
  });
  test('a rule names its source\'s unit, a contribution rule its goal, "at least" a number above zero', () => {
    expect(() => newAutoRule({source: 'contribution', comparator: 'recorded', habitId: SAVE}, NOW, 'a')).toThrow(/goal/);
    expect(() => newAutoRule({source: 'steps', comparator: 'at-least', habitId: WALK}, NOW, 'a')).toThrow(/above zero/);
    expect(() => newAutoRule({source: 'sleep', comparator: 'at-least', threshold: 30, habitId: SLEEP}, NOW, 'a')).toThrow(/24 hours/);
    expect(() => newAutoRule({source: 'steps', comparator: 'at-least', threshold: 10.5, habitId: WALK}, NOW, 'a')).toThrow(/whole/);
    expect(newAutoRule({source: 'sleep', comparator: 'at-least', threshold: 7, habitId: SLEEP}, NOW, 'a').unit).toBe('hours');
    expect(() => autoRulesSchema.parse({version: 1, rules: [{...rule({}), unit: 'mL'}], applied: []})).toThrow();
  });
  test('one marker per habit and day; rule ids are unique', () => {
    const m = {ruleId: 'a', habitId: WALK, date: DAY, source: 'steps', value: 9000, before: 0, wrote: 8000, appliedAt: AT};
    expect(() => autoRulesSchema.parse({version: 1, rules: [], applied: [m, m]})).toThrow();
    expect(() => autoRulesSchema.parse({version: 1, rules: [rule({}), rule({})], applied: []})).toThrow();
  });
});

describe('sources and rules: unknown is not zero', () => {
  test('a Health rule is AH\'s link: sleep hours become minutes, "recorded" has no target', () => {
    expect(healthLinkOf(rule({source: 'sleep', threshold: 7.5, habitId: SLEEP}))).toMatchObject({measure: 'sleepMinutes', rule: 'at-least', target: 450});
    expect(healthLinkOf(rule({source: 'water', comparator: 'recorded', threshold: undefined}))).toMatchObject({measure: 'water', rule: 'recorded'});
    expect(healthLinkOf(rule({source: 'workout', comparator: 'recorded', threshold: undefined}))).toBeNull();
  });
  test('values: null when nothing was recorded; workouts count or add minutes; contributions add for the named goal', () => {
    const r = rule({});
    expect(sourceValue(r, {})).toBeNull();
    expect(sourceValue(r, {steps: 0})).toBe(0);
    expect(ruleSatisfied(r, null)).toBe(false);
    expect(ruleSatisfied(r, 7999)).toBe(false);
    expect(ruleSatisfied(r, 8000)).toBe(true);
    expect(ruleSatisfied({...r, paused: true}, 9000)).toBe(false);
    const workouts = [{minutes: 20, type: 'cardio' as const}, {minutes: 25, type: 'strength' as const}];
    expect(sourceValue(rule({source: 'workout', comparator: 'recorded', threshold: undefined, habitId: GYM}), {workouts})).toBe(2);
    expect(sourceValue(rule({source: 'workout', comparator: 'at-least', threshold: 30, habitId: GYM, workoutType: 'strength'}), {workouts})).toBe(25);
    expect(sourceValue(rule({source: 'workout', comparator: 'recorded', threshold: undefined, habitId: GYM}), {workouts: []})).toBeNull();
    expect(sourceValue(rule({source: 'workout', comparator: 'recorded', threshold: undefined, habitId: GYM}), {workouts: null})).toBeNull();
    const c = rule({source: 'contribution', comparator: 'at-least', threshold: 50, habitId: SAVE, goalId: '7'});
    expect(sourceValue(c, {contributions: [{goalId: '7', amount: 30}, {goalId: '8', amount: 500}, {goalId: '7', amount: 25}]})).toBe(55);
    expect(ruleSatisfied(c, 55)).toBe(true);
    expect(sourceValue(c, {contributions: [{goalId: '8', amount: 500}]})).toBeNull();
    expect(ruleSatisfied(rule({source: 'sleep', threshold: 7, habitId: SLEEP}), 419)).toBe(false);
    expect(ruleSatisfied(rule({source: 'sleep', threshold: 7, habitId: SLEEP}), 420)).toBe(true);
  });
  test('the store adapters: Health through AH\'s measureValue, finished workouts with minutes, IN contributions in the goal\'s unit', () => {
    const health: HealthData = {...createEmptyHealth(), activity: [{id: 'health_activity-001', date: DAY, name: 'Walk', steps: 9100, minutes: 40, createdAt: AT, updatedAt: AT}]};
    expect(healthSources(health, DAY)).toMatchObject({steps: 9100, activeMinutes: 40, waterMl: null, sleepMinutes: null});
    expect(healthSources(health, '2026-09-30').steps).toBeNull();
    const w = {workouts: [
      {id: 'w1', name: 'Run', date: DAY, type: 'cardio', startedAt: `${DAY}T07:00:00.000Z`, endedAt: `${DAY}T07:42:00.000Z`, exercises: []},
      {id: 'w2', name: 'Lift', date: DAY, type: 'strength', startedAt: `${DAY}T18:00:00.000Z`, exercises: []},
    ]} as never;
    expect(workoutSources(w, DAY)).toEqual([{minutes: 42, type: 'cardio'}]);
    const goal = {id: '7', asset: 'EUR', decimals: 2, type: 'VALUE'} as PrivateGoal;
    const ev = (id: string, patch: Partial<ContributionEvent>): ContributionEvent => ({id, goalId: '7', goalScope: 'private', direction: 'IN', quantity: '5000', asset: 'EUR', decimals: 2, occurredAt: `${DAY}T12:00:00.000Z`, provenance: 'MANUAL_ATTRIBUTION', ...patch});
    expect(contributionSources([goal], [ev('1', {}), ev('2', {direction: 'OUT'}), ev('3', {provenance: 'REWARD_INCOME'}), ev('4', {asset: 'USD'}), ev('5', {occurredAt: '2026-09-30T12:00:00.000Z'})], DAY)).toEqual([{goalId: '7', amount: 50}]);
    expect(daySources({date: DAY})).toEqual({workouts: null, contributions: null});
  });
});

describe('proposing, applying and undoing ticks', () => {
  test('ticks open days only, one per habit, never a day AH or a rule already ticked or the person undid', () => {
    const data = journal();
    const record = withRules(rule({}), rule({id: 'second', source: 'active-minutes', threshold: 30}), rule({source: 'workout', comparator: 'recorded', threshold: undefined, habitId: GYM}), rule({source: 'contribution', comparator: 'recorded', threshold: undefined, habitId: SAVE, goalId: '7'}));
    const days = ruleHabitDays(record, data, DAY);
    const sources = {steps: 9000, activeMinutes: 45, workouts: [{minutes: 30, type: 'strength' as const}], contributions: [{goalId: '7', amount: 10}]};
    const ticks = proposeAutoTicks({record, date: DAY, sources, days});
    expect(ticks.map(t => [t.habitId, t.ruleId])).toEqual([[WALK, `r-${WALK}-steps`], [GYM, `r-${GYM}-workout`], [SAVE, `r-${SAVE}-contribution`]]);
    // AH ticked Walk from Health already: no rule touches that day.
    expect(proposeAutoTicks({record, date: DAY, sources, days, healthApplied: [{habitId: WALK, date: DAY}]}).map(t => t.habitId)).toEqual([GYM, SAVE]);
    // A day completed by hand stays.
    const done = logHabitValue(data, GYM, DAY, 1, {}, NOW);
    expect(proposeAutoTicks({record, date: DAY, sources, days: ruleHabitDays(record, done, DAY)}).map(t => t.habitId)).toEqual([WALK, SAVE]);
    // Nothing recorded: nothing ticked.
    expect(proposeAutoTicks({record, date: DAY, sources: {}, days})).toEqual([]);
  });
  test('apply writes the target, records before/after; a second apply does nothing; undo restores and is final', () => {
    let data = logHabitValue(journal(), WALK, DAY, 3000, {}, NOW);
    let record = withRules(rule({}));
    const [tick] = proposeAutoTicks({record, date: DAY, sources: {steps: 8800}, days: ruleHabitDays(record, data, DAY)});
    const applied = applyAutoTick(data, tick!, NOW)!;
    expect(applied.marker).toMatchObject({habitId: WALK, before: 3000, wrote: 8000, value: 8800, source: 'steps'});
    data = applied.data; record = recordAutoTick(record, applied.marker);
    expect(data.habits.find(h => h.id === WALK)!.entries.find(e => e.date === DAY)!.count).toBe(8000);
    expect(applyAutoTick(data, tick!, NOW)).toBeNull();
    expect(recordAutoTick(record, applied.marker)).toBe(record);
    expect(proposeAutoTicks({record, date: DAY, sources: {steps: 8800}, days: ruleHabitDays(record, data, DAY)})).toEqual([]);
    expect(autoTickLabel(autoTickOn(record, WALK, DAY)!)).toBe('auto · from steps · 8,800 steps');
    data = undoAutoTick(data, applied.marker, NOW);
    record = markAutoTickUndone(record, WALK, DAY);
    expect(data.habits.find(h => h.id === WALK)!.entries.find(e => e.date === DAY)!.count).toBe(3000);
    expect(autoTickOn(record, WALK, DAY)!.undone).toBe(true);
    expect(autoTickLabel(autoTickOn(record, WALK, DAY)!)).toMatch(/^Undone/);
    expect(proposeAutoTicks({record, date: DAY, sources: {steps: 20000}, days: ruleHabitDays(record, data, DAY)})).toEqual([]);
  });
  test('undo leaves a day the person changed after the tick', () => {
    const data = journal(), record = withRules(rule({}));
    const [tick] = proposeAutoTicks({record, date: DAY, sources: {steps: 9000}, days: ruleHabitDays(record, data, DAY)});
    const applied = applyAutoTick(data, tick!, NOW)!;
    const changed = logHabitValue(applied.data, WALK, DAY, 9500, {}, NOW);
    expect(undoAutoTick(changed, applied.marker, NOW)).toBe(changed);
  });
});

describe('rule list and words', () => {
  test('set replaces by id, refuses a Health rule on a habit AH already links, remove and prune', () => {
    let r = withRules(rule({}));
    r = setAutoRule(r, {...rule({}), threshold: 10000});
    expect(r.rules).toHaveLength(1); expect(r.rules[0]!.threshold).toBe(10000);
    expect(() => setAutoRule(r, rule({habitId: GYM}), {healthLinkedHabitIds: new Set([GYM])})).toThrow(/Health/);
    expect(setAutoRule(r, rule({source: 'workout', comparator: 'recorded', threshold: undefined, habitId: GYM}), {healthLinkedHabitIds: new Set([GYM])}).rules).toHaveLength(2);
    expect(removeAutoRule(r, r.rules[0]!.id).rules).toEqual([]);
    const c = setAutoRule(r, rule({source: 'contribution', comparator: 'recorded', threshold: undefined, habitId: SAVE, goalId: '7'}));
    expect(pruneAutoRules(c, new Set([WALK, SAVE]), new Set(['8'])).rules.map(x => x.habitId)).toEqual([WALK]);
    expect(pruneAutoRules(c, new Set([WALK, SAVE]))).toBe(c);
  });
  test('sentences', () => {
    expect(ruleSentence(rule({}), 'Walk')).toBe('When steps ≥ 8,000 → Walk is done');
    expect(ruleSentence(rule({source: 'sleep', threshold: 7.5}), 'Rest')).toBe('When sleep ≥ 7.5 h → Rest is done');
    expect(ruleSentence(rule({source: 'workout', comparator: 'recorded', threshold: undefined, workoutType: 'cardio'}), 'Gym')).toBe('When a cardio workout is logged → Gym is done');
    expect(ruleSentence(rule({source: 'contribution', comparator: 'recorded', threshold: undefined, goalId: '7'}), 'Save', 'Holiday fund')).toBe('When a contribution to Holiday fund is logged → Save is done');
    expect(autoTickLabel({source: 'contribution', value: 50}, {goalName: 'Holiday fund'})).toBe('auto · from a contribution · to Holiday fund');
    expect(autoTickLabel({source: 'workout', value: 1})).toBe('auto · from a workout');
  });
  test('drafts: defaults per source, the field\'s own messages, an edit keeps id and start', () => {
    expect(draftForSource(emptyAutoRuleDraft(GYM), 'workout')).toMatchObject({comparator: 'recorded', source: 'workout'});
    expect(() => ruleFromDraft(emptyAutoRuleDraft(''))).toThrow(/habit/);
    expect(() => ruleFromDraft({...emptyAutoRuleDraft(WALK), threshold: 'x'})).toThrow(/whole number greater than 0/);
    expect(() => ruleFromDraft({...emptyAutoRuleDraft(WALK), threshold: '0'})).toThrow(/greater than 0/);
    expect(() => ruleFromDraft({...draftForSource(emptyAutoRuleDraft(SAVE), 'contribution')})).toThrow(/goal/);
    const made = ruleFromDraft({...emptyAutoRuleDraft(WALK), threshold: '8000'}, NOW);
    expect(made).toMatchObject({source: 'steps', threshold: 8000, unit: 'steps'});
    const edited = ruleFromDraft({...draftOfRule(made), threshold: '9000'}, new Date('2026-10-05T00:00:00.000Z'), made);
    expect(edited).toMatchObject({id: made.id, createdAt: made.createdAt, threshold: 9000});
  });
});
