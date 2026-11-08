import {canonicalAddress, isEvmAddress, isZigAddress, verifyAddress, type AddressKind} from '../wallet-address';
import {chainsFor} from './balances/chains';

/**
 * Session AL Part 15 (AL-COMPETITOR-GAP-023, C-TK-09): "look up an address" without an account or a wallet app, as CoinStats
 * and Zerion let anyone paste one. A public address is recognised here on this device by its own shape (the same checks the
 * wallet menu runs, lib/wallet-address.ts), on the chains ZIGoals already reads and nowhere else: ZIGChain (and Cosmos Hub,
 * the same key), the six EVM chains, Solana and Bitcoin. A name such as "vitalik.eth" is not resolved: that needs a name
 * service ZIGoals does not ask. Once recognised, the address is linked read-only (`via: 'typed'`, the stored format the
 * typed Bitcoin address already uses), and Wealth's "What you have" reads its balances through the existing readers.
 * Nothing is signed or sent; the address never becomes the app's wallet.
 */
export type LookupKind = {kind: AddressKind; label: string; chains: string};
const WORDS: Record<AddressKind, {label: string}> = {cosmos: {label: 'ZIGChain address'}, evm: {label: 'EVM address'}, solana: {label: 'Solana address'}, btc: {label: 'Bitcoin address'}};

/** The chains this kind of address is read on, as words ("ZIGChain and Cosmos Hub"). */
export function chainWords(kind: AddressKind, address: string): string {
  const names = chainsFor({kind, address}).map(c => c.name);
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** What a pasted address is, or a plain reason it is not one ZIGoals can read. Never sends anything. */
export async function recogniseAddress(text: string): Promise<({ok: true; address: string} & LookupKind) | {ok: false; reason: string}> {
  const typed = text.trim();
  if (!typed) return {ok: false, reason: 'Paste a public address first. Nothing was read or saved.'};
  if (/\.(eth|sol|base|bnb|zig)$/i.test(typed)) return {ok: false, reason: 'Names such as vitalik.eth are not looked up: that needs a name service ZIGoals does not use. Paste the address itself. Nothing was read or saved.'};
  if (/^(zigvaloper1|zigvalcons1)/i.test(typed)) return {ok: false, reason: 'That is a validator’s operator address, not a wallet. Look it up on Staking. Nothing was read or saved.'};
  const kind: AddressKind | null = /^zig1/i.test(typed) ? 'cosmos' : /^0x/i.test(typed) ? 'evm' : /^(bc1|[13])/i.test(typed) && await verifyAddress('btc', typed) ? 'btc' : await verifyAddress('solana', typed) ? 'solana' : null;
  if (kind === 'cosmos' && !isZigAddress(typed.toLowerCase())) return {ok: false, reason: 'That starts like a ZIGChain address but its checksum does not match: a character is missing or mistyped. Nothing was read or saved.'};
  if (kind === 'evm' && !isEvmAddress(typed)) return {ok: false, reason: 'An EVM address is 0x and 40 letters or digits (0–9, a–f). Nothing was read or saved.'};
  if (!kind) return {ok: false, reason: 'ZIGoals does not recognise this as a ZIGChain, EVM, Solana or Bitcoin address. Testnet addresses are not read. Nothing was read or saved.'};
  const address = canonicalAddress(kind, typed);
  if (!await verifyAddress(kind, address)) return {ok: false, reason: 'That address does not pass its own check. Nothing was read or saved.'};
  return {ok: true, address, kind, label: WORDS[kind].label, chains: chainWords(kind, address)};
}
