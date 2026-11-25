import {describe, expect, it} from 'vitest';
import {emptyPlatform, goalProgress, privateGoalSchema, type Platform} from '../positions';
import {fundGoal} from '../contribution-funding';
import {newOwnUnitPosition} from './goal-units';
import {GOAL_REPEAT_KEY, canRepeat, clearRepeat, emptyGoalRepeat, goalRepeatSchema, keyOf, periodEnd, periodStart, periodsBetween, repeatRows, setRepeat, turnRepeats} from './repeat';

// Session AW (X4, LEDGER #447): "Read 2 books a month" starts again each month; a project unticks its milestones.
const E = 10n ** 18n;
const books = () => privateGoalSchema.parse({id: '7', name: 'Read 2 books a month', type: 'QUANTITY', status: 'active', asset: 'books', denom: 'manual:books', decimals: 18, target: (2n * E).toString(), notes: '', createdAt: '2026-09-01T10:00:00.000Z', milestones: []});
const project = () => privateGoalSchema.parse({id: '8', name: 'Weekly reset', type: 'PROJECT', status: 'active', asset: 'milestones', denom: 'milestones', decimals: 0, target: '1', notes: '', createdAt: '2026-09-01T10:00:00.000Z', milestones: [{id: 'a', title: 'Inbox to zero', done: true}, {id: 'b', title: 'Plan the week', done: true}, {id: 'c', title: 'Tidy the desk', done: false}]});
const savings = () => privateGoalSchema.parse({id: '9', name: 'Emergency fund', type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target: '100000', notes: '', createdAt: '2026-09-01T10:00:00.000Z', milestones: []});
const at = (day: string) => `${day}T12:00:00.000Z`;
function read(s: Platform, n: number, day: string, id: string): Platform {
  const position = s.positions.find(p => p.denom === 'manual:books');
  return fundGoal(s, {id, goalId: '7', ...(position ? {positionId: position.id} : {newPosition: newOwnUnitPosition(books(), 'own-books', at(day))}), quantity: (BigInt(n) * E).toString(), occurredAt: at(day)}, [], Date.parse(at(day)));
}

describe('periods', () => {
  it('starts a week on Monday, a month on the 1st and a year on 1 January', () => {
    expect(periodStart('week', '2026-11-25')).toBe('2026-11-23');
    expect(periodEnd('week', '2026-11-23')).toBe('2026-11-29');
    expect(periodStart('month', '2026-11-25')).toBe('2026-11-01');
    expect(periodEnd('month', '2026-02-01')).toBe('2026-02-28');
    expect(periodEnd('month', '2026-12-01')).toBe('2026-12-31');
    expect(keyOf('year', '2026-11-25')).toBe('year:2026');
    expect(periodsBetween('month:2026-09', 'month:2026-12')).toEqual(['month:2026-09', 'month:2026-10', 'month:2026-11']);
    expect(periodsBetween('week:2026-11-16', 'week:2026-11-30')).toEqual(['week:2026-11-16', 'week:2026-11-23']);
  });
});

describe('which goals can start again', () => {
  it('a count of your own unit and a project; never savings or a coin', () => {
    expect(canRepeat(books())).toBe(true);
    expect(canRepeat(project())).toBe(true);
    expect(canRepeat(savings())).toBe(false);
    expect(canRepeat({type: 'QUANTITY', denom: 'BTC'})).toBe(false);
    expect(() => setRepeat(emptyGoalRepeat(), savings(), 'month', '2026-11-25', at('2026-11-25'))).toThrow(/Only a count/);
  });
  it('is its own loose, versioned record; turning it off forgets only that goal', () => {
    expect(GOAL_REPEAT_KEY).toBe('zigoals:goal-repeat:v1');
    const on = setRepeat(setRepeat(emptyGoalRepeat(), books(), 'month', '2026-09-10', at('2026-09-10')), project(), 'week', '2026-09-10', at('2026-09-10'));
    expect(on.goals['7']).toMatchObject({every: 'month', since: '2026-09-01', period: 'month:2026-09'});
    expect(goalRepeatSchema.parse({...on, later: true})).toHaveProperty('later', true);
    expect(Object.keys(clearRepeat(on, '7').goals)).toEqual(['8']);
  });
});

