import {DECOY_DENOMS} from '@zigoals/chain-config/networks';

/**
 * Session AK (F4, IBC and token clarity; F10 "denom resolution (spoofed metadata, phishing names)"): what a ZIGChain
 * token really is, as pure functions. Identity comes only from the denom:
 * - an exact base-denom match with ZIGChain's curated token list (the Cosmos chain registry's `zigchain/assetlist.json`,
 *   generated from ZIGChain's own registry, read 31 Oct 2026; every IBC hash below recomputed from its path and matched,
 *   docs/research/session-ak/ZIGCHAIN_ECOSYSTEM.md §4), or
 * - an IBC trace from the network's own LCD whose SHA-256 of `path/base` equals the denom's hash (recomputed here, so a
 *   node or a relay cannot pass off another trace).
 * A name from bank metadata or a CW20 contract is written by whoever made the token: it is shown as "its own name", never
 * as the identity, and a name that reads like a known symbol under another denom is a look-alike. The denom (or the
 * contract address) is always shown in full.
 *
 * The LCD's trace answer has two shapes: ibc-go v10 `{denom: {base, trace: [{port_id, channel_id}]}}` — what both ZIGChain
 * networks answer today, on v5.1.2 and v6.0.0 alike — and the older `{denom_trace: {path, base_denom}}`; both are read.
 */
