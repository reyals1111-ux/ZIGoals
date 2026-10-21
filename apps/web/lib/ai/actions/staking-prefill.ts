import {STAKING_PREFILL_EVENT, STAKING_PREFILL_KEY} from '../../af-signing-keys';

/**
 * ZIGi's staking pre-fill (Session AF, L4; ADR-028 D7, H47; `TIER 3 (wallet/signing)`). A confirmed `prefill-staking` card
 * writes the plain fields to the tab's sessionStorage `zigoals:ai:staking-prefill:v1` and opens the Staking page; the
 * staking form (lane L2a, lib/staking/prefill.ts) reads it once, deletes it, and fills the form only when the fields are
 * well formed and at most 10 minutes old. Nothing here reviews, signs, sends or broadcasts: the person presses Review on
 * the Staking page, then Sign in their own wallet. This module imports no wallet, signer or staking-pipeline code (the
 * ZIGi guard, lib/ai/zigi-guard.test.ts, and L2a's staking guard both check it); it shares only the key's name.
 */
export const STAKING_PREFILL_ROUTE = '/app/staking#staking-actions-title';
/** Dispatched on window after a stash, for a staking form already open in this tab (the form listens and reads it once). */
export {STAKING_PREFILL_EVENT};
export type StakingPrefillValues = {network: 'practice' | 'real'; action: 'delegate' | 'undelegate' | 'redelegate' | 'claim'; validator?: string; amount?: string};
/** The form's own checks (lib/staking/prefill.ts), so a value it would drop is never written. */
export const VALOPER = /^zigvaloper1[02-9ac-hj-np-z]{38,58}$/;
export const AMOUNT = /^\d{1,24}(\.\d{1,18})?$/;
/** An amount as the form reads it: a plain decimal string in ZIG, never in exponent form; null when it is not one above zero. */
export function amountText(value: number | string | undefined): string | null {
  if (value === undefined) return null;
  const text = typeof value === 'number' ? (Number.isFinite(value) && value > 0 ? value.toLocaleString('en-US', {useGrouping: false, maximumFractionDigits: 18}) : '') : value.trim();
  return AMOUNT.test(text) && !/^0+(\.0+)?$/.test(text) ? text : null;
}
/** The exact bytes the form reads: {version: 1, at, network, action, validator?, amount?}. */
export function stakingPrefillRecord(values: StakingPrefillValues, now = new Date()): string {
  const record: Record<string, unknown> = {version: 1, at: now.toISOString(), network: values.network, action: values.action};
  if (values.validator && VALOPER.test(values.validator)) record.validator = values.validator;
  const amount = values.action === 'claim' ? null : amountText(values.amount);
  if (amount) record.amount = amount;
  return JSON.stringify(record);
}
type Session = Pick<Storage, 'setItem'>;
const tabSession = (): Session | null => { try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; } };
/** Stashes the values for the staking form; false when the tab's storage refuses (the card then says to type them in). */
export function stashStakingPrefill(values: StakingPrefillValues, storage: Session | null = tabSession(), now = new Date()): boolean {
  if (!storage) return false;
  try { storage.setItem(STAKING_PREFILL_KEY, stakingPrefillRecord(values, now)); } catch { return false; }
  try { window.dispatchEvent(new CustomEvent(STAKING_PREFILL_EVENT)); } catch { /* no window: a test */ }
  return true;
}
