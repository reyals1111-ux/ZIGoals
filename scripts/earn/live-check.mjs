#!/usr/bin/env node
// Session AF chunk 2 (P11.7; ADR-028 H21, H51, H97): the Earn live check. Read-only, on the real network, run on the Mac:
//
//   node scripts/earn/live-check.mjs            # prints one line per check, each with its "as of"
//   node scripts/earn/live-check.mjs --record scripts/earn/fixtures/live-check-<date>.json
//
// Every address-free Earn source must answer well-formed data inside the sane ranges the app itself uses
// (apps/web/lib/earn/live/ranges.mjs): ZIGChain's own denom facts (azig, 18 decimals — never a registry's word, H21), the
// staking parameters and the issuance figure's inputs, Valdora's pinned staker and the stZIG→ZIG rate against OroSwap's
// pool, OroSwap's fee tiers and pools (each vouched for by the factory), the USDC vaults, and DefiLlama's figures. The
// measured staking figure (one named validator's self-bond over 10,000 blocks) is compared with the issuance figure at
// that validator's commission: more than 10 % apart is FLAGGED ("reward path unverified", H51/H97), not failed.
// Gate C (the ledger pass, P11.7 / plan §11.3): also the validator list Earn and Staking show, the newest proposals and the
// latest tally, Ramp Network's public asset list (Add money), and one public, non-personal address on every browser-direct
// balance host the app reads (PublicNode's Cosmos Hub REST and its six EVM and Solana RPCs, mempool.space): a module
// account, the EVM burn address, Solana's vote program, Bitcoin's genesis address.
// Plain GETs and read-only balance JSON-RPC calls only, no address of a person, no key, nothing written anywhere but the
// optional --record file.
// Exit 0: every check passed (flags allowed); 1: a source answered malformed or out-of-range data, or did not answer.
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {chainFailures, defillamaFailures, inRange, oroswapFailures, valdoraFailures, vaultsFailures} from '../../apps/web/lib/earn/live/ranges.mjs';
import {aprAgreement, fixed, issuanceParts, issuanceRate, measuredRate, text} from '../../apps/web/lib/earn/live/measured.mjs';

