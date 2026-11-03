import {describe, expect, test} from 'vitest';
import {PROJECTION_LABEL, pace30, paceSentence, privateGoalPace30, reachDate, requiredPace, whatIf, whatIfSentence} from './what-if';
import {privateGoalSchema, type ContributionEvent} from '../positions';

// Session AK (6.2 / Q14): the 30-day pace and the what-ifs, from fixtures.
const TODAY = '2026-10-31', f = (d: string) => d;
const steady = [{day: '2026-09-01', value: 1000}, {day: '2026-09-15', value: 1500}, {day: '2026-10-01', value: 2000}, {day: '2026-10-15', value: 2500}, {day: '2026-10-31', value: 3000}];

describe('pace30', () => {
  test('from the last record on or before the window\'s start: 1,000 over 30 days → ~33.3 a day; the date follows', () => {
    const p = pace30(steady, 3000, 6000, TODAY);
    expect(p.state).toBe('estimate');
    expect(p.perDay).toBeCloseTo(1000 / 30, 6);
    expect(p.perMonth).toBeCloseTo(1000, 6);
    expect(p.date).toBe('2027-01-29');
    expect(paceSentence(p, f)).toBe('At your pace over the last 30 days you reach the target on 2027-01-29.');
  });
  test('young history: from the first record when it is 14+ days old; otherwise not enough (unknown, never zero)', () => {
    expect(pace30([{day: '2026-10-10', value: 0}], 2100, 6000, TODAY)).toMatchObject({state: 'estimate', spanDays: 21, perDay: 100});
    expect(pace30([{day: '2026-10-25', value: 0}], 600, 6000, TODAY)).toMatchObject({state: 'not-enough', perDay: null, date: null});
    expect(pace30([], 0, 6000, TODAY).state).toBe('not-enough');
    expect(paceSentence(pace30([], 0, 6000, TODAY), f)).toMatch(/^Not enough history yet/);
  });
  test('no forward progress: not at this pace; reached; future points ignored', () => {
    const flat = pace30([{day: '2026-09-01', value: 3000}, {day: '2026-11-30', value: 9000}], 3000, 6000, TODAY);
    expect(flat).toMatchObject({state: 'no-pace', perDay: 0, date: null});
    expect(paceSentence(flat, f)).toMatch(/^Not at this pace/);
    expect(pace30(steady, 6000, 6000, TODAY).state).toBe('reached');
    expect(reachDate(TODAY, 1e12, 0.0001)).toBeNull();
  });
  test('a private goal: its own contributions in its unit', () => {
    const goal = privateGoalSchema.parse({id: '7', name: 'Fictional reserve', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '600000', notes: '', createdAt: '2026-06-01T00:00:00.000Z', milestones: []});
    const ev = (id: string, day: string, cents: number): ContributionEvent => ({id, goalId: '7', goalScope: 'private', direction: 'IN', quantity: String(cents), asset: 'EUR', decimals: 2, occurredAt: `${day}T12:00:00.000Z`, provenance: 'MANUAL_ATTRIBUTION'});
    const p = privateGoalPace30(goal, [ev('1', '2026-09-20', 100000), ev('2', '2026-10-20', 30000)], 1300, TODAY);
    expect(p.state).toBe('estimate');
    expect(p.perMonth).toBeCloseTo(300, 6);
  });
});

describe('what-if', () => {
  const base = {current: 3000, target: 6000, today: TODAY, pace: pace30(steady, 3000, 6000, TODAY)};
  test('nothing changed: the recorded pace and its date', () => {
    expect(whatIf(base)).toMatchObject({basis: 'recorded', date: '2027-01-29', shiftDays: 0, required: null, meetsTargetDate: null});
  });
  test('an extra €500 a month: 1,500 a month → 60 days instead of 90; 30 days sooner', () => {
    const w = whatIf(base, {extraPerMonth: 500});
    expect(w.perMonth).toBeCloseTo(1500, 6);
    expect(w.date).toBe('2026-12-30');
    expect(w.shiftDays).toBe(-30);
    expect(whatIfSentence(w, f)).toBe('With these changes you reach the target on 2026-12-30 (30 days sooner).');
  });
  test('a regular amount replaces the recorded pace; a habit adds per time; nonsense inputs count as nothing', () => {
    const r = whatIf(base, {regular: {amount: 700, every: 'week'}});
    expect(r.basis).toBe('regular'); expect(r.perDay).toBeCloseTo(100, 6); expect(r.date).toBe('2026-11-30');
    const h = whatIf(base, {habit: {perTime: 7, timesPerWeek: 3}});
    expect(h.perDay).toBeCloseTo(1000 / 30 + 3, 6);
    expect(whatIf(base, {extraPerMonth: -50, habit: {perTime: Number.NaN, timesPerWeek: 3}}).perDay).toBeCloseTo(1000 / 30, 6);
    expect(whatIf(base, {habit: {perTime: 1, timesPerWeek: 30}}).perDay).toBeCloseTo(1000 / 30 + 1, 6);
  });
  test('a target date: the pace it needs and whether the what-if meets it', () => {
    expect(requiredPace(3000, 6000, TODAY, '2026-12-30')).toEqual({daysLeft: 60, perDay: 50, perWeek: 350, perMonth: 1500});
    expect(requiredPace(3000, 6000, TODAY, TODAY)).toBeNull();
    expect(whatIf(base, {targetDate: '2026-12-30'}).meetsTargetDate).toBe(false);
    expect(whatIf(base, {targetDate: '2026-12-30', extraPerMonth: 500}).meetsTargetDate).toBe(true);
  });
  test('no recorded pace: only the what-ifs count, and say so; nothing at all → not at this pace', () => {
    const young = {...base, pace: pace30([], 3000, 6000, TODAY)};
    expect(whatIf(young, {extraPerMonth: 300})).toMatchObject({basis: 'additions-only', date: '2027-08-27'});
    const none = whatIf(young);
    expect(none.date).toBeNull();
    expect(whatIfSentence(none, f)).toBe('Not at this pace: nothing is added.');
  });
  test('the label', () => { expect(PROJECTION_LABEL).toBe('A projection from your own data, never a guarantee.'); });
});
