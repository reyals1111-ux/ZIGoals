import type {EarnFamily, FamilyData, LiveState} from './client';
import {REASON_WORDS, type UnavailableReason} from './live/envelope';
import {aprAtCommission} from './apr';
import {aprAgreement} from './live/measured.mjs';
import {bps, decimal, duration, pct, pctShort, tokenAmount, usd, zig} from './format';
import {VAULT_IDS} from './live/types';

/**
 * Session AF (L4, ADR-028 H69): the device-side Earn snapshot ZIGi quotes from. The Earn page and the Staking page's
 * preview read Earn's live families (components/earn/use-earn-live.ts); each answer they show, good or unavailable, is
 * written here as the figures the page states, each with its source and "as of", made with the Earn page's own
 * formatters and formulas (lib/earn/format.ts, lib/earn/apr.ts, lib/earn/live/measured.mjs), so a figure ZIGi quotes is
 * the page's figure, never one ZIGi computed. Nothing here fetches anything; ZIGi's code never fetches an Earn number.
 *
 * Kept in memory only, for this tab's visit, like the page's own last answer: never stored, never sent. A family never
 * read in this visit is "not read yet"; a family that failed is "unavailable" with the route's reason in plain words.
 * Public figures only (rates, fees, times, pool and vault figures); no address, balance or position of the person.
 */
export type SnapshotFigure = {id: string; option: string; label: string; value: string; source: string; asOf: string};
export type SnapshotFamily =
  | {family: EarnFamily; status: 'ok'; source: string; asOf: string; stale: boolean; height?: string}
  | {family: EarnFamily; status: 'unavailable'; reason: string; words: string; at: string; source?: string};
export type SnapshotValidator = {operator: string; moniker: string; commission: string; jailed: boolean; status: string};
export type EarnSnapshot = {families: Partial<Record<EarnFamily, SnapshotFamily>>; figures: readonly SnapshotFigure[]; validators: readonly SnapshotValidator[]; disagree: boolean; updatedAt: string | null};
const EMPTY: EarnSnapshot = Object.freeze({families: {}, figures: [], validators: [], disagree: false, updatedAt: null});
const answers: Partial<{[F in EarnFamily]: LiveState<FamilyData[F]>}> = {};
let current: EarnSnapshot = EMPTY;
const listeners = new Set<() => void>();
const safe = <T,>(make: () => T): T | null => { try { return make(); } catch { return null; } };
const words = (reason: string) => (REASON_WORDS as Record<string, string>)[reason] ?? (reason === 'NOT_IN_THIS_BUILD' ? 'this build does not have this reading yet' : 'the source did not answer just now');

