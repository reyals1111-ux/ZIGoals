import {STAKING_PREFILL_KEY} from '../af-signing-keys';
import {isValoper} from './address';

/**
 * Session AF (ADR-028 H47; L2 design §11): ZIGi's staking pre-fill, read once. ZIGi's lane writes sessionStorage
 * `zigoals:ai:staking-prefill:v1` `{version: 1, at, network, action, validator?, amount?}`; the staking form takes it on
 * opening, deletes it whatever it holds, and fills the form with the plain fields only when they are well formed and at
 * most 10 minutes old. It never reviews, signs or submits anything: the person still presses Review, then Sign.
 */
export const PREFILL_MAX_AGE_MS = 10 * 60_000;
export type StakingPrefill = {network: 'practice' | 'real'; action: 'delegate' | 'undelegate' | 'redelegate' | 'claim'; validator?: string; amount?: string};
type Session = Pick<Storage, 'getItem' | 'removeItem'>;
export function takeStakingPrefill(storage: Session | null, now = Date.now()): StakingPrefill | null {
  let raw: string | null = null;
  try { raw = storage?.getItem(STAKING_PREFILL_KEY) ?? null; } catch { return null; }
  try { storage?.removeItem(STAKING_PREFILL_KEY); } catch { /* read once even when the delete is refused: the form never asks again this page */ }
  if (raw === null || raw.length > 2000) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    if (!value || value.version !== 1 || typeof value.at !== 'string') return null;
    const at = Date.parse(value.at);
    if (Number.isNaN(at) || at > now + 60_000 || now - at > PREFILL_MAX_AGE_MS) return null;
    if (value.network !== 'practice' && value.network !== 'real') return null;
    if (!['delegate', 'undelegate', 'redelegate', 'claim'].includes(value.action as string)) return null;
    const prefill: StakingPrefill = {network: value.network, action: value.action as StakingPrefill['action']};
    if (isValoper(value.validator)) prefill.validator = value.validator;
    if (typeof value.amount === 'string' && /^\d{1,24}(\.\d{1,18})?$/.test(value.amount) && !/^0+(\.0+)?$/.test(value.amount)) prefill.amount = value.amount;
    return prefill;
  } catch { return null; }
}
