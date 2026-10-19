'use client';
import {useMemo, useState} from 'react';
import type {LiveState, Validator, ValidatorsAnswer} from '../../lib/earn/client';
import {formatNumber} from '../../lib/visual-format';
import {zig} from '../../lib/earn/format';
import {VerifiedLink} from '../links/verified-link';
import {SourceLine, Unavailable} from './live-figure';
import {SectionHeading} from '../ui/section-heading';

/**
 * Session AF (L1): the validators of ZIGChain mainnet, live from GET /api/chain/validators (lane L2a's route; until it is
 * in this build the section says so). Filters and sorts work on facts only (active, jailed, commission, voting power,
 * uptime), never on an "expected return". A validator's own website is shown as text, never a link (it is unchecked
 * chain data); the one outgoing link is ZIGScan's validator list from the verified registry.
 */
type Sort = 'power' | 'commission' | 'uptime';
const share = (n: number, digits = 1) => `${formatNumber(n * 100, {maximumFractionDigits: digits})} %`;
export function foundationShare(validators: readonly Validator[]): number | null {
  const named = validators.filter(v => v.status === 'bonded' && /foundation/i.test(v.moniker));
  return named.length ? named.reduce((n, v) => n + v.votingPowerShare, 0) : null;
}
export function filterValidators(list: readonly Validator[], {active, hideJailed, maxCommission, sort}: {active: boolean; hideJailed: boolean; maxCommission: number | null; sort: Sort}): Validator[] {
  const out = list.filter(v => (!active || v.status === 'bonded') && (!hideJailed || !v.jailed) && (maxCommission === null || v.commission.rate <= maxCommission + 1e-12));
  const key: Record<Sort, (v: Validator) => number> = {power: v => -v.votingPowerShare, commission: v => v.commission.rate, uptime: v => -(v.uptime?.signedShare ?? -1)};
  return out.sort((a, b) => key[sort](a) - key[sort](b) || a.moniker.localeCompare(b.moniker));
}
export function ValidatorsSection({validators, now}: {validators: LiveState<ValidatorsAnswer>; now: number}) {
  const [active, setActive] = useState(true), [hideJailed, setHideJailed] = useState(true), [maxCommission, setMax] = useState<number | null>(null), [sort, setSort] = useState<Sort>('power');
  const list = useMemo(() => validators.phase === 'ok' ? validators.answer.data.validators : [], [validators]);
  const rates = useMemo(() => [...new Set(list.filter(v => v.status === 'bonded').map(v => v.commission.rate))].sort((a, b) => a - b), [list]);
  const rows = useMemo(() => filterValidators(list, {active, hideJailed, maxCommission, sort}), [list, active, hideJailed, maxCommission, sort]);
  const foundation = foundationShare(list), jailed = list.filter(v => v.jailed).length;
  return <section id="validators" className="earn-validators panel" aria-labelledby="validators-title">
    <SectionHeading id="validators-title" eyebrow="Native staking · who you delegate to" title="Choose a validator from facts"
      lede="A validator runs part of ZIGChain and keeps a commission from the rewards of the ZIG delegated to it. Your ZIG never leaves your account."/>
    <div className="earn-guidance" role="note">
      <h3 className="earn-subhead">In plain words</h3>
      <ul>
        <li><b>Spread the stake.</b> {foundation !== null ? <>Validators named “Foundation” hold {share(foundation)} of all stake right now.</> : validators.phase === 'ok' ? null : <>Who holds how much is <Unavailable reason={validators.phase === 'unavailable' ? validators.reason : 'UPSTREAM_DOWN'} short/>.</>} Delegating to a smaller validator helps keep the network in many hands.</li>
        <li><b>Avoid jailed validators.</b> A jailed validator earns nothing for you until it is back.{validators.phase === 'ok' ? jailed ? ` ${jailed} ${jailed === 1 ? 'is' : 'are'} jailed now.` : ' None is jailed now.' : ''}</li>
        <li><b>Mind the commission.</b> A lower commission leaves you more of the reward; it can change, up to the validator’s own limit per day.</li>
        <li><b>Look at uptime.</b> A validator that misses many blocks can be paused, and then its delegators earn nothing for a while.</li>
      </ul>
    </div>
    {validators.phase === 'loading' ? <p className="earn-reading" aria-busy="true">Reading the validators…</p>
      : validators.phase === 'unavailable' ? <p className="earn-figure" data-live-figure="validators" data-state="unavailable" data-reason={validators.reason}>The validator list is <Unavailable reason={validators.reason}/>.</p>
      : <>
        <form className="earn-filters" onSubmit={e => e.preventDefault()} aria-label="Filter and sort validators">
          <label className="earn-check"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}/><span>Active only</span></label>
          <label className="earn-check"><input type="checkbox" checked={hideJailed} onChange={e => setHideJailed(e.target.checked)}/><span>Hide jailed</span></label>
          <label className="earn-select"><span>Commission at most</span><select value={maxCommission === null ? '' : String(maxCommission)} onChange={e => setMax(e.target.value === '' ? null : Number(e.target.value))}><option value="">Any</option>{rates.map(r => <option key={r} value={String(r)}>{share(r, 2)}</option>)}</select></label>
          <label className="earn-select"><span>Sort by</span><select value={sort} onChange={e => setSort(e.target.value as Sort)}><option value="power">Most voting power</option><option value="commission">Lowest commission</option><option value="uptime">Best uptime</option></select></label>
        </form>
        {/* Session AF chunk 2: the figure is the list with its count and its source line, so the source sits inside it (verifier stage 9). */}
        <div className="earn-validators-live" data-live-figure="validators" data-state="ok">
        <p className="earn-count" aria-live="polite">{rows.length} of {list.length} validators shown</p>
        <div className="earn-table-wrap" role="region" aria-label="Validators" tabIndex={0}>
          <table className="earn-table">
            <thead><tr><th scope="col">Validator</th><th scope="col">Commission</th><th scope="col">Voting power</th><th scope="col">Uptime</th><th scope="col">Self-bond</th><th scope="col">Status</th></tr></thead>
            <tbody>{rows.map(v => <tr key={v.operator} data-validator={v.operator}>
              <th scope="row" data-label="Validator"><span className="earn-moniker">{v.moniker || 'Unnamed validator'}</span>{v.website ? <span className="earn-website" title="The validator’s own website, as it wrote it on the chain. Not checked by ZIGoals.">{v.website.slice(0, 80)}</span> : null}</th>
              <td data-label="Commission">{share(v.commission.rate, 2)}<small> · max {share(v.commission.maxRate, 0)}</small></td>
              <td data-label="Voting power">{share(v.votingPowerShare)}</td>
              <td data-label="Uptime">{v.uptime ? <>{share(v.uptime.signedShare, 2)}<small> · {formatNumber(v.uptime.missed)} missed of {formatNumber(v.uptime.window)}</small></> : <Unavailable reason="NOT_PUBLISHED" short/>}</td>
              <td data-label="Self-bond">{v.selfBond !== null ? zig(v.selfBond.split('.')[0]!, {compact: true}) : <Unavailable reason="NOT_PUBLISHED" short/>}</td>
              <td data-label="Status"><span className="earn-status" data-status={v.tombstoned ? 'tombstoned' : v.jailed ? 'jailed' : v.status}>{v.tombstoned ? 'Removed for good' : v.jailed ? 'Jailed' : v.status === 'bonded' ? 'Active' : v.status === 'unbonding' ? 'Leaving' : 'Inactive'}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
        <SourceLine answer={validators.answer} now={now}/>
        </div>
      </>}
    <p className="earn-validators-more"><VerifiedLink provider="zig-finance" kind="explorer-validators" className="text-link">See every validator on ZIGScan</VerifiedLink></p>
  </section>;
}