function figuresOf(): {figures: SnapshotFigure[]; validators: SnapshotValidator[]; disagree: boolean} {
  const out: SnapshotFigure[] = [], push = (f: Omit<SnapshotFigure, 'value'> & {value: string | null}) => { if (f.value) out.push(f as SnapshotFigure); };
  let disagree = false;
  const chain = answers.chain?.phase === 'ok' ? answers.chain.answer : null;
  if (chain) {
    const d = chain.data, source = chain.source.name, asOf = chain.observedAt ?? chain.fetchedAt;
    push({id: 'native-apr-before-commission', option: 'native-staking', label: 'Native staking: the issuance figure before any validator commission (a simple yearly rate, APR)', value: safe(() => pct(d.apr.beforeCommission)), source, asOf});
    push({id: 'native-unbonding', option: 'native-staking', label: 'Unbonding time on ZIGChain (how long unstaked ZIG stays locked)', value: safe(() => duration(d.staking.unbondingSeconds)), source, asOf});
    push({id: 'native-community-tax', option: 'native-staking', label: 'Community tax on staking rewards', value: safe(() => pct(d.distribution.communityTax)), source, asOf});
    push({id: 'native-min-commission', option: 'native-staking', label: 'The lowest commission a validator may charge', value: safe(() => pct(d.staking.minCommissionRate)), source, asOf});
    push({id: 'native-bonded-share', option: 'native-staking', label: 'Share of all ZIG that is staked', value: safe(() => pct(d.staking.bondedShare)), source, asOf});
    push({id: 'native-slash-downtime', option: 'native-staking', label: 'Slashing for a validator offline too long (share of the stake behind it)', value: safe(() => pctShort(d.slashing.slashFractionDowntime)), source, asOf});
    push({id: 'native-slash-double-sign', option: 'native-staking', label: 'Slashing for a validator that signs two blocks (share of the stake behind it)', value: safe(() => pctShort(d.slashing.slashFractionDoubleSign)), source, asOf});
  }
  const measured = answers.measured?.phase === 'ok' ? answers.measured.answer : null;
  if (measured && measured.data.measured.status === 'ok') {
    const m = measured.data, source = measured.source.name, asOf = measured.observedAt ?? measured.fetchedAt, commission = safe(() => pctShort(m.validator.commission)) ?? 'its';
    const rate = m.measured.status === 'ok' ? m.measured.rate : null;
    push({id: 'native-apr-measured', option: 'native-staking', label: `Native staking: the measured figure, what ${m.validator.moniker}’s own stake earned over the last ${safe(() => decimal(m.measured.status === 'ok' ? m.measured.windowBlocks : '10000', 0)) ?? '10,000'} blocks, at its ${commission} commission (APR)`, value: rate ? safe(() => pct(rate)) : null, source, asOf});
    if (chain && rate) {
      const issuance = safe(() => aprAtCommission(chain.data.apr, m.validator.commission));
      push({id: 'native-apr-issuance-at-measured', option: 'native-staking', label: `Native staking: the issuance figure at the same ${commission} commission (APR)`, value: issuance ? safe(() => pct(issuance)) : null, source: chain.source.name, asOf: chain.observedAt ?? chain.fetchedAt});
      disagree = issuance ? safe(() => aprAgreement(issuance, rate).disagree) ?? false : false;
    }
  }
  const valdora = answers.valdora?.phase === 'ok' ? answers.valdora.answer : null;
  if (valdora) {
    const v = valdora.data, source = valdora.source.name, asOf = valdora.observedAt ?? valdora.fetchedAt;
    push({id: 'valdora-fee', option: 'valdora', label: 'Valdora’s fee on staking rewards', value: safe(() => pct(v.feeOfRewards)), source, asOf});
    push({id: 'valdora-min-deposit', option: 'valdora', label: 'Valdora’s smallest deposit', value: safe(() => zig(v.minDepositAzig)), source, asOf});
    push({id: 'valdora-paused', option: 'valdora', label: 'Valdora’s staking contract', value: v.paused || v.emergencyMode ? 'paused' : 'open', source, asOf});
    if (v.rate.status === 'ok') push({id: 'valdora-rate', option: 'valdora', label: 'ZIG one stZIG is worth, as Valdora’s contract reports it', value: safe(() => decimal(v.rate.status === 'ok' ? v.rate.zigPerStZig : '0', 4)), source, asOf});
  }
  const oroswap = answers.oroswap?.phase === 'ok' ? answers.oroswap.answer : null;
  if (oroswap) {
    const source = oroswap.source.name, asOf = oroswap.observedAt ?? oroswap.fetchedAt;
    for (const pool of oroswap.data.pools.slice(0, 8)) push({id: `oroswap-fee-${pool.id}`, option: 'oroswap', label: `Swap fee in OroSwap’s ${pool.label} pool`, value: safe(() => bps(pool.feeBps)), source, asOf});
    push({id: 'oroswap-farms', option: 'oroswap', label: 'OroSwap farms (extra rewards for pools)', value: oroswap.data.farms.active ? `on for ${oroswap.data.farms.activePools} pools` : 'off', source, asOf});
  }
  const vaults = answers.vaults?.phase === 'ok' ? answers.vaults.answer : null;
  if (vaults) {
    const source = vaults.source.name, asOf = vaults.observedAt ?? vaults.fetchedAt;
    for (const id of VAULT_IDS) { const row = vaults.data.vaults[id]; if (row?.status === 'ok') push({id: `vault-aum-${id}`, option: row.operator === 'nawa' ? 'nawa' : 'valdora-vaults', label: `Held in the ${row.label} vault (${row.asset})${row.paused ? ', paused' : ''}`, value: safe(() => tokenAmount(row.aumUnits, row.decimals, 'USDC', {compact: true})), source, asOf}); }
  }
  const llama = answers.defillama?.phase === 'ok' ? answers.defillama.answer : null;
  if (llama) {
    const asOf = llama.observedAt ?? llama.fetchedAt, source = `${llama.source.name} (a third party’s reading)`;
    for (const [slug, p] of Object.entries(llama.data.protocols)) if (p.status === 'ok' && p.tvlUsd !== null) push({id: `defillama-tvl-${slug}`, option: slug, label: `Value locked in ${p.name}, as DefiLlama reads it`, value: safe(() => usd(p.tvlUsd!)), source, asOf});
    if (llama.data.pools.status === 'ok') for (const row of llama.data.pools.rows.slice(0, 8)) if (row.apy !== null) push({id: `defillama-apy-${row.pool}`, option: row.project, label: `Yearly yield DefiLlama reads for the ${row.label ?? row.symbol} pool (APY, a third party’s reading)`, value: `${decimal(String(row.apy), 2)} %`, source, asOf});
  }
  const validators = answers.validators?.phase === 'ok' ? answers.validators.answer.data.validators.map(v => ({operator: v.operator, moniker: v.moniker.slice(0, 120), commission: safe(() => pctShort(String(v.commission.rate))) ?? '', jailed: v.jailed, status: v.status})) : [];
  return {figures: out, validators, disagree};
}
function rebuild(at: string) {
  const families: EarnSnapshot['families'] = {};
  for (const [family, state] of Object.entries(answers) as [EarnFamily, LiveState<unknown>][]) {
    if (state.phase === 'ok') families[family] = {family, status: 'ok', source: state.answer.source.name, asOf: state.answer.observedAt ?? state.answer.fetchedAt, stale: state.answer.stale, ...(state.answer.height ? {height: state.answer.height} : {})};
    else if (state.phase === 'unavailable') families[family] = {family, status: 'unavailable', reason: state.reason, words: words(state.reason), at, ...(state.source ? {source: state.source.name} : {})};
  }
  current = {families, ...figuresOf(), updatedAt: at};
  for (const listener of listeners) { try { listener(); } catch { /* a reader's own problem */ } }
}
/** Called by the Earn page's live hook with each answer it shows; returns the answer unchanged. A loading state is not kept. */
export function recordEarnSnapshot<T extends LiveState<unknown>>(family: EarnFamily, state: T): T {
  if (state.phase === 'loading') return state;
  (answers as Record<string, unknown>)[family] = state;
  rebuild(new Date().toISOString());
  return state;
}
/** What ZIGi may quote right now (an empty snapshot until the Earn or Staking page has read something in this visit). */
export const earnSnapshot = (): EarnSnapshot => current;
export function subscribeEarnSnapshot(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** For tests: forget everything read. */
export function resetEarnSnapshot(): void { for (const key of Object.keys(answers)) delete (answers as Record<string, unknown>)[key]; current = EMPTY; }
/** The unavailable reasons in plain words, for ZIGi's own sentences. */
export const snapshotReasonWords = (reason: UnavailableReason | string): string => words(reason);
