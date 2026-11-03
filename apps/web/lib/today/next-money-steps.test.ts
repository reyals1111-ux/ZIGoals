import {describe, expect, it} from 'vitest';
import {nextMoneySteps, stepSplit} from './next-money-steps';
import type {AttentionItem} from '../product-insights';

const asset = (id: string): AttentionItem => ({id: `asset:${id}`, positionId: id, kind: 'value', title: `Value ${id}`, detail: '', action: 'Add a valuation', href: `/app/wealth/asset/${id}`});
const goal = (id: string, kind: AttentionItem['kind'] = 'overdue'): AttentionItem => ({id: `goal:${id}`, goalId: id, kind, title: `Catch up on ${id}`, detail: '', action: 'Record a contribution', href: `/app/goals/tracked/${id}`});
const row = (goalId: string) => ({goalId, name: goalId});

describe('nextMoneySteps (R2-9: one list, a goal once on Today)', () => {
  it('keeps every asset; leaves out goals shown elsewhere on Today', () => {
    const steps = nextMoneySteps([asset('btc'), goal('japan'), goal('home', 'plan')], [row('japan'), row('fund')], new Set(['japan', 'fund']));
    expect(steps.map(s => s.kind === 'attention' ? s.item.id : `agenda:${s.row.goalId}`)).toEqual(['asset:btc', 'goal:home']);
  });
  it('a goal not shown elsewhere appears once: its attention step, not also its agenda row', () => {
    const steps = nextMoneySteps([goal('car')], [row('car'), row('trip')], new Set());
    expect(steps.map(s => s.kind === 'attention' ? s.item.id : `agenda:${s.row.goalId}`)).toEqual(['goal:car', 'agenda:trip']);
  });
  it('nothing shown on Today: the old two lists, merged without repeats', () => {
    const steps = nextMoneySteps([asset('a'), goal('g1')], [row('g1'), row('g2'), row('g2')], new Set());
    expect(steps).toHaveLength(3);
  });
  it('empty in, empty out', () => {
    expect(nextMoneySteps([], [], new Set())).toEqual([]);
    expect(stepSplit([])).toBe('');
  });
  it('the heading counts assets and goals, each goal once', () => {
    const steps = nextMoneySteps([asset('a'), asset('b'), goal('g1')], [row('g2')], new Set());
    expect(stepSplit(steps)).toBe('2 assets · 2 goals');
    expect(stepSplit(nextMoneySteps([asset('a')], [], new Set()))).toBe('1 asset');
  });
});
