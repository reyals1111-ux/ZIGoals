import {allocationBalance, type Platform} from '../positions';

/**
 * Session AL (TK-226, P-TK-60): Today's over-allocation notice can be dismissed for this tab. The dismissal is kept in
 * sessionStorage as the deficits it was dismissed for (each source's id, quantity and deficit), so the notice comes back
 * when a deficit changes, a new one appears, or a new tab opens. A display mark only; nothing in the records changes.
 */
export const INTEGRITY_DISMISS_KEY = 'zigoals:integrity-dismissed:v1';

/** The over-allocated sources as one stable string; '' when nothing is over-allocated. */
export function deficitSignature(data: Platform): string {
  return data.positions.flatMap(p => {
    let deficit: string;
    try { deficit = allocationBalance(data, p.id).deficit; } catch { return []; }
    return deficit === '0' ? [] : [`${p.id}:${p.quantity}:${deficit}`];
  }).sort().join('|');
}

/** True when this tab dismissed the notice for exactly these deficits. An unreadable store reads as not dismissed. */
export function integrityDismissed(store: Pick<Storage, 'getItem'> | null | undefined, signature: string): boolean {
  if (!signature || !store) return false;
  try { return store.getItem(INTEGRITY_DISMISS_KEY) === signature; } catch { return false; }
}

/** Remembers the dismissal for these deficits; false when the store refused (the notice still hides until reload). */
export function dismissIntegrity(store: Pick<Storage, 'setItem'> | null | undefined, signature: string): boolean {
  if (!store) return false;
  try { store.setItem(INTEGRITY_DISMISS_KEY, signature); return true; } catch { return false; }
}