export const KNOWN_TOKENS_READ_ON = '2026-10-31';
export const KNOWN_TOKENS_SOURCE = 'ZIGChain’s token registry (the Cosmos chain registry’s ZIGChain asset list)';
export type KnownToken = {symbol: string; family: string; name: string; base: string; decimals: number; network: 'zigchain-1' | 'zig-test-2'; origin: string};
export const KNOWN_TOKENS: readonly KnownToken[] = Object.freeze([
  {symbol: 'ZIG', family: 'zig', name: 'ZIG', base: 'azig', decimals: 18, network: 'zigchain-1', origin: 'ZIGChain’s own coin'},
  {symbol: 'ZIG', family: 'zig', name: 'ZIG (test)', base: 'azig', decimals: 18, network: 'zig-test-2', origin: 'ZIGChain’s own coin on the practice network (no value)'},
  {symbol: 'ZIG.legacy', family: 'zig', name: 'ZIG, the old 6-decimal unit', base: 'uzig', decimals: 6, network: 'zigchain-1', origin: 'Before ZIGChain v5; kept only to back ZIG sent to other chains'},
  {symbol: 'stZIG', family: 'stzig', name: 'Valdora staked ZIG', base: 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig', decimals: 6, network: 'zigchain-1', origin: 'Valdora liquid staking'},
  {symbol: 'stZIG', family: 'stzig', name: 'Valdora staked ZIG (test)', base: 'coin.zig18dgnfnv0sxjn4r9wtfj2zhvfewy2tk69m9j5zlhy3xgmahcgf20s6anrnr.stzig', decimals: 6, network: 'zig-test-2', origin: 'Valdora liquid staking on the practice network'},
  {symbol: 'ATOM', family: 'atom', name: 'Cosmos Hub ATOM', base: 'ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0', decimals: 6, network: 'zigchain-1', origin: 'Cosmos Hub, over IBC (transfer/channel-4)'},
  {symbol: 'stATOM', family: 'statom', name: 'Stride staked ATOM', base: 'ibc/729AE368985B0F7B35648D17BA74A3D0A1C833FBAE8C3B49D75C6A2B578B9930', decimals: 6, network: 'zigchain-1', origin: 'Through the Cosmos Hub, over IBC (transfer/channel-4)'},
  {symbol: 'USDC.inj', family: 'usdc', name: 'USDC from Injective', base: 'ibc/6C6F5A015608CF3951DFE6A117390210AB825BF0CC1AD33B2B100B05529A9B6B', decimals: 6, network: 'zigchain-1', origin: 'Injective, over IBC (transfer/channel-12)'},
  {symbol: 'USDC.n', family: 'usdc', name: 'USDC from Noble (being wound down by Circle)', base: 'ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4', decimals: 6, network: 'zigchain-1', origin: 'Noble, over IBC'},
  {symbol: 'ZIG.axl', family: 'zig', name: 'ZIG through Axelar', base: 'ibc/9BEE293E6559ED860CC702685996F394D4991D6DFFD60A19ABC3723E6F34788A', decimals: 18, network: 'zigchain-1', origin: 'Axelar, over IBC (transfer/channel-1)'},
  {symbol: 'ETH', family: 'eth', name: 'Ether from Ethereum', base: 'ibc/5E970F9FF7B696B42F75B92CC05A74B9C44AB0B5D231FBE794A29D74344B19D7', decimals: 18, network: 'zigchain-1', origin: 'Ethereum, through Axelar'},
  {symbol: 'WBTC', family: 'btc', name: 'Wrapped Bitcoin from Ethereum', base: 'ibc/7B02D9C0746D2D6551CD358D4C7ABAC6EE94527D613BACFDEE122559CEB41AA4', decimals: 8, network: 'zigchain-1', origin: 'Ethereum, through Axelar'},
  {symbol: 'USDT', family: 'usdt', name: 'Tether USD from Ethereum', base: 'ibc/630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9', decimals: 6, network: 'zigchain-1', origin: 'Ethereum, through Axelar'},
  {symbol: 'EURC', family: 'eurc', name: 'Euro Coin from Ethereum', base: 'ibc/CC5268F89C752A4BDCBDAA574AF0A381786FCC839104E077DA9A9145176BF8ED', decimals: 6, network: 'zigchain-1', origin: 'Ethereum, through Axelar'},
  {symbol: 'XAUt', family: 'xaut', name: 'Tether Gold from Ethereum', base: 'ibc/294719272CB20610F3C0173B0E14DD65F9D7F515548AB3F8373CC91F36357234', decimals: 6, network: 'zigchain-1', origin: 'Ethereum, through Axelar'},
  {symbol: 'SolvBTC', family: 'btc', name: 'SolvBTC from Ethereum', base: 'ibc/F1E29C7A6E0A3782CD87D279722AC11FEDE1BAAB9BD5A25A2A7EAE44ED02ADD5', decimals: 18, network: 'zigchain-1', origin: 'Ethereum, through Axelar'},
] as const);
/** Base words a look-alike imitates, beyond the symbols above (a token named "USDC" or "Bitcoin" under another denom). */
const EXTRA_WORDS: Readonly<Record<string, string>> = Object.freeze({usdc: 'usdc', usd: 'usdc', usdt: 'usdt', tether: 'usdt', bitcoin: 'btc', btc: 'btc', ether: 'eth', ethereum: 'eth', atom: 'atom', zig: 'zig', zigchain: 'zig', stzig: 'stzig', valdora: 'stzig'});

// ---- Look-alike names --------------------------------------------------------------------------------------------
/** Letters that look like Latin ones (Cyrillic, Greek, fullwidth after NFKC), and digits read as letters. */
const CONFUSABLES: Readonly<Record<string, string>> = Object.freeze({
  'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'з': '3', 'і': 'i', 'ї': 'i', 'ј': 'j', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x', 'ѕ': 's', 'ԁ': 'd', 'ԛ': 'q', 'ԝ': 'w', 'ɡ': 'g', 'ᴢ': 'z',
  'α': 'a', 'β': 'b', 'ε': 'e', 'ζ': 'z', 'η': 'n', 'ι': 'i', 'κ': 'k', 'μ': 'u', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x',
  '0': 'o', '1': 'i', 'l': 'i', '|': 'i', '!': 'i', '$': 's', '5': 's', '9': 'g', '6': 'g',
});
/**
 * A name folded for comparison: NFKC (fullwidth and styled letters to plain), invisible and combining marks removed,
 * lower case, look-alike letters and digits folded, everything but letters dropped. "ＺＩＧ", "Z​IG", "ZΙG", "Z1G" → "zig".
 */
export function foldName(value: string): string {
  const plain = value.normalize('NFKD').replace(/[̀-ͯ​-‏‪-‮⁠-⁤﻿­]/g, '').normalize('NFKC').toLowerCase();
  return [...plain].map(ch => CONFUSABLES[ch] ?? ch).join('').replace(/[^a-z]/g, '');
}
const FAMILY_WORDS: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>(Object.entries(EXTRA_WORDS).map(([word, family]) => [foldName(word), family]));
  for (const t of KNOWN_TOKENS) { map.set(foldName(t.symbol), t.family); map.set(foldName(t.symbol.split('.')[0]!), t.family); }
  return map;
})();
/** The known family a whole name reads as ("ＺＩＧ" → "zig", "Staked ZIG" → "stzig"), or null. */
export function wholeFamily(name: string | null | undefined): string | null {
  if (!name) return null;
  const whole = foldName(name);
  return FAMILY_WORDS.get(whole) ?? FAMILY_WORDS.get(whole.replace(/^staked/, 'st')) ?? null;
}
/** The known family a name imitates ("zig", "usdc"…), or null. A name with extra words ("ZIG Rewards") counts as well. */
export function imitatedFamily(name: string | null | undefined): string | null {
  if (!name) return null;
  const whole = wholeFamily(name);
  if (whole) return whole;
  for (const word of name.split(/[\s._\-/:()]+/)) { const folded = foldName(word); if (folded.length >= 3 && FAMILY_WORDS.has(folded)) return FAMILY_WORDS.get(folded)!; }
  return null;
}

