import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from './device-record';
import {LINKED_WALLETS_KEY} from './linked-wallets-key';
import {addressShapeOk, canonicalAddress, verifyAddress, type AddressKind} from './wallet-address';

/**
 * Session AE (Part 6, ADR-027; `TIER 3 (storage)`): the wallets a person linked read-only on this device, and how Today's
 * wallet card shows them. `{version: 1, wallets?: [{id, kind, wallet, label, address, addedAt}], selected?, display?}`.
 * - **Device-only and personal:** public addresses say who someone is, so the key counts as a personal device record (a
 *   device holding it is not new), goes into Export everything, is removed by the account's erase and by "Remove", and
 *   no sync section, restore or Showcase writes it (the Showcase keeps its simulated wallet).
 * - **Loose and versioned:** every field is optional and unknown fields are kept; a kind or a display currency this build
 *   does not know is kept on write and left out of what it shows, so a newer build's record stays readable here. Older
 *   builds never read the key.
 * - **Checked on write:** at most 12 wallets; an entry this build writes passes its address checks (lib/wallet-address.ts),
 *   a Bitcoin base58 address with its checksum; a record that cannot be read is never overwritten.
 * Session AF (L2b, ADR-028 H16, L2 design §6; `TIER 3 (storage)`): additive only, still `v1`. The kind `'solana'` (a
 * Solana address from a Wallet Standard wallet) and two optional fields per entry: `chains` (the chains this address is
 * tracked on, e.g. a subset of the six EVM chains; absent = the kind's default) and `via` (how it was linked:
 * 'extension', 'in-app-browser', 'walletconnect' or 'typed'). AE's build (#44) keeps both fields on write and hides the
 * new kind (lib/wallets/frozen-readers.test.ts runs AE's own modules on this build's record).
 */
export {LINKED_WALLETS_KEY};
export const MAX_LINKED_WALLETS = 12;
export const MAX_WALLET_LABEL = 40;
export const WALLET_KINDS: readonly AddressKind[] = ['cosmos', 'evm', 'btc', 'solana'];
export const WALLET_VIAS = ['extension', 'in-app-browser', 'walletconnect', 'typed'] as const;
export type WalletVia = typeof WALLET_VIAS[number];
export const MAX_TRACKED_CHAINS = 16;
export const DISPLAY_CURRENCIES = ['ZIG', 'USD', 'EUR', 'BTC'] as const;
export type DisplayCurrency = typeof DISPLAY_CURRENCIES[number];

const entrySchema = z.looseObject({
  id: z.string().max(64).optional(),
  /** 'cosmos' (a ZIGChain address from a Cosmos wallet), 'evm' (an EIP-6963 wallet's account) or 'btc' (watch-only). */
  kind: z.string().max(24).optional(),
  /** Which wallet: 'leap', 'cosmostation', an EIP-6963 rdns such as 'io.metamask', or 'bitcoin-watch'. */
  wallet: z.string().max(120).optional(),
  label: z.string().max(80).optional(),
  address: z.string().max(120).optional(),
  addedAt: z.string().max(40).optional(),
  /** Session AF: the chains tracked for this address (CAIP-2 style ids such as 'eip155:8453'); absent = the kind's default. */
  chains: z.array(z.string().max(40)).max(MAX_TRACKED_CHAINS).optional(),
  /** Session AF: how it was linked; a value this build does not know is kept and ignored. */
  via: z.string().max(24).optional(),
});
export const linkedWalletsSchema = z.looseObject({
  version: z.literal(1),
  wallets: z.array(entrySchema).max(MAX_LINKED_WALLETS).optional(),
  /** The wallet Today's card shows: 'app' (the app's own wallet, the default) or a linked wallet's id. */
  selected: z.string().max(64).optional(),
  /** The card's display currency: 'ZIG' (the default), 'USD', 'EUR' or 'BTC'. */
  display: z.string().max(8).optional(),
});
export type LinkedWallets = z.infer<typeof linkedWalletsSchema>;
export type LinkedWallet = {id: string; kind: AddressKind; wallet: string; label: string; address: string; addedAt: string; chains?: string[]; via?: WalletVia};
export const emptyLinkedWallets = (): LinkedWallets => ({version: 1});
export const LINKED_WALLETS: DeviceRecordSpec<LinkedWallets> = {key: LINKED_WALLETS_KEY, schema: linkedWalletsSchema, empty: emptyLinkedWallets};

