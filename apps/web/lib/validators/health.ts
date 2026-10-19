import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from '../device-record';
import {VALIDATOR_ALERTS_KEY} from '../af-signing-keys';
import type {WireValidator} from '../chain/validators-wire';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 P6.7, rank 3; `TIER 3 (storage)` for the record): the health of the validators a
 * person delegates to, in plain words, in the app only (no notification leaves it). From the validators route's facts
 * (GET /api/chain/validators: jailed, tombstoned, status, commission rate / max change / update time, missed blocks in
 * the chain's signing window) and a baseline kept on this device the first time each validator is seen, so a later
 * commission change is noticed. The chain jails a validator that signs fewer than 80 % of the last 35,000 blocks
 * (slashing params `min_signed_per_window` 0.8 and `signed_blocks_window` 35000, read live on both networks on 2026-10-18;
 * the window itself comes live with each answer).
 *
 * `zigoals:validator-alerts:v1` = `{version: 1, off?: boolean, seen?: {[`${chainId} ${operator}`]: {at, rate, maxRate,
 * maxChangeRate, updatedAt, ack?}}}` (at most 200 baselines, the oldest dropped first; `ack` is the commission update time
 * the person pressed "Got it" on). Loose and versioned: unknown fields of
 * the record and of each baseline are kept through every write; a record that cannot be read is never overwritten.
 * Personal (it shows which validators the person stakes with), device-only, in Export, erased, never synced or restored.
 */
export {VALIDATOR_ALERTS_KEY};
export const MIN_SIGNED_PER_WINDOW = '0.8';
/** The same rule in basis points, for exact integer arithmetic (the SDK truncates window × 0.8 to a whole block). */
const MIN_SIGNED_BASIS = 8000;
export const MAX_BASELINES = 200;
/** A commission change this recent is said even without an older baseline on this device. */
export const RECENT_CHANGE_DAYS = 14;
const text = (max: number) => z.string().max(max).optional();
const baselineSchema = z.looseObject({at: text(40), rate: text(40), maxRate: text(40), maxChangeRate: text(40), updatedAt: text(40), ack: text(40)});
export const validatorAlertsSchema = z.looseObject({version: z.literal(1), off: z.boolean().optional(), seen: z.record(z.string().max(160), baselineSchema).optional()});
export type ValidatorAlerts = z.infer<typeof validatorAlertsSchema>;
export const emptyValidatorAlerts = (): ValidatorAlerts => ({version: 1});
export const VALIDATOR_ALERTS: DeviceRecordSpec<ValidatorAlerts> = {key: VALIDATOR_ALERTS_KEY, schema: validatorAlertsSchema, empty: emptyValidatorAlerts};
export const alertsOff = (record: ValidatorAlerts) => record.off === true;
export const baselineKey = (chainId: string, operator: string) => `${chainId} ${operator}`;

export type HealthAlert = {kind: 'tombstoned' | 'jailed' | 'inactive' | 'missing-blocks' | 'commission-changed' | 'commission-recent'; severity: 'high' | 'medium' | 'info'; text: string};
export type ValidatorHealth = {operator: string; name: string; found: boolean; alerts: HealthAlert[]; missed?: {count: number; window: number; allowed: number}; commission?: WireValidator['commission']};
const pct = (unit: string) => { const [w = '0', f = ''] = unit.split('.'); const basis = BigInt(w) * 10000n + BigInt((f + '0000').slice(0, 4)); const i = basis / 100n, r = basis % 100n; return `${i}${r ? `.${r.toString().padStart(2, '0').replace(/0$/, '')}` : ''}%`; };
const day = (iso: string) => iso.slice(0, 10);
/** The alerts for each validator the person delegates to (in the order given), from the chain's facts and the baselines. */
export function healthOf(chainId: string, validators: readonly WireValidator[], operators: readonly string[], record: ValidatorAlerts, now = Date.now()): ValidatorHealth[] {
  const byOperator = new Map(validators.map(v => [v.operator, v]));
  return [...new Set(operators)].map(operator => {
    const v = byOperator.get(operator);
    if (!v) return {operator, name: operator, found: false, alerts: [{kind: 'inactive', severity: 'medium', text: 'This validator is not in the chain\'s validator list just now, so its health could not be read.'}]};
    const alerts: HealthAlert[] = [];
    if (v.tombstoned) alerts.push({kind: 'tombstoned', severity: 'high', text: 'Tombstoned: removed for good for signing twice. It will never earn again. Move your stake to another validator; moving is instant.'});
    else if (v.jailed) alerts.push({kind: 'jailed', severity: 'high', text: 'Jailed: it stopped signing blocks and earns nothing for you while jailed. Your stake is not lost; you can move it to another validator at once.'});
    else if (v.status !== 'bonded') alerts.push({kind: 'inactive', severity: 'medium', text: 'Not in the active set: it earns nothing for you until it is back. You can move your stake at once.'});
    let missed: ValidatorHealth['missed'];
    if (v.uptime) {
      const allowed = v.uptime.window - Math.floor((v.uptime.window * MIN_SIGNED_BASIS) / 10000);
      missed = {count: v.uptime.missed, window: v.uptime.window, allowed};
      if (!v.jailed && !v.tombstoned && v.uptime.missed * 2 >= allowed)
        alerts.push({kind: 'missing-blocks', severity: 'medium', text: `Missing blocks: ${v.uptime.missed.toLocaleString('en')} of the last ${v.uptime.window.toLocaleString('en')}. The chain jails a validator that misses more than ${allowed.toLocaleString('en')} of them.`});
    }
    const base = record.seen?.[baselineKey(chainId, operator)];
    const changed = base && (base.rate !== v.commission.rate || base.maxRate !== v.commission.maxRate || base.maxChangeRate !== v.commission.maxChangeRate || base.updatedAt !== v.commission.updatedAt);
    if (changed) alerts.push({kind: 'commission-changed', severity: 'medium', text: `Commission changed${base.rate && base.rate !== v.commission.rate ? ` from ${pct(base.rate)} to ${pct(v.commission.rate)}` : ` (now ${pct(v.commission.rate)})`} on ${day(v.commission.updatedAt)}, since this device last looked on ${day(base.at ?? v.commission.updatedAt)}. It may change at most once a day, by at most ${pct(v.commission.maxChangeRate)}, and never above ${pct(v.commission.maxRate)}.`});
    else if (base?.ack !== v.commission.updatedAt && now - Date.parse(v.commission.updatedAt) < RECENT_CHANGE_DAYS * 86_400_000)
      alerts.push({kind: 'commission-recent', severity: 'info', text: `Commission set to ${pct(v.commission.rate)} recently, on ${day(v.commission.updatedAt)}. It may change at most once a day, by at most ${pct(v.commission.maxChangeRate)}, and never above ${pct(v.commission.maxRate)}.`});
    return {operator, name: v.moniker || operator, found: true, alerts, ...(missed ? {missed} : {}), commission: v.commission};
  });
}
/** Baselines for validators not yet seen on this device (existing ones untouched); at most 200, oldest first out. */
export function withBaselines(record: ValidatorAlerts, chainId: string, validators: readonly WireValidator[], operators: readonly string[], now = new Date()): ValidatorAlerts {
  const seen = {...record.seen};
  let changed = false;
  for (const operator of new Set(operators)) {
    const v = validators.find(x => x.operator === operator), key = baselineKey(chainId, operator);
    if (!v || seen[key]) continue;
    seen[key] = {at: now.toISOString(), rate: v.commission.rate, maxRate: v.commission.maxRate, maxChangeRate: v.commission.maxChangeRate, updatedAt: v.commission.updatedAt};
    changed = true;
  }
  if (!changed) return record;
  const keys = Object.keys(seen);
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_BASELINES))) delete seen[key];
  return {...record, seen};
}
/** "Got it": the validator's current commission becomes its baseline and is acknowledged, so the change note clears. */
export function withAcknowledged(record: ValidatorAlerts, chainId: string, validator: WireValidator, now = new Date()): ValidatorAlerts {
  return {...record, seen: {...record.seen, [baselineKey(chainId, validator.operator)]: {...record.seen?.[baselineKey(chainId, validator.operator)], at: now.toISOString(), rate: validator.commission.rate, maxRate: validator.commission.maxRate, maxChangeRate: validator.commission.maxChangeRate, updatedAt: validator.commission.updatedAt, ack: validator.commission.updatedAt}}};
}
export const withAlertsOff = (record: ValidatorAlerts, off: boolean): ValidatorAlerts => ({...record, off});
type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
export const readValidatorAlerts = (storage: Read) => readDeviceRecord(storage, VALIDATOR_ALERTS);
export function updateValidatorAlerts(storage: ReadWrite, change: (record: ValidatorAlerts) => ValidatorAlerts): ValidatorAlerts {
  if (readValidatorAlerts(storage).unreadable) throw Error('Your validator alerts could not be read on this device, so nothing was changed.');
  return updateDeviceRecord(storage, VALIDATOR_ALERTS, change);
}
