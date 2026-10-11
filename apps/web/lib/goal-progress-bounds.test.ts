import {describe, expect, it} from 'vitest';
import {buildShowcase} from './showcase-data';
import {emptyPlatform, platformSchema, type Platform} from './positions';
import {legacyGoalSummary, privateGoalSummary, progressText, valuationBound} from './goal-summary';
import {DemoPriceProvider} from './valuation';
import {applyLocal, initialLedger} from './local-ledger';
import {widgetMetric} from './dashboard-metrics';
import {emptyHabitData} from './habits';
import {createEmptyHealth} from './health';

// Session I, Part 10: QA-37 (simulated ZIG is never valued 1:1 in EUR or USD) and QA-38 (a missing valuation makes
// progress a lower bound, or unavailable, never an exact figure).
const NOW = Date.parse('2026-10-01T12:00:00.000Z');
const showcase = (): Platform => platformSchema.parse(JSON.parse(buildShowcase('2026-10-01').records['zigoals:platform:v1']!));
/** The Showcase emergency fund (USD cash + USDC), with the named sources' saved values removed. */
function emergencyFund(withoutValue: string[]) {
  const data = showcase();
  data.positions = data.positions.map(p => withoutValue.includes(p.id) ? {...p, valuation: undefined, valuationMode: 'automatic' as const} : p);
  return privateGoalSummary(data, data.goals.find(g => g.id === '9201')!, [], NOW);
}

describe('QA-38: a missing valuation', () => {
  it('leaves exact progress exact when every source has a value', () => {
    const summary = emergencyFund([]);
    expect(summary.progressBound).toBeUndefined();
    expect(summary.unvaluedSources).toBeUndefined();
  });
  it('makes progress a lower bound while some sources have no value, and says how many', () => {
    const summary = emergencyFund(['showcase-usdc']);
    expect(summary.progressBound).toBe('at-least');
    expect(summary.unvaluedSources).toBe(1);
    expect(progressText(summary.progressPct, summary.progressBound)).toMatch(/^At least \d+(\.\d+)?%$/);
  });
  it('makes progress unavailable when no source has a value', () => {
    const summary = emergencyFund(['showcase-usdc', 'showcase-usd']);
    expect(summary.progressBound).toBe('unavailable');
    expect(progressText(summary.progressPct, summary.progressBound)).toBe('Unavailable');
  });
  it('counts only sources whose value is missing', () => {
    expect(valuationBound({breakdown: [{valuation: {state: 'fresh'}}, {valuation: {state: 'missing'}}, {}]})).toEqual({bound: 'at-least', unvalued: 1});
    expect(valuationBound({breakdown: []})).toEqual({unvalued: 0});
  });
});

describe('QA-37: simulated ZIG has no price', () => {
  const ledger = applyLocal(applyLocal(initialLedger(), {kind: 'create'}, '2026-09-01T00:00:00.000Z'), {kind: 'deposit', id: '1', amount: '250000000000000000000'}, '2026-09-02T00:00:00.000Z');
  const goal = ledger.goals[0]!;
  const plan = (currency: 'EUR' | 'USD' | 'ZIG') => ({name: 'Fictional trip', category: 'Travel', targetValue: '1000', currency, targetDate: '2027-09-01', startingAmount: '0', monthlyContribution: '50', riskPreference: 'Conservative', liquidityPreference: 'Anytime', deadlineFlexible: false, notes: ''}) as Parameters<typeof legacyGoalSummary>[1];
  it('values ZIG only as ZIG; EUR and USD are unknown, never 1:1', () => {
    expect(DemoPriceProvider.value(goal.position_units, 'ZIG')).toBe('250');
    expect(DemoPriceProvider.value(goal.position_units, 'EUR')).toBeNull();
    expect(DemoPriceProvider.value(goal.position_units, 'USD')).toBeNull();
  });
  it('a EUR plan shows the ZIG held, no progress, nothing remaining and the reason', () => {
    const summary = legacyGoalSummary(goal, plan('EUR'), 'Local simulation', NOW);
    expect(summary).toMatchObject({current: '250', heldAsset: 'ZIG', currency: 'EUR', target: '1000', progressBound: 'unavailable', fundingHealth: 'Value unknown', valuationLabel: 'Value in EUR: unknown — simulated ZIG has no price'});
    expect(summary.remaining).toBeUndefined();
    expect(summary.metadata.find(m => m.label === 'Required monthly')?.value).toBe('Unknown — no price');
  });
  it('a ZIG plan is unchanged: exact progress against its ZIG target', () => {
    const summary = legacyGoalSummary(goal, plan('ZIG'), 'Local simulation', NOW);
    expect(summary).toMatchObject({current: '250', currency: 'ZIG', progressPct: '25'});
    expect(summary.progressBound).toBeUndefined();
    expect(summary.heldAsset).toBeUndefined();
  });
  it('a Goal widget on Today shows the ZIG held and no ring for a EUR plan', () => {
    const summary = legacyGoalSummary(goal, plan('EUR'), 'Local simulation', NOW);
    const metric = widgetMetric({id: 'w', kind: 'goal', metric: 'progress', entity: summary.key, title: '', size: 'compact', hidden: false} as Parameters<typeof widgetMetric>[0], {goals: [summary], habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), quotes: [], now: NOW, today: '2026-10-01', healthDate: '2026-10-01'});
    expect(metric.value).toBe('250 ZIG');
    expect(metric.percent).toBeUndefined();
    expect(metric.warning).toBe('Value in EUR: unknown — simulated ZIG has no price');
  });
});