export class LinkedWalletError extends Error {}
export const LINK_LIMIT_MESSAGE = `At most ${MAX_LINKED_WALLETS} wallets can be linked on this device. Remove one first.`;
export const LINK_DUPLICATE_MESSAGE = 'That address is already linked on this device.';
export const LINK_INVALID_MESSAGE = 'That address did not pass its checks, so nothing was linked.';
export const LINK_UNREADABLE_MESSAGE = 'Your linked wallets could not be read on this device, so nothing was changed.';

const isKind = (kind: unknown): kind is AddressKind => WALLET_KINDS.includes(kind as AddressKind);
type Entry = z.infer<typeof entrySchema>;
function complete(e: Entry): e is Entry & LinkedWallet {
  return typeof e.id === 'string' && e.id.length > 0 && isKind(e.kind) && typeof e.wallet === 'string' && e.wallet.length > 0 && typeof e.label === 'string'
    && typeof e.address === 'string' && typeof e.addedAt === 'string' && !Number.isNaN(Date.parse(e.addedAt)) && addressShapeOk(e.kind, e.address);
}
const CHAIN_ID = /^[a-z0-9-]{2,16}:[A-Za-z0-9_-]{1,32}$/;
/** The two Session AF fields as this build shows them: known `via` values only, well-formed chain ids, each once. */
function optionalOf(e: Entry): Pick<LinkedWallet, 'chains' | 'via'> {
  const chains = Array.isArray(e.chains) ? [...new Set(e.chains.filter(c => CHAIN_ID.test(c)))] : undefined;
  return {...(chains ? {chains} : {}), ...((WALLET_VIAS as readonly string[]).includes(e.via ?? '') ? {via: e.via as WalletVia} : {})};
}
/** The linked wallets this build can show: complete, of a known kind, well formed, each id once. */
export function linkedWalletsOf(record: LinkedWallets): LinkedWallet[] {
  const seen = new Set<string>();
  return (record.wallets ?? []).filter(complete).filter(e => !seen.has(e.id) && !!seen.add(e.id))
    .map(e => ({id: e.id, kind: e.kind, wallet: e.wallet, label: e.label.slice(0, MAX_WALLET_LABEL), address: e.address, addedAt: e.addedAt, ...optionalOf(e)}));
}
export const displayOf = (record: LinkedWallets): DisplayCurrency => (DISPLAY_CURRENCIES as readonly string[]).includes(record.display ?? '') ? record.display as DisplayCurrency : 'ZIG';
/** 'app' unless the record names a linked wallet this build shows. */
export const selectedOf = (record: LinkedWallets): string => record.selected && record.selected !== 'app' && linkedWalletsOf(record).some(w => w.id === record.selected) ? record.selected : 'app';

