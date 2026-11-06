import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import type {Position} from '../positions';
import {buildPlan, type PlanInput} from './plan';
import {emptyNotifyPrefs} from './prefs';
import {zonedInstant} from './zone';
import {stakingItems} from './staking-items';

// Session AL sweep 4 (C-DVG-68, C-BN-06): unbonding days and a validator not earning, in this device's notification plan.
const ZONE = 'Europe/Brussels', NOW = Date.UTC(2026, 9, 5, 5, 0); // Monday 07:00 in Brussels
const pos = (over: Partial<Position>): Position => ({id: 'x', providerId: 'native-zig', sourceType: 'NATIVE_UNBONDING', network: 'zigchain-1', account: 'zig1me', asset: 'ZIG', denom: 'azig', quantity: '1000000000000000000', decimals: 18, liquidity: 'UNBONDING', verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-01T00:00:00.000Z', provenance: 'test', notes: '', risk: '', executionAuthority: 'NONE', ...over} as Position);
const validator = (status: string) => ({address: 'zigvaloper1abc', name: 'Orbit Node', status, commission: '0.05', votingTokens: '1'});
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});

describe('staking items', () => {
  it('an unbonding day in the person\'s zone; a staked validator out of the active set; nothing for a bonded one or a past day', () => {
    const items = stakingItems([
      pos({id: 'u1', exitDate: '2026-10-06T21:30:00.000Z'}), // 23:30 on the 6th in Brussels
      pos({id: 'u0', exitDate: '2026-10-04T08:00:00.000Z'}), // already back
      pos({id: 's1', sourceType: 'NATIVE_STAKING', liquidity: 'BONDED', validator: validator('BOND_STATUS_UNBONDING')}),
    ], {now: NOW, timeZone: ZONE, today: '2026-10-05'});
    expect(items).toEqual([{kind: 'unbonding', id: 'unbonding:u1', date: '2026-10-06'}, {kind: 'validator', id: 'validator-not-earning', date: '2026-10-05'}]);
    expect(stakingItems([pos({id: 's1', sourceType: 'NATIVE_STAKING', validator: validator('BOND_STATUS_BONDED')}), pos({id: 's2', sourceType: 'NATIVE_STAKING', quantity: '0', validator: validator('BOND_STATUS_UNBONDED')}), pos({id: 's3', sourceType: 'NATIVE_STAKING', archivedAt: '2026-10-01T00:00:00.000Z', validator: validator('BOND_STATUS_UNBONDED')})], {now: NOW, timeZone: ZONE, today: '2026-10-05'})).toEqual([]);
  });
  it('the plan puts them at the morning time of their day, never named, and registers no wake of their own', () => {
    const without = buildPlan(base()), plan = buildPlan(base({staking: [{kind: 'unbonding', id: 'unbonding:u1', date: '2026-10-06'}, {kind: 'validator', id: 'validator-not-earning', date: '2026-10-05'}, {kind: 'unbonding', id: 'old', date: '2026-10-04'}]}));
    expect(plan.registration).toEqual(without.registration);
    const items = plan.snapshot.items.filter(i => i.kind === 'unbonding' || i.kind === 'validator');
    expect(items).toEqual([
      {at: zonedInstant('2026-10-05', '08:00', ZONE), kind: 'validator', id: 'validator-not-earning', href: '/app/staking', actionable: false},
      {at: zonedInstant('2026-10-06', '08:00', ZONE), kind: 'unbonding', id: 'unbonding:u1', href: '/app/earn#staking-clarity', actionable: false},
    ]);
    // A morning inside quiet hours moves to their end.
    const quiet = buildPlan(base({quiet: {from: '22:00', to: '09:00'}, staking: [{kind: 'unbonding', id: 'u', date: '2026-10-06'}]}));
    expect(quiet.snapshot.items.find(i => i.kind === 'unbonding')?.at).toBe(zonedInstant('2026-10-06', '09:00', ZONE));
  });
  it('the worker words them with the morning notification, without a name or an amount', () => {
    const self = {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}};
    const sandbox = vm.createContext({BigInt, Array, String, URL, Object, self});
    vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
    const compose = (self as unknown as {zigoalsCompose: (s: unknown, now: number) => {body: string; data: {url: string}}}).zigoalsCompose;
    const at = zonedInstant('2026-10-06', '08:00', ZONE), snapshot = buildPlan(base({now: at - 3_600_000, staking: [{kind: 'unbonding', id: 'unbonding:u1', date: '2026-10-06'}, {kind: 'validator', id: 'validator-not-earning', date: '2026-10-06'}]})).snapshot;
    const note = compose(snapshot, at);
    expect(note.body).toContain('Unstaked ZIG is back in your wallet today');
    expect(note.body).toContain('A validator you stake with is not earning: see Staking');
    expect(note.body).not.toMatch(/Orbit Node|zigvaloper|1\.0/);
  });
});
