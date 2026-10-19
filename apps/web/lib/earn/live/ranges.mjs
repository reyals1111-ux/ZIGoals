// Session AF (ADR-028 H58; `TIER 3 (data formats)`): the sane ranges of every live Earn figure, in one plain module that
// the server routes (lib/server/earn/*), their tests and scripts/earn/live-check.mjs all import. A figure outside its
// range makes the answer `unavailable` with reason OUT_OF_RANGE: ZIGoals never shows a number it would not believe.
// Decimal strings are read with Number here only to compare against these bounds; the figures themselves stay strings.

/** [min, max], both inclusive. */
export const RANGES = Object.freeze({
  inflation: [0.001, 0.5],
  communityTax: [0, 0.5],
  grossApr: [0.001, 0.5],
  unbondingSeconds: [3600, 60 * 86400],
  blockSeconds: [0.5, 30],
  blockFactor: [0.2, 2],
  bondedShare: [0.001, 1],
  maxValidators: [1, 1000],
  slashFraction: [0, 0.5],
  minSignedPerWindow: [0, 1],
  signedBlocksWindow: [1, 10_000_000],
  commission: [0, 1],
  stZigRatio: [0.5, 5],
  feeOfRewards: [0, 1],
  feeBps: [0, 10_000],
  usdcPerZig: [0.0001, 100],
  zigPerAtom: [0.01, 1_000_000],
  tvlUsd: [0, 1e12],
  apy: [0, 200],
  // Session AF chunk 2: a vault's share price (it starts at 1 and moves with the vault's results) and the measured staking rate.
  sharePrice: [0.5, 10],
  measuredApr: [0, 0.5],
});
const num = value => (typeof value === 'number' ? value : typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : NaN);
/** True when `value` (a number or a plain decimal string) is a finite number inside the named range. */
export function inRange(name, value) {
  const range = RANGES[name], n = num(value);
  if (!range) throw new Error(`Unknown range ${name}`);
  return Number.isFinite(n) && n >= range[0] && n <= range[1];
}
const positive = value => typeof value === 'string' && /^\d+$/.test(value) && BigInt(value) > 0n;
/** Each check returns the names of the figures that fail, [] when all are sane. `unknown` is never read as zero. */
export function chainFailures(d) {
  const out = [];
  const want = (ok, name) => { if (!ok) out.push(name); };
  want(inRange('inflation', d.mint.inflation), 'inflation');
  want(inRange('communityTax', d.distribution.communityTax), 'communityTax');
  want(positive(d.staking.bondedTokens) && positive(d.staking.supply) && BigInt(d.staking.bondedTokens) < BigInt(d.staking.supply), 'bondedTokens');
  want(inRange('bondedShare', d.staking.bondedShare), 'bondedShare');
  want(inRange('unbondingSeconds', d.staking.unbondingSeconds), 'unbondingSeconds');
  want(inRange('maxValidators', d.staking.maxValidators), 'maxValidators');
  want(inRange('slashFraction', d.slashing.slashFractionDoubleSign) && inRange('slashFraction', d.slashing.slashFractionDowntime), 'slashing');
  want(inRange('minSignedPerWindow', d.slashing.minSignedPerWindow) && inRange('signedBlocksWindow', d.slashing.signedBlocksWindow), 'signedBlocksWindow');
  want(inRange('grossApr', d.apr.gross), 'grossApr');
  want(inRange('blockSeconds', d.apr.blockSeconds), 'blockSeconds');
  want(inRange('blockFactor', d.apr.factor), 'blockFactor');
  return out;
}
export function valdoraFailures(d) {
  const out = [];
  if (!inRange('feeOfRewards', d.feeOfRewards)) out.push('feeOfRewards');
  if (!positive(d.stZigSupplyUnits)) out.push('stZigSupply');
  if (!positive(d.minDepositAzig)) out.push('minDeposit');
  if (!inRange('stZigRatio', d.contractZigPerStZig)) out.push('contractRatio');
  if (!inRange('stZigRatio', d.dexZigPerStZig)) out.push('dexRatio');
  return out;
}
export function oroswapFailures(d) {
  const out = [];
  for (const t of d.pairTypes) if (!inRange('feeBps', t.totalFeeBps) || !inRange('feeBps', t.makerFeeBps)) out.push(`pairType:${t.name}`);
  for (const p of d.pools) {
    if (!p.reserves.every(r => positive(r.amount))) out.push(`reserves:${p.id}`);
    if (!inRange('feeBps', p.feeBps)) out.push(`fee:${p.id}`);
    // Both USDC pools (USDC.n and, since chunk 2, USDC.inj) price ZIG in USDC.
    const range = p.id.startsWith('zig-usdc') ? 'usdcPerZig' : p.id === 'zig-atom' ? 'zigPerAtom' : 'stZigRatio';
    if (!inRange(range, p.price.value)) out.push(`price:${p.id}`);
  }
  return out;
}
export function defillamaFailures(d) {
  const out = [];
  for (const [slug, p] of Object.entries(d.protocols)) if (p.status === 'ok' && p.tvlUsd !== null && !inRange('tvlUsd', p.tvlUsd)) out.push(`tvl:${slug}`);
  if (d.pools.status === 'ok') for (const p of d.pools.rows) {
    if (p.tvlUsd !== null && !inRange('tvlUsd', p.tvlUsd)) out.push(`poolTvl:${p.pool}`);
    for (const key of ['apy', 'apyBase', 'apyReward']) if (p[key] !== null && !inRange('apy', p[key])) out.push(`${key}:${p.pool}`);
  }
  return out;
}
/** Session AF chunk 2: the USDC vaults, Nawa's stZIG vault and DeFa's counter; each failing figure is withdrawn on its own. */
export function vaultsFailures(d) {
  const out = [];
  for (const [id, v] of Object.entries(d.vaults)) {
    if (v.status !== 'ok') continue;
    if (!/^\d+$/.test(v.aumUnits) || !/^\d+$/.test(v.totalShares) || !/^\d+$/.test(v.pendingRedemptionUnits)) out.push(`vault:${id}`);
    else if (!inRange('sharePrice', v.pricePerShare)) out.push(`vault:${id}`);
  }
  if (d.nawaZig.status === 'ok' && !/^\d+$/.test(d.nawaZig.totalAumUnits)) out.push('nawaZig');
  if (d.defa.status === 'ok' && !/^\d+$/.test(d.defa.activeTvlUnits)) out.push('defa');
  return out;
}
/** Session AF chunk 2 (H97): the measured rate, and the commission of the validator it is measured on. */
export function measuredFailures(d) {
  const out = [];
  if (!inRange('commission', d.validator.commission)) out.push('commission');
  if (!positive(d.latest.selfBond)) out.push('selfBond');
  if (d.measured.status === 'ok' && !inRange('measuredApr', d.measured.rate)) out.push('measuredApr');
  return out;
}
