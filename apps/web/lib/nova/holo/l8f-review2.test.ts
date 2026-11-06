import {describe, expect, it} from 'vitest';
import {HEALTH_SHEETS, quickActionsFor, sheetHabits} from './actions';
import {goalArcs} from './goals';
import {frameWords, purposeShare} from './wealth';
import {wholePercent} from '../widgets/words';
import {panelsOf, showcaseNova} from '../store';
import type {GoalSummary} from '../../goal-summary';

/**
 * Session AL lane L8f (docs/review/session-al/NOVA_HUD_REVIEW_2.md): the logic behind the second review's fixes — the
 * Goals page's rounding on NOVA (M6), one percent style (p7), the Showcase's left panel left to the window (M3, M4), the
 * Health sheet's habits (p4) and the wealth frame's words printed once (m9). Fictional records only.
 */
const goal = (over: Partial<GoalSummary>): GoalSummary => ({key: 'private:g1', id: 'g1', href: '/app/goals/tracked/g1', name: 'Fictional trip', type: 'Saving Goal', source: 'Private allocation', status: 'active', scene: 'horizon',
  current: '2500', target: '6000', currency: 'USD', progressPct: '41.6666', fundingHealth: 'BEHIND', requiresReview: false, metadata: [], ...over});

describe('M6: a goal reads the same percent on NOVA as on Goals', () => {
  it('2,500 of 6,000 (41.67 %) is 42% on the arcs and the core, as the Goals page rounds it (half up)', () => {
    expect(goalArcs([goal({})]).arcs[0]!.text).toBe('42%');
    expect(wholePercent('41.6666')).toBe('42%');
  });
  it('99.6 % reads 99% until the goal is finished; a finished one reads 100%; unknown stays "Unavailable"', () => {
    expect(goalArcs([goal({progressPct: '99.6'})]).arcs[0]!.text).toBe('99%');
    expect(wholePercent('99.6', undefined, true)).toBe('100%');
    expect(goalArcs([goal({progressPct: '40', progressBound: 'unavailable'})]).arcs[0]!.text).toBe('Unavailable');
    expect(goalArcs([goal({progressPct: '12.5', progressBound: 'at-least'})]).arcs[0]!.text).toBe('At least 13%');
  });
});

describe('p7: one percent style on NOVA', () => {
  it('the purpose flow\'s share keeps its figure (one decimal, rounded down) without a space before "%"', () => {
    expect(purposeShare(127n, 1000n)).toBe('12.7%');
    expect(purposeShare(1n, 3n)).toBe('33.3%');
    expect(purposeShare(1n, 0n)).toBe('—');
  });
});

describe('M3, M4: the Showcase leaves the left panel to the window', () => {
  it('open at 1440, the icon rail at 1280, folded on an 820 px tablet', () => {
    const r = showcaseNova('2026-11-05');
    expect(r.panels).toBeUndefined();
    expect([1920, 1440, 1280, 1100, 1024, 820, 390].map(w => panelsOf(r, w).left)).toEqual(['open', 'open', 'rail', 'rail', 'hidden', 'hidden', 'hidden']);
  });
});

describe('p4: the habits a quick-actions sheet ticks', () => {
  const due = ['read', 'exercise', 'walk', 'meditate', 'contribute', 'water', 'stretch'].map(id => ({id}));
  const linked = (id: string) => id === 'walk' || id === 'water';
  it('a Health panel\'s sheet offers only the habits linked to Health and counts the rest', () => {
    expect(quickActionsFor('health-hud')).toContain('habit');
    for (const w of HEALTH_SHEETS) {
      const s = sheetHabits(due, w, linked);
      expect(s.shown.map(h => h.id)).toEqual(['walk', 'water']);
      expect(s.more).toBe(5);
    }
  });
  it('any other sheet offers the habits due today, six at most, and counts the one left out', () => {
    const s = sheetHabits(due, 'habits-hud', linked);
    expect(s.shown).toHaveLength(6);
    expect(s.more).toBe(1);
    expect(sheetHabits([], 'health-hud', linked)).toEqual({shown: [], more: 0});
  });
});

describe('m9: the recorded line\'s frame prints each figure once', () => {
  const money = (v: number) => `$${v.toLocaleString('en-US', {minimumFractionDigits: 2})}`, day = (at: string) => at.slice(5);
  it('a last record that is the highest is said once, in the "max" corner with its date; no second label at the line\'s end', () => {
    const w = frameWords([{at: '2026-08-13', value: 454146.1}, {at: '2026-10-01', value: 500000}, {at: '2026-11-05', value: 537406.1}], money, day);
    expect(w.max).toBe('11-05 $537,406.10');
    expect(w.min).toBe('$454,146.10');
    expect(w.end).toBeNull();
    expect(w.span).toBe('08-13 – 11-05');
  });
  it('a last record between the highest and the lowest keeps its own value at the line\'s end', () => {
    const w = frameWords([{at: '2026-08-13', value: 400}, {at: '2026-10-01', value: 900}, {at: '2026-11-05', value: 700}], money, day);
    expect([w.max, w.min, w.end]).toEqual(['$900.00', '$400.00', '$700.00']);
  });
  it('a last record that is the lowest is said in the "min" corner', () => {
    const w = frameWords([{at: '2026-08-13', value: 900}, {at: '2026-11-05', value: 400}], money, day);
    expect([w.max, w.min, w.end]).toEqual(['$900.00', '11-05 $400.00', null]);
  });
});

describe('Part 13 requests: NOVA counts what Today and Goals count', () => {
  const avg = (id: string, over: Partial<{status: string; share: number | null; met: boolean | null}> = {}) => ({id, name: `Fictional average ${id}`, status: 'active', share: 0.5, met: false, ...over});
  it('the average goals join the arcs after the goal summaries, and `active` is activeGoalCount', async () => {
    const {activeGoalCount} = await import('../../numbers/counts');
    const summaries = [goal({}), goal({key: 'private:g2', id: 'g2', name: 'Fictional bike', progressPct: '65'}), goal({key: 'private:g3', id: 'g3', status: 'completed', progressPct: '100'})];
    const averages = [avg('sleep', {share: 0.9, met: false}), avg('steps', {share: 1, met: true}), avg('water', {share: null, met: null}), avg('old', {status: 'completed'})];
    const r = goalArcs(summaries, 99, averages);
    expect(r.active).toBe(activeGoalCount(summaries, averages));
    expect(r.active).toBe(5);
    expect(r.arcs.map(a => [a.name, a.text, a.pace.words])).toEqual([['Fictional trip', '42%', 'Behind plan'], ['Fictional bike', '65%', 'Behind plan'],
      ['Fictional average sleep', '90%', 'Not on target yet'], ['Fictional average steps', '100%', 'On target'], ['Fictional average water', 'Unavailable', 'No days recorded yet']]);
    expect(r.arcs[2]!.href).toBe('/app/goals/average/sleep');
    expect(goalArcs(summaries, 3, averages).more).toBe(2);
  });
  it('water is said in Health\'s words', async () => {
    const {waterAmount} = await import('../widgets/words');
    const {waterText} = await import('../../health-units');
    for (const [ml, unit] of [[250, 'ml'], [1250, 'ml'], [2000, 'fl-oz-us']] as const) expect(waterAmount(ml, unit)).toBe(waterText(ml, unit));
  });
});
