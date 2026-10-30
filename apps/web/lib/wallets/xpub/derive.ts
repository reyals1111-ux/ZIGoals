import {HDKey} from '@scure/bip32';
import {base58check, hash160, segwitV0Address} from './encode';

/**
 * Session AJ (item 36; owner decision D2b, amendment A5): a Bitcoin extended PUBLIC key (xpub, ypub or zpub, account
 * level) watched on this device. Its receive (0) and change (1) addresses are worked out here with @scure/bip32; a
 * private key (xprv, yprv, zprv, tprv…) is refused before it is read, and a key whose bytes hold a private part is
 * refused too. The kind sets the address type: xpub → legacy (1…), ypub → wrapped SegWit (3…), zpub → native SegWit
 * (bc1q…). The derived addresses go nowhere except mempool.space's balance reads (lib/wallets/xpub/scan.ts).
 */
export const XPUB_KINDS = ['xpub', 'ypub', 'zpub'] as const;
export type XpubKind = (typeof XPUB_KINDS)[number];
const VERSIONS: Record<XpubKind, {public: number; private: number}> = {
  xpub: {public: 0x0488b21e, private: 0x0488ade4},
  ypub: {public: 0x049d7cb2, private: 0x049d7878},
  zpub: {public: 0x04b24746, private: 0x04b2430c},
};
export const KIND_LABEL: Record<XpubKind, string> = {xpub: 'Legacy (1…)', ypub: 'Wrapped SegWit (3…)', zpub: 'Native SegWit (bc1q…)'};
export class XpubError extends Error {}
export type Watched = {kind: XpubKind; key: HDKey};

export function parseExtendedKey(text: string): Watched {
  const value = text.trim();
  if (/^[a-z]prv/i.test(value) || /^[tuv]pub/.test(value)) throw new XpubError(/^[a-z]prv/i.test(value) ? 'That is a private key. Never paste a private key anywhere: ZIGoals only needs the public one (xpub, ypub or zpub).' : 'That is a testnet key; ZIGoals watches Bitcoin mainnet keys only.');
  const kind = XPUB_KINDS.find(k => value.startsWith(k));
  if (!kind || !/^[1-9A-HJ-NP-Za-km-z]{100,120}$/.test(value)) throw new XpubError('Paste an extended public key starting with xpub, ypub or zpub.');
  let key: HDKey;
  try { key = HDKey.fromExtendedKey(value, VERSIONS[kind]); } catch { throw new XpubError('That key could not be read; check that it was copied whole.'); }
  if (key.privateKey || !key.publicKey) throw new XpubError('That key holds a private part; ZIGoals only watches public keys.');
  return {kind, key};
}

/** The address at chain (0 receive, 1 change) and index. */
export async function addressAt(watched: Watched, chain: 0 | 1, index: number, branch = watched.key.deriveChild(chain)): Promise<string> {
  const child = branch.deriveChild(index), id = child.identifier;
  if (!id) throw new XpubError('That key could not be read.');
  if (watched.kind === 'xpub') return base58check(0x00, id);
  if (watched.kind === 'ypub') return base58check(0x05, await hash160(Uint8Array.from([0x00, 0x14, ...id])));
  return segwitV0Address('bc', id);
}

/** A short, non-secret way to name a key on the page: its kind and the last 6 characters of its fingerprint. */
export function keyLabel(watched: Watched): string { return `${watched.kind} …${watched.key.fingerprint.toString(16).padStart(8, '0').slice(-6)}`; }
