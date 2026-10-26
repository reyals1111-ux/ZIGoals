/**
 * Session AH (AF3; ADR-028 H134 recorded it as a later option): your own OroSwap pool shares and USDC vault shares on Earn.
 * Both are plain bank balances of a denom the pool or vault mints (checked on zigchain-1 on 2026-10-26: each pool's `pair`
 * answer names its `liquidity_token`; each vault's `denom_metadata` names its share denom), so reading them needs no
 * address-bearing smart query: only the balance of these eight pinned denoms, nothing else about the wallet.
 */
export const POOL_SHARE_DENOMS = Object.freeze({
  'zig-usdc': 'coin.zig186ucx5mtdq6ams8rsvvcu7yfw5lhtxue8ykdkyqvlnk3gpc77lasw8373h.oroswaplptoken',
  'zig-usdc-inj': 'coin.zig1ewkl2peqhupyfhm6pm7xlufucde7le9zer0wa867u08cveuts2asm0l2z3.oroswaplptoken',
  'zig-atom': 'coin.zig1wvqk2tm38dn3yp9ry7h5zzjqv3tytzpwpkkg55w3j58cdhvqrnfq78fe45.oroswaplptoken',
  'stzig-zig': 'coin.zig1h72z8ptvcdqvuvy2lqanupwtextjmjmktj2ejgne2padxk0z8zds48shzq.oroswaplptoken',
} as const);
export const VAULT_SHARE_DENOMS = Object.freeze({
  'stablecoin-yield': 'coin.zig1h3au5n3lsyqm32ydz3usgy7r9z7wpx4gttcxmypfecz29adtu64svluenp.vvaultsy',
  'private-credit': 'coin.zig1mayx7wkzensav40j3qc8c5lh6s884jlhsu0c0js058t4u9xcg0mql58gkq.vvaultoc',
  'core-income': 'coin.zig1m526fltgrf70qdsufx9k9fdl4x07usjlydcn32jn83fs6za9c5cswd9grk.vvaultci',
  'nawa-usdc': 'coin.zig1fn4rrr5knlg93nf3wyme9fzmgve3fftxu5l7wv90llp77mwg7ctq2lfwtd.n1usdc',
} as const);
export type PoolShareId = keyof typeof POOL_SHARE_DENOMS;
export type VaultShareId = keyof typeof VAULT_SHARE_DENOMS;
/** What the route answers: base units of each share denom held (only non-zero ones), at one block. */
export type SharesWire = {height: string; observedAt: string; pools: Partial<Record<PoolShareId, string>>; vaults: Partial<Record<VaultShareId, string>>};
const UNITS = /^\d{1,78}$/;
/** Your part of a pool: each reserve × your shares ÷ all shares (base units, rounded down). Unknown when the pool has no shares. */
export function poolPart(amount: string, totalShare: string, reserves: readonly {symbol: string; amount: string; decimals: number}[]): {symbol: string; units: string; decimals: number}[] | null {
  if (!UNITS.test(amount) || !UNITS.test(totalShare) || BigInt(totalShare) === 0n) return null;
  return reserves.map(r => ({symbol: r.symbol, decimals: r.decimals, units: UNITS.test(r.amount) ? (BigInt(r.amount) * BigInt(amount) / BigInt(totalShare)).toString() : '0'}));
}
/** Your part of a vault, in its deposit asset's base units: shares × price per share (a decimal), rounded down. */
export function vaultPart(amount: string, pricePerShare: string): string | null {
  if (!UNITS.test(amount) || !/^\d{1,20}(\.\d{1,30})?$/.test(pricePerShare)) return null;
  const [whole, frac = ''] = pricePerShare.split('.'), scale = 10n ** BigInt(frac.length);
  return (BigInt(amount) * (BigInt(whole!) * scale + BigInt(frac || '0')) / scale).toString();
}
