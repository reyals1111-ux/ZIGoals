import {toBech32} from '@cosmjs/encoding';
import {describe, expect, test} from 'vitest';
import type {WireValidator} from '../chain/validators-wire';
import {MAX_BASELINES, VALIDATOR_ALERTS, alertsOff, baselineKey, healthOf, readValidatorAlerts, updateValidatorAlerts, withAcknowledged, withAlertsOff, withBaselines} from './health';

// Session AF chunk 3 (lane L2a; P6.7): validator health for the validators a person delegates to, and its device record.
class Memory { map = new Map<string, string>(); getItem(k: string) { return this.map.get(k) ?? null; } setItem(k: string, v: string) { this.map.set(k, v); } }
const A = toBech32('zigvaloper', new Uint8Array(20).fill(2)), B = toBech32('zigvaloper', new Uint8Array(20).fill(3)), C = toBech32('zigvaloper', new Uint8Array(20).fill(4));
const NOW = Date.parse('2026-10-19T12:00:00Z');
const v = (operator: string, over: Partial<WireValidator> = {}): WireValidator => ({operator, moniker: `Fictional ${operator.slice(-3)}`, website: '', status: 'bonded', jailed: false, tombstoned: false, tokens: '1', votingPowerShare: '0.1',
  commission: {rate: '0.05', maxRate: '0.2', maxChangeRate: '0.01', updatedAt: '2026-01-01T00:00:00.000Z'}, selfBond: '1', uptime: {window: 35000, missed: 12, signedShare: '0.99'}, ...over});
const kinds = (h: ReturnType<typeof healthOf>[number]) => h.alerts.map(a => a.kind);

