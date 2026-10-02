import {z} from 'zod';

/**
 * The encrypted-sync offer (Session L): which card, if any, Settings shows right after sign-in. Creating or unlocking
 * the vault is what turns sync on (components/vault-sync-controls.tsx); the offer only explains it and hands over to
 * those existing controls. It never appears before sign-in, in Showcase, or where accounts are unavailable.
 */

/**
 * Device-only flag: "Not now" was chosen for the offer on this device. `{version:1, later:true}`, written only by that
 * tap, never on view. It names no account, is never synced and is in no backup. Older builds ignore it.
 */
export const SYNC_OFFER_KEY = 'zigoals:sync-offer:v1';
const flagSchema = z.object({version: z.literal(1), later: z.literal(true)}).strict();
export type SyncOfferFlag = z.infer<typeof flagSchema>;

/**
 * What this device holds for the flag. Present but not a valid version-1 flag (damaged, or written by a newer build)
 * counts as answered: the calm reminder shows instead of the full card, and the stored value is never rewritten.
 * Unreadable storage counts as unanswered (nothing could have been saved there).
 */
export function readSyncOffer(storage: Pick<Storage, 'getItem'> | null | undefined): 'unanswered' | 'later' | 'unreadable' {
  let raw: string | null;
  try { if (!storage) return 'unanswered'; raw = storage.getItem(SYNC_OFFER_KEY); } catch { return 'unanswered'; }
  if (raw === null) return 'unanswered';
  try { return flagSchema.safeParse(JSON.parse(raw)).success ? 'later' : 'unreadable'; } catch { return 'unreadable'; }
}

/** Records "Not now". Returns false when storage refused the write (the full card may then return on a later visit). */
export function markSyncOfferLater(storage: Pick<Storage, 'setItem'> | null | undefined): boolean {
  try { storage?.setItem(SYNC_OFFER_KEY, JSON.stringify({version: 1, later: true} satisfies SyncOfferFlag)); return !!storage; } catch { return false; }
}

/** Whether this browser already holds records of this account (its namespaced keys). Read only; errors count as no. */
export function deviceHoldsAccount(storage: Pick<Storage, 'length' | 'key'> | null | undefined, account: string): boolean {
  try {
    if (!storage) return false;
    const prefix = `zigoals:account:v1:${account}:`;
    for (let i = 0; i < storage.length; i++) if (storage.key(i)?.startsWith(prefix)) return true;
    return false;
  } catch { return false; }
}

export type SyncOfferInput = {
  /** The signed-in account, or null (signed out, still checking, or accounts unavailable). */
  account: string | null;
  /** The account's vault manifest: undefined while loading, null when the account has no vault yet. */
  manifest: unknown;
  /** The vault is unlocked on this tab: sync is on here. */
  opened: boolean;
  /** A new vault's recovery secret is being shown by the existing controls. */
  preparing: boolean;
  /** "Turn on" was pressed on this card in this tab. */
  startedHere: boolean;
  /** "Not now" was chosen on this device (or its flag is unreadable). */
  later: boolean;
  /** This browser already holds this account's records: a returning device, where the usual unlock form is enough. */
  deviceKnown: boolean;
  showcase: boolean;
};
export type SyncOfferState = 'hidden' | 'offer-new' | 'offer-device' | 'next-step' | 'reminder-new' | 'reminder-device';

export function syncOfferState(input: SyncOfferInput): SyncOfferState {
  if (input.showcase || !input.account || input.opened || input.manifest === undefined) return 'hidden';
  if (input.preparing) return input.startedHere ? 'next-step' : 'hidden';
  if (input.manifest === null) return input.later ? 'reminder-new' : 'offer-new';
  if (input.deviceKnown) return 'hidden';
  return input.later ? 'reminder-device' : 'offer-device';
}
