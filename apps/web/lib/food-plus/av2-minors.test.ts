import {describe, expect, it} from 'vitest';
import {groupPlans} from './plan-groups';
import {buildReport} from '../clinician-report/build';

/** Session AV lane 2 (food; q3 #29 and #48 Minors): repeat plans grouped; a symptom's level as a series in the report. */
const AT = '2026-11-23T08:00:00.000Z', LATER = '2026-11-24T09:00:00.000Z';
const plan = (id: string, date: string, createdAt = AT, meal = 'Breakfast', loggedAt?: string) => ({id, savedMealId: 'health_saved-bowl-001', name: 'Fictional bowl', date, meal, createdAt, ...(loggedAt ? {loggedAt} : {})});
describe('repeat plans, grouped', () => {
  it('the plans one repeat made are one group (same meal, slot and moment); a single plan stays alone', () => {
    const groups = groupPlans([plan('health_plan-0004', '2026-12-03'), plan('health_plan-0001', '2026-11-23', AT, 'Breakfast', LATER), plan('health_plan-0002', '2026-11-26'), plan('health_plan-0009', '2026-11-25', LATER), plan('health_plan-0003', '2026-11-30')]);
    expect(groups.map(g => [g.plans.length, g.first, g.last, g.logged])).toEqual([[4, '2026-11-23', '2026-12-03', 1], [1, '2026-11-25', '2026-11-25', 0]]);
    expect(groups[0]!.plans.map(p => p.date)).toEqual(['2026-11-23', '2026-11-26', '2026-11-30', '2026-12-03']);
  });
});
describe('symptoms in the report, day by day', () => {
  it('each rated symptom has its level per day of the range, null when not rated', () => {
    const symptoms = {version: 1 as const, items: [{id: 'headache', name: 'Fictional headache', kind: 'symptom' as const, createdAt: AT}, {id: 'unused', name: 'Fictional unused', kind: 'symptom' as const, createdAt: AT}], days: {'2026-11-10': {headache: 3}, '2026-11-12': {headache: 1}}};
    const r = buildReport({from: '2026-11-09', to: '2026-11-12', today: '2026-11-14', health: null, habits: null, energy: null, symptoms, sections: ['symptoms']});
    expect(r.symptoms!.days).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12']);
    expect(r.symptoms!.series).toEqual([{name: 'Fictional headache', levels: [null, 3, null, 1]}]);
  });
});