const sameAddress = (a: LinkedWallet, kind: AddressKind, address: string) => a.kind === kind && (kind === 'evm' ? a.address.toLowerCase() === address.toLowerCase() : a.address === address);
/** A new entry from what a wallet or the person gave: the label trimmed to 40 characters, the address in its stored spelling. */
export type LinkInput = {kind: AddressKind; wallet: string; label: string; address: string; chains?: readonly string[]; via?: WalletVia};
export function newLinkedWallet(input: LinkInput, now = new Date(), id: string = crypto.randomUUID()): LinkedWallet {
  const chains = input.chains ? [...new Set(input.chains)].filter(c => CHAIN_ID.test(c)).slice(0, MAX_TRACKED_CHAINS) : undefined;
  return {id, kind: input.kind, wallet: input.wallet.slice(0, 120), label: input.label.trim().slice(0, MAX_WALLET_LABEL) || input.wallet.slice(0, MAX_WALLET_LABEL), address: canonicalAddress(input.kind, input.address.trim()), addedAt: now.toISOString(),
    ...(chains?.length ? {chains} : {}), ...(input.via && (WALLET_VIAS as readonly string[]).includes(input.via) ? {via: input.via} : {})};
}
/** Session AF: a wallet's tracked chains changed (Wealth's chain chips); the other fields stay as stored. */
export function withChains(record: LinkedWallets, id: string, chains: readonly string[]): LinkedWallets {
  if (!linkedWalletsOf(record).some(w => w.id === id)) throw new LinkedWalletError('That wallet is no longer linked on this device.');
  const clean = [...new Set(chains)].filter(c => CHAIN_ID.test(c)).slice(0, MAX_TRACKED_CHAINS);
  return {...record, wallets: (record.wallets ?? []).map(e => e.id === id ? {...e, chains: clean} : e)};
}
export function withWallet(record: LinkedWallets, entry: LinkedWallet): LinkedWallets {
  if (!complete(entry)) throw new LinkedWalletError(LINK_INVALID_MESSAGE);
  if (linkedWalletsOf(record).some(w => sameAddress(w, entry.kind, entry.address))) throw new LinkedWalletError(LINK_DUPLICATE_MESSAGE);
  const wallets = record.wallets ?? [];
  if (wallets.length >= MAX_LINKED_WALLETS) throw new LinkedWalletError(LINK_LIMIT_MESSAGE);
  return {...record, wallets: [...wallets, entry]};
}
/** Removes one linked wallet; the card goes back to the app's wallet if it was showing that one. */
export function withoutWallet(record: LinkedWallets, id: string): LinkedWallets {
  const {selected, ...rest} = record;
  return {...rest, wallets: (record.wallets ?? []).filter(e => e.id !== id), ...(selected !== undefined && selected !== id ? {selected} : {})};
}
export function withSelected(record: LinkedWallets, id: string): LinkedWallets {
  if (id !== 'app' && !linkedWalletsOf(record).some(w => w.id === id)) throw new LinkedWalletError('That wallet is no longer linked on this device.');
  return {...record, selected: id};
}
export const withDisplay = (record: LinkedWallets, display: DisplayCurrency): LinkedWallets => ({...record, display});

/**
 * The one write: refused while the stored record cannot be read (it is never replaced by an empty one), and every entry
 * that was not already stored must be complete and pass its address checks. Throws with nothing written.
 */
export function writeLinkedWallets(storage: Pick<Storage, 'getItem' | 'setItem'>, change: (current: LinkedWallets) => LinkedWallets): LinkedWallets {
  const current = readDeviceRecord(storage, LINKED_WALLETS);
  if (current.unreadable) throw new LinkedWalletError(LINK_UNREADABLE_MESSAGE);
  const stored = new Set((current.data.wallets ?? []).map(e => JSON.stringify(e)));
  return updateDeviceRecord(storage, LINKED_WALLETS, record => {
    const next = change(record);
    for (const e of next.wallets ?? []) if (!stored.has(JSON.stringify(e)) && !complete(e)) throw new LinkedWalletError(LINK_INVALID_MESSAGE);
    return next;
  });
}
/** Links one address after every check (a Bitcoin base58 checksum included); returns the stored entry. */
export async function linkWallet(storage: Pick<Storage, 'getItem' | 'setItem'>, input: LinkInput): Promise<LinkedWallet> {
  const entry = newLinkedWallet(input);
  if (!await verifyAddress(entry.kind, entry.address)) throw new LinkedWalletError(LINK_INVALID_MESSAGE);
  writeLinkedWallets(storage, record => withWallet(record, entry));
  return entry;
}