describe('healthOf', () => {
  test('a healthy validator has no alerts and its facts; unknown operators say so; each operator once', () => {
    const [ok, missing, ...rest] = healthOf('zig-test-2', [v(A)], [A, C, A], {version: 1}, NOW);
    expect(rest).toEqual([]);
    expect(ok).toMatchObject({operator: A, found: true, alerts: [], missed: {count: 12, window: 35000, allowed: 7000}, commission: {rate: '0.05'}});
    expect(missing).toMatchObject({operator: C, found: false});
    expect(kinds(missing!)).toEqual(['inactive']);
  });
  test('tombstoned, jailed and inactive in plain words; missing blocks from half the allowed misses', () => {
    const list = [v(A, {tombstoned: true, jailed: true}), v(B, {jailed: true}), v(C, {status: 'unbonded'})];
    const [a, b, c] = healthOf('zig-test-2', list, [A, B, C], {version: 1}, NOW);
    expect(kinds(a!)).toEqual(['tombstoned']);
    expect(a!.alerts[0]!.text).toMatch(/^Tombstoned: removed for good/);
    expect(kinds(b!)).toEqual(['jailed']);
    expect(b!.alerts[0]!.text).toBe('Jailed: it stopped signing blocks and earns nothing for you while jailed. Your stake is not lost; you can move it to another validator at once.');
    expect(kinds(c!)).toEqual(['inactive']);
    expect(kinds(healthOf('zig-test-2', [v(A, {uptime: {window: 35000, missed: 3499, signedShare: '0.9'}})], [A], {version: 1}, NOW)[0]!)).toEqual([]);
    const near = healthOf('zig-test-2', [v(A, {uptime: {window: 35000, missed: 3500, signedShare: '0.9'}})], [A], {version: 1}, NOW)[0]!;
    expect(near.alerts).toEqual([{kind: 'missing-blocks', severity: 'medium', text: 'Missing blocks: 3,500 of the last 35,000. The chain jails a validator that misses more than 7,000 of them.'}]);
  });
  test('a commission change since this device last looked; a recent change said once without a baseline', () => {
    const base = withBaselines({version: 1}, 'zig-test-2', [v(A)], [A], new Date('2026-10-01T00:00:00Z'));
    expect(base.seen?.[baselineKey('zig-test-2', A)]).toEqual({at: '2026-10-01T00:00:00.000Z', rate: '0.05', maxRate: '0.2', maxChangeRate: '0.01', updatedAt: '2026-01-01T00:00:00.000Z'});
    const raised = v(A, {commission: {rate: '0.1', maxRate: '0.2', maxChangeRate: '0.01', updatedAt: '2026-10-18T09:00:00.000Z'}});
    const [h] = healthOf('zig-test-2', [raised], [A], base, NOW);
    expect(h!.alerts).toEqual([{kind: 'commission-changed', severity: 'medium', text: 'Commission changed from 5% to 10% on 2026-10-18, since this device last looked on 2026-10-01. It may change at most once a day, by at most 1%, and never above 20%.'}]);
    // "Got it": the current commission becomes the baseline and the alert clears.
    expect(healthOf('zig-test-2', [raised], [A], withAcknowledged(base, 'zig-test-2', raised, new Date(NOW)), NOW)[0]!.alerts).toEqual([]);
    // A change in the last 14 days is said as information, before and after the first baseline, until "Got it".
    expect(kinds(healthOf('zig-test-2', [raised], [A], {version: 1}, NOW)[0]!)).toEqual(['commission-recent']);
    const firstSight = withBaselines({version: 1}, 'zig-test-2', [raised], [A], new Date(NOW));
    expect(kinds(healthOf('zig-test-2', [raised], [A], firstSight, NOW)[0]!)).toEqual(['commission-recent']);
    expect(kinds(healthOf('zig-test-2', [raised], [A], withAcknowledged(firstSight, 'zig-test-2', raised, new Date(NOW)), NOW)[0]!)).toEqual([]);
    expect(kinds(healthOf('zig-test-2', [raised], [A], firstSight, NOW + 15 * 86_400_000)[0]!)).toEqual([]);
    // Baselines are per network: the same operator on the other network is not compared.
    expect(kinds(healthOf('zigchain-1', [raised], [A], base, NOW)[0]!)).toEqual(['commission-recent']);
  });
});
describe('zigoals:validator-alerts:v1', () => {
  test('baselines only for validators not yet seen, existing ones kept, at most 200 (oldest out), unknown fields kept', () => {
    const base = withBaselines({version: 1, future: 'kept'} as never, 'zig-test-2', [v(A), v(B)], [A], new Date(NOW));
    expect(Object.keys(base.seen!)).toEqual([baselineKey('zig-test-2', A)]);
    expect((base as Record<string, unknown>).future).toBe('kept');
    expect(withBaselines(base, 'zig-test-2', [v(A)], [A], new Date(NOW + 1))).toBe(base);
    let many: ReturnType<typeof withBaselines> = {version: 1};
    for (let i = 0; i < MAX_BASELINES + 5; i++) many = withBaselines(many, `chain-${i}`, [v(A)], [A], new Date(NOW));
    expect(Object.keys(many.seen!)).toHaveLength(MAX_BASELINES);
    expect(many.seen![baselineKey('chain-0', A)]).toBeUndefined();
  });
  test('the switch, the round trip, and a damaged record never overwritten', () => {
    const storage = new Memory();
    expect(alertsOff(readValidatorAlerts(storage).data)).toBe(false);
    updateValidatorAlerts(storage, r => withAlertsOff(r, true));
    expect(JSON.parse(storage.getItem(VALIDATOR_ALERTS.key)!)).toEqual({version: 1, off: true});
    expect(alertsOff(readValidatorAlerts(storage).data)).toBe(true);
    storage.setItem(VALIDATOR_ALERTS.key, '{"version":2}');
    expect(readValidatorAlerts(storage).unreadable).toBe(true);
    expect(() => updateValidatorAlerts(storage, r => withAlertsOff(r, false))).toThrow('could not be read');
    expect(storage.getItem(VALIDATOR_ALERTS.key)).toBe('{"version":2}');
  });
});
