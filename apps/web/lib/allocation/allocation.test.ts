import {describe, expect, test} from 'vitest';
import type {ContributionEvent, PrivateGoal, ValuationSnapshot} from '../positions';
import {TARGET_ALLOCATION_KEY, assetPerformance, driftByCurrency, emptyTargetAllocation, holdingRows, setTargets, targetAllocationSchema, targetSum, type HoldingRow} from './target';
import {AVAILABLE, layoutFlows, purposeAssets, purposeFlows} from './purpose';
import {autopilotSuggestions, contributionPrefillHref, contributionRhythm, dayWords} from './autopilot';
import {AUTO_EVERY_MS, backoff, canRefreshNow, lastSyncedText, nextRefresh} from './exchange-refresh';

const h = (positionId: string, wealthClass: string, value: bigint | undefined, currency = 'EUR', asset = positionId): HoldingRow => ({positionId, assetKey: asset.toUpperCase(), assetLabel: asset, wealthClass, currency, ...(value !== undefined ? {value} : {})});

describe('target allocation and drift (Session AK 7.4)', () => {
  test('the key, a loose record, targets checked and summed', () => {
    expect(TARGET_ALLOCATION_KEY).toBe('zigoals:target-allocation:v1');
    expect(targetAllocationSchema.safeParse({...emptyTargetAllocation(), later: true}).success).toBe(true);
    const r = setTargets(emptyTargetAllocation(), 'class', [{key: 'Stocks', label: 'Stocks', percent: '60'}, {key: 'Crypto', label: 'Crypto', percent: '30.5'}, {key: 'Cash', label: 'Cash', percent: '0'}]);
    expect(r.targets.map(t => t.key)).toEqual(['Stocks', 'Crypto']);
    expect(targetSum(r)).toBe(90.5);
    expect(() => setTargets(r, 'class', [{key: 'A', label: 'A', percent: '70'}, {key: 'B', label: 'B', percent: '40'}])).toThrow(/110/);
    expect(() => setTargets(r, 'class', [{key: 'A', label: 'A', percent: '101'}])).toThrow();
  });
  test('drift per currency, never mixed; unvalued counted apart; a target with no holding shows 0 %', () => {
    const record = setTargets(emptyTargetAllocation(), 'class', [{key: 'Stocks', label: 'Stocks', percent: '60'}, {key: 'Crypto', label: 'Crypto', percent: '30'}, {key: 'Cash', label: 'Cash', percent: '10'}]);
    const views = driftByCurrency([h('a', 'Stocks', 50000n), h('b', 'Stocks', 20000n), h('c', 'Crypto', 30000n), h('d', 'Crypto', undefined), h('e', 'Stocks', 10000n, 'USD')], record);
    expect(views.map(v => v.currency)).toEqual(['EUR', 'USD']);
    const eur = views[0]!;
    expect(eur.total).toBe('1000');
    expect(eur.unvalued).toBe(1);
    expect(eur.rows.map(r => [r.key, r.current, r.target, r.drift, r.status, r.targetValue])).toEqual([['Stocks', 70, 60, 10, 'above', '600'], ['Crypto', 30, 30, 0, 'within', '300'], ['Cash', 0, 10, -10, 'below', '100']]);
    expect(views[1]!.rows[0]).toMatchObject({key: 'Stocks', current: 100, status: 'above'});
  });
  test('by asset, from the overview rows', () => {
    const rows = holdingRows([{position: {id: 'p1', asset: 'btc', providerId: 'x'}, wealthClass: 'Crypto', currency: 'USD', value: 30000n}, {position: {id: 'p2', asset: 'ETH', providerId: 'y'}, wealthClass: 'Crypto', currency: 'USD', value: 10000n}]);
    const record = setTargets(emptyTargetAllocation(), 'asset', [{key: 'BTC', label: 'BTC', percent: '50'}], 2);
    expect(driftByCurrency(rows, record)[0]!.rows.map(r => [r.key, r.current, r.status])).toEqual([['BTC', 75, 'above'], ['ETH', 25, 'no-target']]);
  });
  test('30- and 90-day changes from stored snapshots; unknown stays unknown', () => {
    const now = Date.parse('2026-10-31T12:00:00Z'), day = 86_400_000;
    const snap = (id: string, daysAgo: number, price: string, currency = 'USD', source: ValuationSnapshot['source'] = 'COINGECKO'): ValuationSnapshot => ({id, positionId: 'p1', quantity: '2', quantityDecimals: 0, value: String(Number(price) * 200), decimals: 2, currency, source, capturedAt: new Date(now - daysAgo * day).toISOString()});
    const snaps = [snap('s1', 95, '100'), snap('s2', 31, '120'), snap('s3', 1, '150')];
    expect(assetPerformance(snaps, 'p1', now, 30)).toMatchObject({pct: '25'});
    expect(assetPerformance(snaps, 'p1', now, 90)).toMatchObject({pct: '50'});
    expect(assetPerformance([snap('s3', 1, '150')], 'p1', now, 30)).toEqual({reason: 'no-history'});
    expect(assetPerformance([snap('s0', 200, '100'), snap('s3', 1, '150')], 'p1', now, 90)).toEqual({reason: 'no-history'});
    expect(assetPerformance([snap('s2', 31, '120', 'EUR'), snap('s3', 1, '150')], 'p1', now, 30)).toEqual({reason: 'currency-changed'});
    expect(assetPerformance([snap('s2', 31, '120', 'USD', 'MANUAL'), snap('s3', 1, '150', 'USD', 'MANUAL')], 'p1', now, 30)).toEqual({reason: 'no-history'});
    expect(assetPerformance(snaps, 'p1', now, 30, false)).toEqual({reason: 'not-market-priced'});
    const priced = [{...snap('a', 35, '0'), price: '1000', priceDecimals: 1}, {...snap('b', 0, '0'), price: '110', priceDecimals: 0}];
    expect(assetPerformance(priced, 'p1', now, 30).pct).toBe('10');
  });
});

