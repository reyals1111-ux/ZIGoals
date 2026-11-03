'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {explorerLinksFor} from '@zigoals/ecosystem-registry/links';
import type {Position} from '../../lib/positions';
import {STAKING_JOURNAL, stakingEntriesOf} from '../../lib/staking/journal';
import {shortAddress} from '../../lib/staking/address';
import {zigText} from '../../lib/staking/view';
import {claimableOf, rewardsCsv, rewardsCsvName, rewardsHistory, unbondingCalendar, unbondingEvents} from '../../lib/zigchain-eco/staking-clarity';
import {formatDate, formatDateTime} from '../../lib/visual-format';
import {useDeviceRecord} from '../ai/use-device-record';
import {SectionHeading} from '../ui/section-heading';
import {LazyPillarArt} from '../illustrations/lazy-pillar-art';
import {ZgSkeleton} from '../skeleton/zg-skeleton';
import './zigchain-eco.css';

/**
 * Session AK (F4, staking clarity): for the wallets the Earn page already reads (its one read per wallet, passed in),
 * three plain answers — rewards waiting to be claimed, the unbonding calendar ("available in N days", the chain's own
 * dates) and the rewards claimed through ZIGoals on this device — plus an information-only CSV of the same. Lazy-loaded
 * by the Earn page only when a wallet is linked or connected, so the chain stays out of sight for everyone else. Nothing
 * here signs anything: "Claim" opens Staking, where the one review sheet shows every message first.
 */
export type ClarityRead = {address: string; label: string; positions: readonly Position[]};
const PRACTICE = 'zig-test-2';
export function StakingClarity({reads, now}: {reads: readonly ClarityRead[]; now: number}) {
  const journal = useDeviceRecord(STAKING_JOURNAL);
  const positions = useMemo(() => reads.flatMap(r => r.positions), [reads]);
  const claimable = useMemo(() => claimableOf(positions), [positions]);
  const days = useMemo(() => unbondingCalendar(unbondingEvents(positions, {now})), [positions, now]);
  const history = useMemo(() => journal.unreadable ? [] : rewardsHistory(stakingEntriesOf(journal.data)), [journal.data, journal.unreadable]);
  const download = () => {
    const blob = new Blob([rewardsCsv(history, claimable, now)], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = rewardsCsvName(now); a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const tag = (network: string) => network === PRACTICE ? <> <span className="zeco-practice-tag">Practice</span></> : null;
  // Nothing waiting, nothing unstaking and nothing claimed yet: the heading carries Wealth's illustration (loaded on use).
  const empty = !claimable.length && !days.length && journal.loaded && !journal.unreadable && !history.length;
  const label = (account: string) => reads.find(r => r.address === account)?.label ?? shortAddress(account);
  return <section id="staking-clarity" className="panel zeco" aria-labelledby="staking-clarity-title">
    <SectionHeading id="staking-clarity-title" eyebrow="Your staking, read from the chain" title="Rewards, unstaking and history"
      lede="What is waiting for you, when unstaked ZIG comes back, and what you claimed here. Read-only: claiming and unstaking happen on Staking, signed in your own wallet."
      action={empty ? <LazyPillarArt pillar="wealth" size={104} className="zeco-art"/> : undefined}/>
    <div className="zeco-grid">
      <article className="zeco-card" aria-labelledby="zeco-claim-title">
        <h3 id="zeco-claim-title">Waiting to be claimed</h3>
        {!claimable.length ? <p className="fine">No rewards are waiting in the wallets read here.</p>
          : <ul className="zeco-list">{claimable.map(c => <li key={`${c.network}:${c.account}`}>
            <p className="zeco-figure">{zigText(c.total)}{tag(c.network)}</p>
            <span className="fine">{label(c.account)}{c.byValidator.length ? ` · from ${c.byValidator.length} validator${c.byValidator.length === 1 ? '' : 's'}` : ''}{c.observedAt ? ` · read ${formatDateTime(c.observedAt)}` : ''}</span>
          </li>)}</ul>}
        {claimable.some(c => c.total !== '0') && <p className="zeco-actions"><Link className="secondary" href="/app/staking">Claim on Staking</Link></p>}
      </article>
      <article className="zeco-card" aria-labelledby="zeco-unbonding-title">
        <h3 id="zeco-unbonding-title">Unbonding calendar</h3>
        {!days.length ? <p className="fine">Nothing is unstaking right now. When you unstake, the ZIG comes back after the chain’s unbonding period, earning nothing meanwhile; the date shows here.</p>
          : <ol className="zeco-list">{days.map(d => <li key={d.date} className="zeco-day">
            <strong><time dateTime={d.date}>{formatDate(d.date, {weekday: true})}</time> · {zigText(d.total)}</strong>
            {d.events.map(e => <span key={e.id}>{e.amountText} from {e.validatorName}, {e.availability}{tag(e.network)}</span>)}
          </li>)}</ol>}
        {days.length > 0 && <p className="fine">Dates are the chain’s own completion times, shown in your time zone.</p>}
      </article>
      <article className="zeco-card" aria-labelledby="zeco-history-title">
        <h3 id="zeco-history-title">Rewards you claimed here</h3>
        {!journal.loaded ? <ZgSkeleton label="Reading your staking history…" lines={2}/> : journal.unreadable ? <p className="fine">Your staking history could not be read on this device.</p>
          : !history.length ? <p className="fine">Claims you sign through ZIGoals on this device appear here.</p>
          : <ul className="zeco-list">{history.slice(0, 10).map(h => { const link = h.hash ? explorerLinksFor(h.network, 'transaction', h.hash)[0] : undefined; return <li key={`${h.at}:${h.hash ?? ''}`}>
            <span><strong>{h.action === 'sweep' ? 'Claimed and restaked' : 'Claimed'}</strong> · <time dateTime={h.at}>{formatDate(h.at)}</time>{tag(h.network)}</span>
            <span className="fine">{h.amount ? zigText(h.amount) : 'The amount is in the transaction'} · {h.validators.length} validator{h.validators.length === 1 ? '' : 's'}{link ? <> · <a href={link.url} target="_blank" rel="noopener noreferrer">Check it on {link.name} ↗</a></> : null}</span>
          </li>; })}</ul>}
      </article>
    </div>
    <div className="zeco-actions">
      <button type="button" className="secondary" onClick={download} disabled={!history.length && !claimable.length}>Download rewards as CSV</button>
      <span className="fine">Information only, for your own records: not a tax statement.</span>
    </div>
  </section>;
}
export default StakingClarity;
