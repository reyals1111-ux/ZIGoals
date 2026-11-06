// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {emptyPlatform, platformSchema, positionSchema, privateGoalSchema, type Position} from './positions';
import {INTEGRITY_DISMISS_KEY, deficitSignature, dismissIntegrity, integrityDismissed} from './today/integrity-dismiss';
import {allocatedGoalNames} from '../components/platform/asset-editor';
import {AssetPicker} from '../components/platform/asset-picker';
import {availableWords} from './goals/funding-notes';

// Session AL sweep lane: TK-226 (Today's notice dismissed per deficits), TK-181 (the cut ask names its Goals), TK-194 (a
// picker card can carry the caller's own line).
vi.mock('next/link', () => ({default: ({href, children, ...rest}: {href: string; children: unknown}) => createElement('a', {href, ...rest}, children as never)}));
const at = '2026-11-04T08:00:00.000Z';
const manual = (over: Partial<Position> & {id: string}): Position => positionSchema.parse({providerId: over.id, sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'EUR', denom: 'EUR', quantity: '500000', decimals: 2, verification: 'MANUAL', observedAt: at, liquidity: 'LIQUID', provenance: 'User entry', assetClass: 'Cash', ...over});
const goal = (id: string, name: string, status = 'active') => privateGoalSchema.parse({id, name, type: 'VALUE', status, asset: 'EUR', denom: 'EUR', decimals: 2, target: '800000', notes: '', createdAt: '2026-11-01T08:00:00.000Z', milestones: []});
const platform = (quantity: string, goals = [goal('1', 'Holiday')], allocations = [{goalId: '1', positionId: 'a', quantity: '500000'}]) =>
  platformSchema.parse({...emptyPlatform(), positions: [manual({id: 'a', quantity})], goals, allocations});

describe('TK-226: the integrity notice is dismissed for the deficits it showed', () => {
  const store = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m}; };
  it('no deficit has no signature; a deficit names the source, its quantity and the deficit', () => {
    expect(deficitSignature(platform('500000'))).toBe('');
    expect(deficitSignature(platform('400000'))).toBe('a:400000:100000');
  });
  it('a dismissal holds for the same deficits and lapses when they change', () => {
    const s = store(), sig = deficitSignature(platform('400000'));
    expect(integrityDismissed(s, sig)).toBe(false);
    expect(dismissIntegrity(s, sig)).toBe(true);
    expect(s.m.get(INTEGRITY_DISMISS_KEY)).toBe(sig);
    expect(integrityDismissed(s, sig)).toBe(true);
    expect(integrityDismissed(s, deficitSignature(platform('300000')))).toBe(false);
    expect(integrityDismissed(s, '')).toBe(false);
  });
  it('a store that refuses reads as not dismissed and says the write failed', () => {
    const refusing = {getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); }};
    expect(integrityDismissed(refusing, 'a:1:1')).toBe(false);
    expect(dismissIntegrity(refusing, 'a:1:1')).toBe(false);
    expect(integrityDismissed(null, 'a:1:1')).toBe(false);
  });
});

describe('TK-181: the shortfall ask names the Goals that count the asset', () => {
  it('one, two, or the first two and how many more; closed Goals and empty allocations are left out', () => {
    expect(allocatedGoalNames(platform('500000'), 'a')).toBe('Holiday');
    const many = [goal('1', 'Holiday'), goal('2', 'Car'), goal('3', 'House'), goal('4', 'Old', 'closed'), goal('5', 'Bike')];
    const allocations = ['1', '2', '3', '4', '5'].map(goalId => ({goalId, positionId: 'a', quantity: goalId === '5' ? '0' : '1000'}));
    expect(allocatedGoalNames(platform('500000', many, allocations), 'a')).toBe('Holiday, Car and 1 more');
    expect(allocatedGoalNames(platform('500000', many, allocations.slice(0, 2)), 'a')).toBe('Holiday and Car');
    expect(allocatedGoalNames(platform('500000', many, []), 'a')).toBe('');
  });
});

describe('TK-194: an existing-asset card can carry the caller\'s own line', () => {
  let host: HTMLDivElement, root: Root;
  beforeEach(() => {
    (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
    vi.stubGlobal('fetch', async () => new Response('{}', {status: 503}));
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  const card = () => host.querySelector('.picker-existing button small')!.textContent;
  it('detail replaces the default availability words; null keeps them', async () => {
    const s = platform('500000', [goal('1', 'Holiday')], [{goalId: '1', positionId: 'a', quantity: '100000'}]);
    await act(async () => root.render(createElement(AssetPicker, {positions: s.positions, platform: s, initialCategory: 'Existing assets', onExisting: () => {}, detail: p => availableWords(s, p)})));
    expect(card()).toMatch(/^Available €4,000\.00 · /);
    await act(async () => root.render(createElement(AssetPicker, {positions: s.positions, platform: s, initialCategory: 'Existing assets', onExisting: () => {}, detail: () => null})));
    expect(card()).toMatch(/available of/);
  });
});