describe('purpose allocation flows (Session AK 7.5)', () => {
  const goals = [{id: '1', name: 'House', status: 'active'}, {id: '2', name: 'Trip', status: 'active'}, {id: '3', name: 'Old', status: 'closed'}];
  test('assets → goals → still available, per currency; over-promises scale down; closed goals and unvalued assets apart', () => {
    const assets = purposeAssets([
      {position: {id: 'a', asset: 'BTC', providerId: 'x', quantity: '100'}, wealthClass: 'Crypto', currency: 'EUR', value: 10000n},
      {position: {id: 'b', asset: 'CASH', providerId: 'x', quantity: '10'}, wealthClass: 'Cash', currency: 'EUR', value: 5000n},
      {position: {id: 'c', asset: 'AAPL', providerId: 'x', quantity: '4'}, wealthClass: 'Stocks', currency: 'USD', value: 2000n},
      {position: {id: 'd', asset: 'ART', providerId: 'x', quantity: '1'}, wealthClass: 'Custom'},
    ]);
    const {views, unvalued} = purposeFlows({assets, goals, allocations: [{goalId: '1', positionId: 'a', quantity: '50'}, {goalId: '2', positionId: 'b', quantity: '10'}, {goalId: '1', positionId: 'b', quantity: '10'}, {goalId: '3', positionId: 'a', quantity: '50'}, {goalId: '1', positionId: 'c', quantity: '1'}]});
    expect(unvalued).toEqual([{positionId: 'd', label: 'ART'}]);
    expect(views.map(v => v.currency)).toEqual(['EUR', 'USD']);
    const eur = views[0]!;
    expect(eur.total).toBe(15000n);
    expect(eur.flows).toEqual([{from: 'a', to: 'goal:1', value: 5000n}, {from: 'a', to: AVAILABLE, value: 5000n}, {from: 'b', to: 'goal:2', value: 2500n}, {from: 'b', to: 'goal:1', value: 2500n}]);
    expect(eur.targets.map(t => [t.label, t.value])).toEqual([['House', 7500n], ['Trip', 2500n], ['Still available', 5000n]]);
    expect(views[1]!.targets.map(t => [t.label, t.value])).toEqual([['House', 500n], ['Still available', 1500n]]);
  });
  test('the layout: two columns, bands inside their nodes, flows sum to the total', () => {
    const {views} = purposeFlows({assets: [{positionId: 'a', label: 'A', wealthClass: 'Crypto', currency: 'EUR', value: 300n, quantity: '3'}, {positionId: 'b', label: 'B', wealthClass: 'Cash', currency: 'EUR', value: 100n, quantity: '1'}], goals, allocations: [{goalId: '1', positionId: 'a', quantity: '1'}]});
    const layout = layoutFlows(views[0]!, {width: 600});
    expect(layout.nodes.filter(n => n.side === 'left').map(n => n.id)).toEqual(['a', 'b']);
    expect(layout.nodes.filter(n => n.side === 'right').map(n => n.id)).toEqual(['goal:1', AVAILABLE]);
    for (const band of layout.bands) {
      const from = layout.nodes.find(n => n.id === band.from && n.side === 'left')!;
      expect(band.y0).toBeGreaterThanOrEqual(from.y); expect(band.y0).toBeLessThanOrEqual(from.y + from.h);
    }
    expect(views[0]!.flows.reduce((n, f) => n + f.value, 0n)).toBe(views[0]!.total);
  });
});