// ---- IBC traces --------------------------------------------------------------------------------------------------
export type IbcTrace = {hops: {port: string; channel: string}[]; base: string; path: string};
const ID = /^[a-zA-Z0-9._\-[\]#<>+]{1,128}$/;
const BASE = /^[a-zA-Z0-9/:._\-]{1,128}$/;
/** The LCD's answer to `/ibc/apps/transfer/v1/denoms/{hash}` (v10) or `/denom_traces/{hash}` (older) → a trace, or null. */
export function parseTraceAnswer(body: unknown): IbcTrace | null {
  if (!body || typeof body !== 'object') return null;
  const v10 = (body as {denom?: {base?: unknown; trace?: unknown}}).denom;
  if (v10 && typeof v10 === 'object') {
    const base = v10.base, trace = v10.trace;
    if (typeof base !== 'string' || !BASE.test(base) || !Array.isArray(trace) || trace.length > 8) return null;
    const hops: IbcTrace['hops'] = [];
    for (const hop of trace) {
      const port = (hop as {port_id?: unknown})?.port_id, channel = (hop as {channel_id?: unknown})?.channel_id;
      if (typeof port !== 'string' || typeof channel !== 'string' || !ID.test(port) || !ID.test(channel)) return null;
      hops.push({port, channel});
    }
    if (!hops.length) return null;
    return {hops, base, path: [...hops.map(h => `${h.port}/${h.channel}`), base].join('/')};
  }
  const legacy = (body as {denom_trace?: {path?: unknown; base_denom?: unknown}}).denom_trace;
  if (legacy && typeof legacy === 'object') {
    const path = legacy.path, base = legacy.base_denom;
    if (typeof path !== 'string' || typeof base !== 'string' || !BASE.test(base) || path.length > 600) return null;
    const parts = path.split('/');
    if (!parts.length || parts.length % 2 || parts.length > 16 || parts.some(p => !ID.test(p))) return null;
    const hops = Array.from({length: parts.length / 2}, (_, i) => ({port: parts[i * 2]!, channel: parts[i * 2 + 1]!}));
    return {hops, base, path: `${path}/${base}`};
  }
  return null;
}
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
/** `ibc/` + upper-case SHA-256 of the full trace path, as the IBC transfer module derives it. */
export async function ibcDenomOf(path: string): Promise<string> {
  return `ibc/${hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(path)))}`;
}
export const isIbcDenom = (denom: string) => /^ibc\/[0-9A-Fa-f]{64}$/.test(denom);
/** True only when the trace's own hash is the denom (case-insensitive hex). */
export async function traceMatches(denom: string, trace: IbcTrace): Promise<boolean> {
  return isIbcDenom(denom) && (await ibcDenomOf(trace.path)) === `ibc/${denom.slice(4).toUpperCase()}`;
}

// ---- Classification ----------------------------------------------------------------------------------------------
export type TokenFacts = {
  network: 'zigchain-1' | 'zig-test-2';
  denom: string;
  /** Bank metadata as the chain holds it (written by the token's creator for factory tokens). */
  metadata?: {name?: string; symbol?: string; display?: string} | null;
  /** A CW20 contract's own token_info. */
  cw20?: {name?: string; symbol?: string; decimals?: number} | null;
  /** An IBC trace already checked with traceMatches. */
  verifiedTrace?: IbcTrace | null;
};
export type TokenKind = 'zig' | 'known' | 'ibc' | 'factory' | 'cw20' | 'lookalike' | 'unknown';
export type TokenView = {
  kind: TokenKind; denom: string;
  /** The words ZIGoals stands behind; never the creator's own name. */
  identity: string;
  /** The token's own name and symbol as its creator wrote them (quoted, labelled), when there is one. */
  ownName?: string;
  /** For factory tokens: the address that made it; for CW20: the contract. */
  maker?: string;
  warning?: string;
  source?: string;
};
const clip = (value: string | undefined, max = 60) => value ? value.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤﻿]/g, '').trim().slice(0, max) : '';
export const isFactoryDenom = (denom: string) => /^coin\.zig1[02-9ac-hj-np-z]{38,58}\.[a-zA-Z0-9._\-]{1,64}$/.test(denom);
export const isCw20Contract = (value: string) => /^zig1[02-9ac-hj-np-z]{58}$/.test(value);
export function factoryParts(denom: string): {creator: string; subdenom: string} | null {
  if (!isFactoryDenom(denom)) return null;
  const [, creator = '', ...rest] = denom.split('.');
  return {creator, subdenom: rest.join('.')};
}
const shortAddr = (address: string) => address.length > 20 ? `${address.slice(0, 10)}…${address.slice(-6)}` : address;
export function classifyToken(facts: TokenFacts): TokenView {
  const {denom, network} = facts;
  const known = KNOWN_TOKENS.find(t => t.base === denom && t.network === network);
  const ownBits = [clip(facts.cw20?.name ?? facts.metadata?.name), clip(facts.cw20?.symbol ?? facts.metadata?.symbol ?? facts.metadata?.display, 24)].filter(Boolean);
  const ownName = ownBits.length ? [...new Set(ownBits)].join(' · ') : undefined;
  if (known) return {kind: known.base === 'azig' ? 'zig' : 'known', denom, identity: `${known.symbol}: ${known.name}`, ...(ownName ? {ownName} : {}), source: `${known.origin}. Matched by its exact denom in ${KNOWN_TOKENS_SOURCE}, read ${KNOWN_TOKENS_READ_ON}.`};
  if (DECOY_DENOMS.includes(denom)) return {kind: 'lookalike', denom, identity: 'A look-alike token', ...(ownName ? {ownName} : {}), warning: 'Not ZIG. Never stake, buy or send this.'};
  // A known symbol's family under any other denom is a look-alike, whatever else the token claims.
  const names = [facts.cw20?.symbol, facts.metadata?.symbol, facts.cw20?.name, facts.metadata?.name, facts.metadata?.display, factoryParts(denom)?.subdenom];
  const imitated = names.map(wholeFamily).find(Boolean) ?? names.map(imitatedFamily).find(Boolean);
  const realOf = (family: string) => KNOWN_TOKENS.filter(t => t.family === family && t.network === network).map(t => t.symbol);
  // A checked IBC trace whose own base denom carries the family ("uusdc" for USDC) is that coin from another route, not a
  // look-alike; its name is still only its own.
  const traceCarries = (family: string) => !!facts.verifiedTrace && isIbcDenom(denom) && [...FAMILY_WORDS].some(([word, f]) => f === family && foldName(facts.verifiedTrace!.base.split('/').at(-1) ?? '').includes(word));
  if (imitated && !traceCarries(imitated)) {
    const real = realOf(imitated);
    return {kind: 'lookalike', denom, identity: 'A look-alike token', ...(ownName ? {ownName} : {}), ...(factoryParts(denom) ? {maker: factoryParts(denom)!.creator} : isCw20Contract(denom) ? {maker: denom} : {}),
      warning: `Its name looks like ${real[0] ?? 'a well-known token'}, but its denom is not the real one. Treat it as a different token; never send or swap it believing it is ${real[0] ?? 'that token'}.`};
  }
  if (isIbcDenom(denom)) {
    if (!facts.verifiedTrace) return {kind: 'unknown', denom, identity: 'A token from another chain whose route could not be checked', ...(ownName ? {ownName} : {}), warning: 'ZIGoals could not confirm where it comes from. Go by the denom only.'};
    const t = facts.verifiedTrace, family = imitatedFamily(t.base.split('/').at(-1));
    const hops = t.hops.map(h => h.channel).join(' → ');
    return {kind: 'ibc', denom, identity: `${t.base} from another chain`, ...(ownName ? {ownName} : {}), source: `Its route (${hops}) was read from the network and its hash checked by ZIGoals.${family && !KNOWN_TOKENS.some(k => k.base === denom) ? ' It is not on ZIGChain’s curated token list.' : ''}`};
  }
  const factory = factoryParts(denom);
  if (factory) return {kind: 'factory', denom, identity: `A token made on ZIGChain by ${shortAddr(factory.creator)}`, ...(ownName ? {ownName} : {}), maker: factory.creator, warning: 'Anyone can make a token and give it any name. Its name is the maker’s own words.'};
  if (isCw20Contract(denom)) return {kind: 'cw20', denom, identity: `A smart-contract token (CW20) at ${shortAddr(denom)}`, ...(ownName ? {ownName} : {}), maker: denom, warning: 'Anyone can deploy a token contract and give it any name. Its name is the contract’s own words.'};
  return {kind: 'unknown', denom, identity: 'A token ZIGoals does not know', ...(ownName ? {ownName} : {}), warning: 'Go by the denom only.'};
}
/** A denom or contract the token check accepts (bounded, no spaces). */
export const isCheckableDenom = (value: string) => value === 'azig' || value === 'uzig' || isIbcDenom(value) || isFactoryDenom(value) || isCw20Contract(value);