describe('a count goal starts again each month', () => {
  it('keeps each month as a row from what was added, and the ring shows this month', () => {
    let s: Platform = {...emptyPlatform(), goals: [books()]};
    let r = setRepeat(emptyGoalRepeat(), books(), 'month', '2026-09-10', at('2026-09-10'));
    s = read(s, 1, '2026-09-10', 'c1'); s = read(s, 1, '2026-09-20', 'c2');
    expect(goalProgress(s, '7').current).toBe((2n * E).toString());
    // October: the count starts again at nothing; September stays reached.
    const oct = turnRepeats(s, r, '2026-10-02');
    expect(oct.turned).toEqual(['7']);
    s = oct.platform; r = oct.record;
    expect(goalProgress(s, '7').current).toBe('0');
    expect(r.goals['7']!.period).toBe('month:2026-10');
    s = read(s, 1, '2026-10-12', 'c3');
    expect(goalProgress(s, '7').current).toBe(E.toString());
    // Nothing more until 3 December: November is a row with nothing added (a fact of what was added, not a grade).
    const dec = turnRepeats(s, r, '2026-12-03');
    s = dec.platform; r = dec.record;
    expect(repeatRows(s, books(), r.goals['7']!, '2026-12-03').map(x => [x.period, x.done, x.of, x.reached, x.current])).toEqual([
      ['month:2026-09', 2, 2, true, false], ['month:2026-10', 1, 2, false, false], ['month:2026-11', 0, 2, false, false], ['month:2026-12', 0, 2, false, true],
    ]);
    // A second turn in the same month changes nothing.
    expect(turnRepeats(s, r, '2026-12-20').turned).toEqual([]);
  });
  it('a turn that comes late counts only what was added in the new period', () => {
    let s: Platform = {...emptyPlatform(), goals: [books()]};
    const r = setRepeat(emptyGoalRepeat(), books(), 'week', '2026-11-16', at('2026-11-16'));
    s = read(s, 2, '2026-11-17', 'c1'); s = read(s, 1, '2026-11-24', 'c2');
    const t = turnRepeats(s, r, '2026-11-25');
    expect(goalProgress(t.platform, '7').current).toBe(E.toString());
    expect(repeatRows(t.platform, books(), t.record.goals['7']!, '2026-11-25').map(x => `${x.period} ${x.done}/${x.of}`)).toEqual(['week:2026-11-16 2/2', 'week:2026-11-23 1/2']);
  });
  it('leaves a locked or closed goal as it is', () => {
    let s: Platform = {...emptyPlatform(), goals: [books()]};
    const r = setRepeat(emptyGoalRepeat(), books(), 'month', '2026-09-10', at('2026-09-10'));
    s = read(s, 2, '2026-09-10', 'c1');
    const locked = {...s, goals: s.goals.map(g => ({...g, locked: true}))};
    expect(turnRepeats(locked, r, '2026-10-02').turned).toEqual([]);
    const closed = {...s, goals: s.goals.map(g => ({...g, status: 'closed' as const}))};
    expect(turnRepeats(closed, r, '2026-10-02').platform).toBe(closed);
  });
});

describe('a project starts again each week', () => {
  it('keeps how many milestones were done, then unticks them', () => {
    const s: Platform = {...emptyPlatform(), goals: [project()]};
    const r = setRepeat(emptyGoalRepeat(), project(), 'week', '2026-11-17', at('2026-11-17'));
    const t = turnRepeats(s, r, '2026-11-24');
    expect(t.platform.goals[0]!.milestones.every(m => !m.done)).toBe(true);
    expect(t.record.goals['8']!.results).toEqual([{period: 'week:2026-11-16', done: 2, of: 3}]);
    const rows = repeatRows(t.platform, t.platform.goals[0]!, t.record.goals['8']!, '2026-11-24');
    expect(rows.map(x => [x.period, x.done, x.of, x.current])).toEqual([['week:2026-11-16', 2, 3, false], ['week:2026-11-23', 0, 3, true]]);
  });
  it('a week the app was not opened in is left out, never shown as 0', () => {
    const s: Platform = {...emptyPlatform(), goals: [project()]};
    const r = setRepeat(emptyGoalRepeat(), project(), 'week', '2026-11-03', at('2026-11-03'));
    const t = turnRepeats(s, r, '2026-11-24');
    expect(repeatRows(t.platform, t.platform.goals[0]!, t.record.goals['8']!, '2026-11-24').map(x => x.period)).toEqual(['week:2026-11-02', 'week:2026-11-23']);
  });
});
