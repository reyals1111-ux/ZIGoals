import {describe, expect, it} from 'vitest';
import {emptyPlatform, platformSchema, positionSchema, privateGoalSchema, type Platform} from '../positions';
import {archiveAsset} from '../asset-management';
import {recordGoalChanges} from '../goal-intelligence';
import {privateGoalSummary} from '../goal-summary';
import {archivedReleaseLabel, markReleaseReviewed, releasedByArchive, releasedWords} from './funding-notes';

// Fix-up (CI 1539, TK-196 in the Showcase): archiving an asset that counted toward a goal flags that goal, even when no
// value snapshot named the asset first (the Showcase's example history has no per-source evidence).
const at = '2026-11-04T08:00:00.000Z';
const usdc = positionSchema.parse({id: 'usdc', providerId: 'USD Coin', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'USDC', denom: 'USDC', quantity: '500000', decimals: 2, verification: 'MANUAL', liquidity: 'LIQUID', provenance: 'User entry', observedAt: at, assetClass: 'Stablecoins', valuation: {value: '500000', currency: 'USD', decimals: 2, source: 'MANUAL', observedAt: at}});
const cash = positionSchema.parse({...usdc, id: 'cash', providerId: 'Cash box', asset: 'USD', denom: 'USD', assetClass: 'Cash'});
const goal = privateGoalSchema.parse({id: '9', name: 'Emergency fund', type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target: '1000000', notes: '', createdAt: '2026-11-01T08:00:00.000Z', milestones: []});
// A value snapshot with no per-source evidence, taken earlier the same day (as the Showcase's example history is).
const snap = {id: 'v1', goalId: '9', kind: 'valuation' as const, capturedAt: '2026-11-04T07:00:00.000Z', current: '500000', target: '1000000', asset: 'USD', decimals: 2, actualContributed: '0', rewardIncome: '0', planned: '0', requiresReview: false, evidence: []};
const base: Platform = platformSchema.parse({...emptyPlatform(), positions: [usdc, cash], goals: [goal], allocations: [{goalId: '9', positionId: 'usdc', quantity: '500000'}, {goalId: '9', positionId: 'cash', quantity: '100000'}], goalHistory: [snap]});
const archiveAt = Date.parse('2026-11-04T09:00:00Z');

describe('TK-196: an archive that releases a goal\'s allocation is named on the goal', () => {
  it('writes the release line in the save that archives, and the goal says so until reviewed', () => {
    expect(releasedByArchive(archiveAsset(base, 'usdc', true, archiveAt), '9')).toEqual([]); // without the save's line, nothing to go on
    const saved = platformSchema.parse(recordGoalChanges(base, archiveAsset(base, 'usdc', true, archiveAt), archiveAt + 5));
    const lines = saved.goalHistory.filter(h => h.kind === 'allocation').map(h => 'label' in h ? h.label : '');
    expect(lines).toEqual([archivedReleaseLabel('USD Coin')]); // the cash allocation is untouched: no plain "changed" line
    const released = releasedByArchive(saved, '9');
    expect(released.map(r => [r.name, r.counted])).toEqual([['USD Coin', undefined]]);
    expect(releasedWords(released[0]!)).toMatch(/^USD Coin was archived on .*; it had counted toward this goal, and no longer does\.$/);
    const summary = privateGoalSummary(saved, saved.goals[0]!);
    expect([summary.released, summary.requiresReview]).toEqual([1, true]);
    const reviewed = platformSchema.parse(markReleaseReviewed(saved, '9', released[0]!, '2026-11-04T10:00:00.000Z'));
    expect(releasedByArchive(reviewed, '9')).toEqual([]);
  });
  it('a release that is not an archive keeps the plain line and flags nothing', () => {
    const after = platformSchema.parse({...base, allocations: base.allocations.filter(a => a.positionId !== 'cash')});
    const saved = platformSchema.parse(recordGoalChanges(base, after, archiveAt));
    expect(saved.goalHistory.filter(h => h.kind === 'allocation').map(h => 'label' in h ? h.label : '')).toEqual(['Goal allocation changed']);
    expect(releasedByArchive(saved, '9')).toEqual([]);
  });
});