describe('contribution autopilot (Session AK 7.6)', () => {
  const goal = (id: string, extra: Partial<PrivateGoal> = {}): PrivateGoal => ({id, name: `Goal ${id}`, network: 'zigchain-1', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'eur', decimals: 2, target: '100000', notes: '', createdAt: '2026-01-01T00:00:00.000Z', milestones: [], ...extra});
  let n = 0;
  const event = (goalId: string, day: string, quantity: string, extra: Partial<ContributionEvent> = {}): ContributionEvent => ({id: `c${n++}`, goalId, goalScope: 'private', direction: 'IN', quantity, asset: 'EUR', decimals: 2, occurredAt: `${day}T12:00:00.000Z`, provenance: 'LOCAL_CONFIRMED', ...extra});
  const dayOf = (iso: string) => iso.slice(0, 10);
  test('a monthly rhythm: the usual day and amount, the next date, a pre-fill link', () => {
    const events = [event('1', '2026-07-03', '10000'), event('1', '2026-08-04', '10000'), event('1', '2026-09-03', '12000'), event('1', '2026-10-02', '10000')];
    const s = contributionRhythm(goal('1'), events, '2026-10-31', dayOf)!;
    expect(s).toMatchObject({rhythm: 'monthly', day: 3, amount: '10000', occurrences: 4, nextDate: '2026-11-03', doneThisPeriod: true, confidence: 'high', hasPlan: false});
    expect(s.prefillHref).toBe('/app/goals/tracked/1?contribute=1&amount=10000#funding-wealth');
    expect(dayWords(s, () => '')).toBe('on the 3rd');
    expect(contributionRhythm(goal('1'), events, '2026-11-01', dayOf)).toMatchObject({nextDate: '2026-11-03', doneThisPeriod: false});
  });
  test('weekly, and what is left out: reversals, rewards, other assets, too few, irregular, closed goals', () => {
    const weekly = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].map(d => event('2', d, '2500'));
    expect(contributionRhythm(goal('2'), weekly, '2026-10-31', dayOf)).toMatchObject({rhythm: 'weekly', day: 1, nextDate: '2026-11-02', doneThisPeriod: true});
    const reversedOne = event('3', '2026-09-03', '100');
    const mixed = [event('3', '2026-08-03', '100'), reversedOne, event('3', '2026-09-04', '100', {reversesId: reversedOne.id, direction: 'OUT'}), event('3', '2026-10-03', '100', {provenance: 'REWARD_INCOME'}), event('3', '2026-10-03', '100', {asset: 'USD'})];
    expect(contributionRhythm(goal('3'), mixed, '2026-10-31', dayOf)).toBeNull();
    expect(contributionRhythm(goal('4'), ['2026-07-01', '2026-07-09', '2026-09-28'].map(d => event('4', d, '1')), '2026-10-31', dayOf)).toBeNull();
    expect(contributionRhythm(goal('5', {status: 'closed'}), ['2026-08-03', '2026-09-03', '2026-10-03'].map(d => event('5', d, '1')), '2026-10-31', dayOf)).toBeNull();
    const all = autopilotSuggestions({goals: [goal('1'), goal('2')], contributions: [...weekly, ...['2026-08-03', '2026-09-03', '2026-10-03'].map(d => event('1', d, '5'))]}, '2026-10-31', dayOf);
    expect(all.map(s => s.goalId)).toEqual(['2', '1']);
  });
  test('the pre-fill link carries only a valid base-unit amount', () => {
    expect(contributionPrefillHref('12', '0')).toBe('/app/goals/tracked/12?contribute=1#funding-wealth');
    expect(contributionPrefillHref('12', '1.5')).toBe('/app/goals/tracked/12?contribute=1#funding-wealth');
    expect(contributionPrefillHref('12')).toBe('/app/goals/tracked/12?contribute=1#funding-wealth');
  });
});

describe('exchange auto-refresh (Session AK 7.2)', () => {
  const now = Date.parse('2026-10-31T12:00:00Z');
  test('every 15 minutes while visible and online; never hidden or offline; back-off after failures', () => {
    expect(nextRefresh(null, now, true, true)).toEqual({at: now, reason: 'due'});
    expect(nextRefresh(now - 5 * 60_000, now, true, true)).toEqual({at: now + 10 * 60_000, reason: 'wait'});
    expect(nextRefresh(new Date(now - 20 * 60_000).toISOString(), now, true, true)).toEqual({at: now, reason: 'due'});
    expect(nextRefresh(now - 20 * 60_000, now, false, true)).toEqual({at: null, reason: 'hidden'});
    expect(nextRefresh(now - 20 * 60_000, now, true, false)).toEqual({at: null, reason: 'offline'});
    expect(nextRefresh(now + 3_600_000, now, true, true)).toEqual({at: now + AUTO_EVERY_MS, reason: 'wait'});
    expect([0, 1, 2, 3, 9].map(backoff)).toEqual([15, 30, 60, 60, 60].map(m => m * 60_000));
    expect(nextRefresh(now - 20 * 60_000, now, true, true, 1)).toEqual({at: now + 10 * 60_000, reason: 'wait'});
  });
  test('refresh now is never within 60 seconds of the last try; the line', () => {
    expect(canRefreshNow(now - 30_000, now)).toEqual({ok: false, inSeconds: 30});
    expect(canRefreshNow(now - 61_000, now)).toEqual({ok: true, inSeconds: 0});
    expect(canRefreshNow(undefined, now).ok).toBe(true);
    expect([null, now - 10_000, now - 4 * 60_000, now - 3 * 3_600_000, now - 72 * 3_600_000].map(t => lastSyncedText(t, now))).toEqual(['Not synced yet', 'Last synced just now', 'Last synced 4 min ago', 'Last synced 3 h ago', 'Last synced 3 days ago']);
  });
});