export const LCD = 'https://api.zigchain.com';
const UA = 'Mozilla/5.0 (ZIGoals live-check; read-only)';
export const PINS = Object.freeze({
  chainId: 'zigchain-1',
  staker: 'zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55', stZigDenom: 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig',
  factory: 'zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85', incentives: 'zig10v0hrjvwwlqwvk2yhwagm9m9h385spxa4s54f4aekhap0lxyekysf2ekwz',
  pools: [
    {id: 'zig-usdc', contract: 'zig186ucx5mtdq6ams8rsvvcu7yfw5lhtxue8ykdkyqvlnk3gpc77lasw8373h', a: {symbol: 'ZIG', denom: 'azig', decimals: 18}, b: {symbol: 'USDC.n', denom: 'ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4', decimals: 6}, base: 'ZIG'},
    {id: 'zig-usdc-inj', contract: 'zig1ewkl2peqhupyfhm6pm7xlufucde7le9zer0wa867u08cveuts2asm0l2z3', a: {symbol: 'ZIG', denom: 'azig', decimals: 18}, b: {symbol: 'USDC.inj', denom: 'ibc/6C6F5A015608CF3951DFE6A117390210AB825BF0CC1AD33B2B100B05529A9B6B', decimals: 6}, base: 'ZIG'},
    {id: 'zig-atom', contract: 'zig1wvqk2tm38dn3yp9ry7h5zzjqv3tytzpwpkkg55w3j58cdhvqrnfq78fe45', a: {symbol: 'ZIG', denom: 'azig', decimals: 18}, b: {symbol: 'ATOM', denom: 'ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0', decimals: 6}, base: 'ATOM'},
    {id: 'stzig-zig', contract: 'zig1h72z8ptvcdqvuvy2lqanupwtextjmjmktj2ejgne2padxk0z8zds48shzq', a: {symbol: 'stZIG', denom: 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig', decimals: 6}, b: {symbol: 'ZIG', denom: 'azig', decimals: 18}, base: 'stZIG'},
  ],
  vaults: {'stablecoin-yield': 'zig1h3au5n3lsyqm32ydz3usgy7r9z7wpx4gttcxmypfecz29adtu64svluenp', 'private-credit': 'zig1mayx7wkzensav40j3qc8c5lh6s884jlhsu0c0js058t4u9xcg0mql58gkq', 'core-income': 'zig1m526fltgrf70qdsufx9k9fdl4x07usjlydcn32jn83fs6za9c5cswd9grk', 'nawa-usdc': 'zig1fn4rrr5knlg93nf3wyme9fzmgve3fftxu5l7wv90llp77mwg7ctq2lfwtd'},
  validator: 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl', selfDelegator: 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx',
  llama: ['valdora-finance', 'oroswap', 'nawa-protocol', 'defa-by-invoicemate', 'permapod'],
});
const smart = (contract, query) => `/cosmwasm/wasm/v1/contract/${contract}/smart/${btoa(JSON.stringify(query))}`;
const units = (amount, decimals) => fixed(amount) / 10n ** BigInt(decimals);
const ratio = (a, b) => text(a * 10n ** 18n / b);

/**
 * Runs every check; `fetcher` is the network (or a recorded replay). Returns each result and the exit code. The sources
 * without a time of their own (DefiLlama, Ramp, the balance hosts) are dated by `now`: the clock on a real run, the
 * record's own time on a replay (CI on 1a7624d6, the first run after the recording's day, dated them today).
 */
export async function liveCheck({fetcher = (url, init) => fetch(url, init), log = () => {}, now = fetcher.recordedAt ? () => new Date(fetcher.recordedAt) : () => new Date()} = {}) {
  const results = [];
  const get = async (url, height) => {
    const response = await fetcher(url, {method: 'GET', headers: {accept: 'application/json', 'user-agent': UA, ...(height ? {'x-cosmos-block-height': height} : {})}, redirect: 'manual', signal: AbortSignal.timeout(60_000)});
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
    if (height && response.headers.get('x-cosmos-block-height') !== height) throw new Error(`answer not at block ${height}`);
    try { return JSON.parse(await response.text()); } catch { throw new Error(`not JSON from ${new URL(url).host}`); }
  };
  const check = async (name, run) => {
    try {
      const {asOf, detail, flag} = await run();
      results.push({name, ok: true, asOf, detail, ...(flag ? {flag} : {})});
      log(`${flag ? 'FLAG' : 'OK  '} ${name}: ${detail}${flag ? ` — ${flag}` : ''} (as of ${asOf})`);
    } catch (error) {
      results.push({name, ok: false, reason: error instanceof Error ? error.message : String(error)});
      log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const need = (condition, what) => { if (!condition) throw new Error(what); };
  // One block for every LCD read, so every figure comes from the same state.
  let head;
  await check('ZIGChain latest block', async () => {
    const h = (await get(`${LCD}/cosmos/base/tendermint/v1beta1/blocks/latest`)).block?.header;
    need(h && /^\d+$/.test(h.height) && typeof h.time === 'string', 'malformed block header');
    need(h.chain_id === PINS.chainId, `chain id ${h.chain_id}, expected ${PINS.chainId}`);
    head = {height: h.height, time: h.time};
    return {asOf: h.time, detail: `${h.chain_id} at block ${h.height}`};
  });
  if (!head) return {results, exitCode: 1};
  const at = path => get(LCD + path, head.height);
  const asOf = `${head.time}, block ${head.height}`;
  const earlierHeight = (BigInt(head.height) - 10_000n).toString();
  let chain, earlierBlock;
  await check('chain denom facts (H21: azig, 18 decimals, from the chain itself)', async () => {
    const [node, staking, meta] = await Promise.all([at('/cosmos/base/tendermint/v1beta1/node_info'), at('/cosmos/staking/v1beta1/params'), at('/cosmos/bank/v1beta1/denoms_metadata/azig')]);
    need(node.default_node_info?.network === PINS.chainId, 'node is on another network');
    need(staking.params?.bond_denom === 'azig', `bond denom ${staking.params?.bond_denom}`);
    const m = meta.metadata;
    need(m?.base === 'azig' && m.denom_units?.some(u => u.denom === m.display && u.exponent === 18), 'bank metadata does not name azig with an 18-decimal display unit');
    return {asOf, detail: `bond denom azig, display ${m.display} at exponent 18, node ${node.application_version?.version ?? 'version not given'}`};
  });
  await check('staking parameters and the issuance inputs', async () => {
    const [mint, inflation, provisions, pool, staking, distribution, slashing, supply, earlier] = await Promise.all([at('/cosmos/mint/v1beta1/params'), at('/cosmos/mint/v1beta1/inflation'), at('/cosmos/mint/v1beta1/annual_provisions'), at('/cosmos/staking/v1beta1/pool'), at('/cosmos/staking/v1beta1/params'), at('/cosmos/distribution/v1beta1/params'), at('/cosmos/slashing/v1beta1/params'), at('/cosmos/bank/v1beta1/supply/by_denom?denom=azig'), at(`/cosmos/base/tendermint/v1beta1/blocks/${earlierHeight}`)]);
    earlierBlock = {height: earlier.block.header.height, time: earlier.block.header.time};
    need(earlierBlock.height === earlierHeight, 'the earlier block is not the one asked for');
    const parts = issuanceParts({annualProvisions: provisions.annual_provisions, bondedTokens: pool.pool.bonded_tokens, communityTax: distribution.params.community_tax, mintBlocksPerYear: mint.params.blocks_per_year, latest: head, earlier: earlierBlock});
    chain = {mint: {inflation: inflation.inflation, annualProvisions: provisions.annual_provisions, blocksPerYear: mint.params.blocks_per_year}, distribution: {communityTax: distribution.params.community_tax},
      staking: {bondedTokens: pool.pool.bonded_tokens, supply: supply.amount.amount, bondedShare: text(fixed(pool.pool.bonded_tokens) * 10n ** 18n / fixed(supply.amount.amount)), unbondingSeconds: Number(String(staking.params.unbonding_time).replace(/s$/, '')), maxValidators: staking.params.max_validators},
      slashing: {slashFractionDoubleSign: slashing.params.slash_fraction_double_sign, slashFractionDowntime: slashing.params.slash_fraction_downtime, minSignedPerWindow: slashing.params.min_signed_per_window, signedBlocksWindow: slashing.params.signed_blocks_window},
      apr: parts};
    const bad = chainFailures(chain);
    need(bad.length === 0, `out of range: ${bad.join(', ')}`);
    return {asOf, detail: `issuance ${(Number(parts.beforeCommission) * 100).toFixed(2)} % before commission (gross ${(Number(parts.gross) * 100).toFixed(2)} %, block ${Number(parts.blockSeconds).toFixed(3)} s, factor ${Number(parts.factor).toFixed(4)}), unbonding ${chain.staking.unbondingSeconds / 86400} days`};
  });
  await check('Valdora stZIG (pinned staker) and the rate against OroSwap’s pool', async () => {
    const [version, protocol, supply, reverse, pool] = await Promise.all([at(smart(PINS.staker, {contract_version: {}})), at(smart(PINS.staker, {protocol_info: {}})), at(smart(PINS.staker, {total_supply: {}})), at(smart(PINS.staker, {reverse_st_zig_price: {amount: '1000000000000000000000'}})), at(smart(PINS.pools[3].contract, {pool: {}}))]);
    need(version.data?.contract === 'stzig-staker' && version.data.version === '1.1.0', `staker is ${version.data?.contract} ${version.data?.version}`);
    need(protocol.data?.token_denom === PINS.stZigDenom, 'another stZIG denom');
    const contract = ratio(1000n * 10n ** 18n, fixed(reverse.data.stzig_amount) / 10n ** 6n);
    const zig = pool.data.assets.find(a => a.info.native_token.denom === 'azig'), st = pool.data.assets.find(a => a.info.native_token.denom === PINS.stZigDenom);
    need(zig && st, 'the stZIG/ZIG pool holds another pair');
    const dex = ratio(units(zig.amount, 18), units(st.amount, 6));
    const data = {feeOfRewards: text(fixed(protocol.data.fees_percentage) / 10_000n), stZigSupplyUnits: supply.data.total_supply, minDepositAzig: protocol.data.min_deposit, contractZigPerStZig: contract, dexZigPerStZig: dex};
    const bad = valdoraFailures(data);
    need(bad.length === 0, `out of range: ${bad.join(', ')}`);
    const apart = aprAgreement(contract, dex, '0.02');
    return {asOf, detail: `1 stZIG = ${Number(contract).toFixed(4)} ZIG (contract) / ${Number(dex).toFixed(4)} (pool)`, ...(apart.disagree ? {flag: 'the two sources disagree by more than 2 %: the page shows no rate (H44)'} : {})};
  });
  await check('OroSwap fee tiers, pools (vouched for by the factory) and farms', async () => {
    const [config, active, ...reads] = await Promise.all([at(smart(PINS.factory, {config: {}})), at(smart(PINS.incentives, {active_pools: {}})), ...PINS.pools.flatMap(p => [at(smart(p.contract, {pool: {}})), at(smart(PINS.factory, {pairs_by_assets: {asset_infos: [{native_token: {denom: p.a.denom}}, {native_token: {denom: p.b.denom}}]}}))])]);
    const typeName = t => 'custom' in t ? t.custom : 'xyk' in t ? 'xyk' : 'stable';
    const pools = PINS.pools.map((p, i) => {
      const pool = reads[i * 2].data, listed = reads[i * 2 + 1].data.pairs;
      need(listed.some(l => l.contract_addr === p.contract), `the factory does not list ${p.id}`);
      const amount = d => pool.assets.find(a => a.info.native_token.denom === d.denom)?.amount;
      need(amount(p.a) && amount(p.b), `${p.id} holds another pair`);
      const [base, quote] = p.base === p.a.symbol ? [p.a, p.b] : [p.b, p.a];
      need(BigInt(amount(base)) > 0n, `${p.id} has an empty reserve`);
      const value = ratio(units(amount(quote), quote.decimals), units(amount(base), base.decimals));
      const type = typeName(listed.find(l => l.contract_addr === p.contract).pair_type), tier = config.data.pair_configs.find(c => typeName(c.pair_type) === type);
      return {id: p.id, feeBps: tier?.total_fee_bps ?? -1, reserves: [{amount: amount(p.a)}, {amount: amount(p.b)}], price: {value}};
    });
    const data = {pairTypes: config.data.pair_configs.map(c => ({name: typeName(c.pair_type), totalFeeBps: c.total_fee_bps, makerFeeBps: c.maker_fee_bps})), pools};
    const bad = oroswapFailures(data);
    need(bad.length === 0, `out of range: ${bad.join(', ')}`);
    need(Array.isArray(active.data), 'active_pools is not a list');
    return {asOf, detail: `${pools.length} pools (${pools.map(p => `${p.id} ${p.feeBps} bps`).join(', ')}); farms running: ${active.data.length}`};
  });
  await check('USDC vaults (assets, share price, paused, deposit asset)', async () => {
    const vaults = {};
    for (const [id, contract] of Object.entries(PINS.vaults)) {
      const [price, pending, paused, raw] = await Promise.all([at(smart(contract, {price_per_full_share: {}})), at(smart(contract, {pending_redemption_aum: {}})), at(smart(contract, {paused: {}})), at(`/cosmwasm/wasm/v1/contract/${contract}/raw/${btoa('asset_denom')}`)]);
      need(typeof paused.data?.paused === 'boolean', `${id}: paused is not a yes/no`);
      vaults[id] = {status: 'ok', aumUnits: price.data.aum, totalShares: price.data.total_shares, pricePerShare: price.data.price, pendingRedemptionUnits: pending.data.aum, asset: JSON.parse(atob(raw.data)), paused: paused.data.paused};
    }
    const bad = vaultsFailures({vaults, nawaZig: {status: 'unavailable'}, defa: {status: 'unavailable'}});
    need(bad.length === 0, `out of range: ${bad.join(', ')}`);
    const noble = Object.values(vaults).filter(v => v.asset === 'ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4').length;
    return {asOf, detail: `${Object.keys(vaults).length} vaults, ${noble} holding USDC on Noble (USDC.n); paused: ${Object.values(vaults).filter(v => v.paused).length}`};
  });
  await check('measured vs issuance staking figure (H97)', async () => {
    need(chain && earlierBlock, 'the issuance inputs were not read');
    const bond = `/cosmos/staking/v1beta1/validators/${PINS.validator}/delegations/${PINS.selfDelegator}`, rewards = `/cosmos/distribution/v1beta1/delegators/${PINS.selfDelegator}/rewards/${PINS.validator}`;
    const [validator, bondNow, rewardsNow, bondThen, rewardsThen] = await Promise.all([at(`/cosmos/staking/v1beta1/validators/${PINS.validator}`), at(bond), at(rewards), get(LCD + bond, earlierHeight), get(LCD + rewards, earlierHeight)]);
    const azig = r => r.rewards.find(x => x.denom === 'azig')?.amount ?? '0';
    const commission = validator.validator.commission.commission_rates.rate;
    need(inRange('commission', commission), 'commission out of range');
    const m = measuredRate({latest: {...head, pendingRewards: azig(rewardsNow), selfBond: bondNow.delegation_response.balance.amount}, earlier: {...earlierBlock, pendingRewards: azig(rewardsThen), selfBond: bondThen.delegation_response.balance.amount}});
    if (m.status !== 'ok') return {asOf, detail: `${validator.validator.description.moniker}: not measurable in this window`, flag: 'rewards were claimed or the stake changed during the window'};
    need(inRange('measuredApr', m.rate), `measured rate out of range: ${m.rate}`);
    const issuance = issuanceRate({annualProvisions: chain.mint.annualProvisions, bondedTokens: chain.staking.bondedTokens, communityTax: chain.distribution.communityTax, mintBlocksPerYear: chain.mint.blocksPerYear, latest: head, earlier: earlierBlock, commission});
    const agreement = aprAgreement(issuance, m.rate);
    return {asOf, detail: `${validator.validator.description.moniker} at ${(Number(commission) * 100).toFixed(1)} %: measured ${(Number(m.rate) * 100).toFixed(2)} %, issuance ${(Number(issuance) * 100).toFixed(2)} % (${(Number(agreement.apart) * 100).toFixed(1)} % apart)`,
      ...(agreement.disagree ? {flag: 'unavailable: reward path unverified — the two figures differ by more than 10 %'} : {})};
  });
  await check('DefiLlama (third party): value locked per app and yield pools on ZIGChain', async () => {
    const at2 = now().toISOString();
    const protocols = {};
    for (const slug of PINS.llama) {
      const p = await get(`https://api.llama.fi/protocol/${slug}`);
      const tvl = p.currentChainTvls?.ZIGChain;
      need(tvl === undefined || typeof tvl === 'number', `${slug}: value locked is not a number`);
      protocols[slug] = {status: 'ok', tvlUsd: tvl ?? null, incidents: (p.hacks ?? []).map(h => new Date(h.date * 1000).toISOString().slice(0, 10))};
    }
    const all = (await get('https://yields.llama.fi/pools')).data;
    need(Array.isArray(all), 'yields is not a list');
    const rows = all.filter(r => r.chain === 'ZIGChain' && PINS.llama.includes(r.project)).map(r => ({pool: r.pool, tvlUsd: r.tvlUsd ?? null, apy: r.apy ?? null, apyBase: r.apyBase ?? null, apyReward: r.apyReward ?? null}));
    const bad = defillamaFailures({protocols, pools: {status: 'ok', rows}});
    need(bad.length === 0, `out of range: ${bad.join(', ')}`);
    return {asOf: at2, detail: `${Object.values(protocols).filter(p => p.tvlUsd !== null).length} apps with a value; ${rows.length} yield pools; incidents: ${Object.entries(protocols).filter(([, p]) => p.incidents.length).map(([s, p]) => `${s} ${p.incidents.join(', ')}`).join('; ') || 'none'}`};
  });
  await check('validators (the list Earn and Staking show)', async () => {
    const [list, params, pool] = await Promise.all([at('/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=300'), at('/cosmos/staking/v1beta1/params'), at('/cosmos/staking/v1beta1/pool')]);
    const vs = list.validators ?? [], max = Number(params.params?.max_validators);
    need(vs.length >= 1 && vs.length <= max, `${vs.length} bonded validators (at most ${max})`);
    const rates = vs.map(v => {
      need(/^zigvaloper1[02-9ac-hj-np-z]{38}$/.test(v.operator_address ?? ''), 'not a validator address');
      need(!v.jailed, `${v.operator_address} is bonded and jailed`);
      need(/^\d+$/.test(v.tokens ?? '') && BigInt(v.tokens) > 0n, `${v.operator_address}: no tokens`);
      const rate = Number(v.commission?.commission_rates?.rate);
      need(rate >= 0 && rate <= 1, `${v.operator_address}: commission out of range`);
      return rate;
    });
    const tokens = vs.map(v => BigInt(v.tokens)).sort((a, b) => (b > a ? 1 : b < a ? -1 : 0)), sum = tokens.reduce((a, b) => a + b, 0n), bonded = BigInt(pool.pool.bonded_tokens);
    need(sum === bonded, `the bonded validators hold ${sum}, the pool says ${bonded}`);
    const top = tokens.slice(0, 10).reduce((a, b) => a + b, 0n);
    return {asOf, detail: `${vs.length} bonded (at most ${max}), none jailed; commissions ${(Math.min(...rates) * 100).toFixed(1)}–${(Math.max(...rates) * 100).toFixed(1)} %; the ten largest hold ${(Number(top * 10000n / sum) / 100).toFixed(2)} %`};
  });
  await check('governance: the newest proposals and the latest tally', async () => {
    const [props, tallying] = await Promise.all([at('/cosmos/gov/v1/proposals?pagination.reverse=true&pagination.limit=5'), at('/cosmos/gov/v1/params/tallying')]);
    const list = props.proposals ?? [];
    need(list.length >= 1, 'no proposal');
    for (const p of list) need(/^\d+$/.test(p.id ?? '') && Number(p.id) >= 1 && /^PROPOSAL_STATUS_/.test(p.status ?? ''), 'malformed proposal');
    const latest = list[0], tally = (await at(`/cosmos/gov/v1/proposals/${latest.id}/tally`)).tally;
    for (const k of ['yes_count', 'no_count', 'abstain_count', 'no_with_veto_count']) need(/^\d+$/.test(tally?.[k] ?? ''), `the tally's ${k} is malformed`);
    const quorum = Number((tallying.params ?? tallying.tally_params)?.quorum);
    need(quorum > 0 && quorum < 1, 'quorum out of range');
    return {asOf, detail: `newest #${latest.id} (${latest.status.replace('PROPOSAL_STATUS_', '').toLowerCase().replaceAll('_', ' ')}), its tally read; quorum ${(quorum * 100).toFixed(1)} %`};
  });
  await check('Ramp Network’s public asset list (Add money)', async () => {
    const at3 = now().toISOString(), r = await get('https://api.rampnetwork.com/api/host-api/v3/assets?currencyCode=EUR');
    need(r.currencyCode === 'EUR' && Array.isArray(r.assets), 'malformed asset list');
    for (const k of ['minFeePercent', 'maxFeePercent', 'minFeeAmount', 'minPurchaseAmount']) need(typeof r[k] === 'number' && r[k] >= 0 && r[k] <= 1_000_000, `${k} out of range`);
    need(r.maxFeePercent <= 20, `fees up to ${r.maxFeePercent} %`);
    const atom = r.assets.find(a => `${a.chain}_${a.symbol}`.toUpperCase() === 'COSMOS_ATOM');
    need(atom, 'ATOM on Cosmos Hub is not in the list');
    return {asOf: at3, detail: `${r.assets.length} assets; ATOM on Cosmos Hub ${atom.enabled && !atom.hidden ? 'offered' : 'listed, not offered now'}; fees ${r.minFeePercent}–${r.maxFeePercent} %, at least €${r.minFeeAmount}`};
  });
  await check('the browser-direct balance hosts, one public address each', async () => {
    const at4 = now().toISOString(), answered = [];
    const rpc = async (url, body) => {
      const response = await fetcher(url, {method: 'POST', headers: {accept: 'application/json', 'content-type': 'application/json', 'user-agent': UA}, body: JSON.stringify(body), redirect: 'manual', signal: AbortSignal.timeout(60_000)});
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
      try { return JSON.parse(await response.text()); } catch { throw new Error(`not JSON from ${new URL(url).host}`); }
    };
    const hub = await get(`${BALANCE_HOSTS.cosmosHub}/cosmos/bank/v1beta1/balances/${PUBLIC_ADDRESSES.cosmosHub}`);
    need(Array.isArray(hub.balances) && hub.balances.every(b => /^\d+$/.test(b.amount ?? '')), 'Cosmos Hub: malformed balances'); answered.push('Cosmos Hub');
    for (const [name, host] of Object.entries(BALANCE_HOSTS.evm)) {
      const j = await rpc(host, {jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [PUBLIC_ADDRESSES.evm, 'latest']});
      need(/^0x[0-9a-f]+$/i.test(j.result ?? ''), `${name}: malformed balance`); answered.push(name);
    }
    const sol = await rpc(BALANCE_HOSTS.solana, {jsonrpc: '2.0', id: 1, method: 'getBalance', params: [PUBLIC_ADDRESSES.solana]});
    need(Number.isInteger(sol.result?.value) && sol.result.value >= 0, 'Solana: malformed balance'); answered.push('Solana');
    const btc = await get(`${BALANCE_HOSTS.bitcoin}/api/address/${PUBLIC_ADDRESSES.bitcoin}`);
    need(Number.isInteger(btc.chain_stats?.funded_txo_sum) && btc.chain_stats.funded_txo_sum >= 0, 'Bitcoin: malformed address'); answered.push('Bitcoin');
    return {asOf: at4, detail: `${answered.length} hosts answered well-formed balances (${answered.join(', ')})`};
  });
  return {results, exitCode: results.every(r => r.ok) ? 0 : 1};
}
/** The balance hosts the app reads browser-direct (apps/web/lib/wallets/balances/chains.ts, the CSP's nine), and one public,
 *  non-personal address for each kind: Cosmos Hub's distribution module account, the EVM burn address, Solana's vote
 *  program, Bitcoin's genesis address. */
export const BALANCE_HOSTS = Object.freeze({
  cosmosHub: 'https://cosmos-rest.publicnode.com',
  evm: Object.freeze({Ethereum: 'https://ethereum-rpc.publicnode.com', Arbitrum: 'https://arbitrum-one-rpc.publicnode.com', Base: 'https://base-rpc.publicnode.com', 'OP Mainnet': 'https://optimism-rpc.publicnode.com', Polygon: 'https://polygon-bor-rpc.publicnode.com', 'BNB Chain': 'https://bsc-rpc.publicnode.com'}),
  solana: 'https://solana-rpc.publicnode.com',
  bitcoin: 'https://mempool.space',
});
export const PUBLIC_ADDRESSES = Object.freeze({cosmosHub: 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl', evm: '0x000000000000000000000000000000000000dEaD', solana: 'Vote111111111111111111111111111111111111111', bitcoin: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'});

/** Wraps the network so every request and answer is kept (large yields bodies cut to their ZIGChain rows), for --record. */
export function recording(fetcher) {
  const requests = [];
  const record = async (url, init) => {
    const response = await fetcher(url, init), body = await response.text();
    let kept = body;
    if (url === 'https://yields.llama.fi/pools' && response.ok) { const j = JSON.parse(body); kept = JSON.stringify({status: j.status, data: [...j.data.filter(r => r.chain !== 'ZIGChain').slice(0, 3), ...j.data.filter(r => r.chain === 'ZIGChain')]}); }
    if (url.startsWith('https://api.llama.fi/protocol/') && response.ok) { const j = JSON.parse(body); kept = JSON.stringify({name: j.name, currentChainTvls: j.currentChainTvls, hacks: j.hacks}); }
    if (url.startsWith('https://api.rampnetwork.com/') && response.ok) { const j = JSON.parse(body); kept = JSON.stringify({currencyCode: j.currencyCode, minFeePercent: j.minFeePercent, maxFeePercent: j.maxFeePercent, minFeeAmount: j.minFeeAmount, minPurchaseAmount: j.minPurchaseAmount, maxPurchaseAmount: j.maxPurchaseAmount, assets: j.assets.filter(a => ['COSMOS_ATOM', 'ETH_ETH', 'ETH_USDC'].includes(`${a.chain}_${a.symbol}`.toUpperCase()))}); }
    requests.push({url, height: init.headers?.['x-cosmos-block-height'] ?? null, status: response.status, responseHeight: response.headers.get('x-cosmos-block-height'), body: kept});
    const headers = new Headers({'content-type': 'application/json'}); const h = response.headers.get('x-cosmos-block-height'); if (h) headers.set('x-cosmos-block-height', h);
    return new Response(body, {status: response.status, headers});
  };
  return {fetcher: record, requests};
}
/** Replays a recorded run: a request is answered only when the record holds that exact URL with the same block height. */
export function replay(recorded, override) {
  return Object.assign(async (url, init) => {
    const height = init.headers?.['x-cosmos-block-height'] ?? null;
    const hit = recorded.requests.find(r => r.url === url && r.height === height);
    const changed = override?.(url, hit);
    if (changed) return changed;
    if (!hit) throw new TypeError(`no recorded answer for ${url}`);
    const headers = new Headers({'content-type': 'application/json'}); if (hit.responseHeight) headers.set('x-cosmos-block-height', hit.responseHeight);
    return new Response(hit.body, {status: hit.status, headers});
  }, {recordedAt: recorded.recordedAt});
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const at = process.argv.indexOf('--record'), out = at > 0 ? process.argv[at + 1] : null;
  if (at > 0 && !/^scripts\/earn\/fixtures\/live-check-\d{4}-\d{2}-\d{2}\.json$/.test(out ?? '')) { console.error('--record needs scripts/earn/fixtures/live-check-<date>.json'); process.exit(2); }
  const rec = out ? recording((url, init) => fetch(url, init)) : null;
  console.log(`Earn live check, read-only, started ${new Date().toISOString()}`);
  const {results, exitCode} = await liveCheck({fetcher: rec?.fetcher, log: line => console.log(line)});
  if (rec) writeFileSync(out, JSON.stringify({version: 1, recordedAt: new Date().toISOString(), note: 'One real run of scripts/earn/live-check.mjs (plain GETs and read-only balance JSON-RPC calls); DefiLlama and Ramp bodies cut to the fields the check reads.', requests: rec.requests}) + '\n');
  console.log(`${results.filter(r => r.ok).length} of ${results.length} checks passed; ${results.filter(r => r.flag).length} flagged. Exit ${exitCode}.`);
  process.exit(exitCode);
}
