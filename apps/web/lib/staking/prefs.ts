import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from '../device-record';
import {STAKING_PREFS_KEY} from '../af-signing-keys';
import {isValoper} from './address';

/**
 * Session AF (ADR-028 H46, L2 design §12; `TIER 3 (storage)`): the person's staking choices on this device.
 * `{version: 1, network?: 'practice' | 'real', realConfirmedAt?: ISO, lastValidator?: {[chainId]: zigvaloper}}`.
 * - **Fail safe:** a network value this build does not know reads as practice; a real network is only ever chosen by the
 *   person, and the first real-network action needs the explicit confirm (`realConfirmedAt`).
 * - **Loose and versioned:** every field optional, unknown fields kept through every write; a record that cannot be read
 *   is never overwritten (device-record.ts). Older builds never read the key.
 * - **Non-personal, device-only:** no address; in Export everything; never synced, never restored.
 */
export {STAKING_PREFS_KEY};
export type StakingNetworkChoice = 'practice' | 'real';
export const stakingPrefsSchema = z.looseObject({
  version: z.literal(1),
  network: z.string().max(16).optional(),
  realConfirmedAt: z.string().max(40).optional(),
  lastValidator: z.record(z.string().max(32), z.string().max(100)).optional(),
});
export type StakingPrefs = z.infer<typeof stakingPrefsSchema>;
export const emptyStakingPrefs = (): StakingPrefs => ({version: 1});
export const STAKING_PREFS: DeviceRecordSpec<StakingPrefs> = {key: STAKING_PREFS_KEY, schema: stakingPrefsSchema, empty: emptyStakingPrefs};

/** 'real' only when the record says exactly that; anything else (missing, unknown, damaged) is practice. */
export const networkChoiceOf = (prefs: StakingPrefs): StakingNetworkChoice => prefs.network === 'real' ? 'real' : 'practice';
/** The confirm time when it is a real date; otherwise none (the confirm is asked again). */
export const realConfirmedAtOf = (prefs: StakingPrefs): string | undefined =>
  typeof prefs.realConfirmedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(prefs.realConfirmedAt) && !Number.isNaN(Date.parse(prefs.realConfirmedAt)) ? prefs.realConfirmedAt : undefined;
export const lastValidatorOf = (prefs: StakingPrefs, chainId: string): string | undefined => {
  const value = prefs.lastValidator?.[chainId];
  return isValoper(value) ? value : undefined;
};
export const withNetworkChoice = (prefs: StakingPrefs, network: StakingNetworkChoice): StakingPrefs => ({...prefs, network});
export const withRealConfirmed = (prefs: StakingPrefs, now = new Date()): StakingPrefs => ({...prefs, realConfirmedAt: now.toISOString()});
/** Remove in Settings → Your data: the next real action asks again. */
export const withoutRealConfirm = (prefs: StakingPrefs): StakingPrefs => { const {realConfirmedAt: _drop, ...rest} = prefs; void _drop; return {...rest, version: 1}; };
export function withLastValidator(prefs: StakingPrefs, chainId: string, validator: string): StakingPrefs {
  if (!/^[a-z0-9-]{1,32}$/.test(chainId) || !isValoper(validator)) throw Error('Only a ZIGChain validator address can be remembered.');
  return {...prefs, lastValidator: {...prefs.lastValidator, [chainId]: validator}};
}
type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
export const readStakingPrefs = (storage: Read) => readDeviceRecord(storage, STAKING_PREFS);
export const updateStakingPrefs = (storage: ReadWrite, change: (prefs: StakingPrefs) => StakingPrefs) => {
  const current = readStakingPrefs(storage);
  if (current.unreadable) throw Error('Your staking choices could not be read on this device, so nothing was changed.');
  return updateDeviceRecord(storage, STAKING_PREFS, change);
};
