'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {explorerLinksFor} from '@zigoals/ecosystem-registry/links';
import type {Position} from '../../lib/positions';
import {STAKING_JOURNAL, stakingEntriesOf} from '../../lib/staking/journal';
import {shortAddress} from '../../lib/staking/address';
import {zigText} from '../../lib/staking/view';
import {claimableOf, priceOnDay, rewardsByMonth, rewardsCsv, rewardsCsvName, rewardsHistory, unbondingCalendar, unbondingEvents, unbondingIcs, unbondingIcsName, valueOnDay} from '../../lib/zigchain-eco/staking-clarity';
import {fetchPublicMarketHistory, type HistoryPoint} from '../../lib/market-history';
import {formatDate, formatDateTime, formatMonth, formatNumber} from '../../lib/visual-format';
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
  // Session AL fourth pass (C-DVG-69): ZIG's USD price on each claim's day, from CoinGecko's daily history through the
  // app's market route, read once while a real-network claim or reward is listed. Unknown stays unknown.
  const realRows = history.some(h => !h.practice) || claimable.some(c => c.network !== PRACTICE);
  const [prices, setPrices] = useState<{phase: 'idle' | 'reading' | 'unavailable'} | {phase: 'ok'; points: readonly HistoryPoint[]}>({phase: 'idle'});
  useEffect(() => {
    if (!realRows || prices.phase !== 'idle') return;
    setPrices({phase: 'reading'});
    fetchPublicMarketHistory({marketRef: {provider: 'coingecko', kind: 'coin', id: 'zigchain'}, currency: 'USD', range: '1y'})
      .then(r => setPrices(r.history ? {phase: 'ok', points: r.history.points} : {phase: 'unavailable'}), () => setPrices({phase: 'unavailable'}));
  }, [realRows, prices.phase]);
  const priceAt = (at: string) => prices.phase === 'ok' ? priceOnDay(prices.points, at) : null;
  const months = useMemo(() => rewardsByMonth(history, now), [history, now]);
  const save = (text: string, type: string, name: string) => {
    const blob = new Blob([text], {type});
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const download = () => save(rewardsCsv(history, claimable, now, priceAt), 'text/csv;charset=utf-8', rewardsCsvName(now));
  // Session AL fourth pass (C-DVG-68): the unbonding dates as a calendar file with a 09:00 reminder on each day.
  const remind = () => save(unbondingIcs(days, new Date(now)), 'text/calendar;charset=utf-8', unbondingIcsName(now));
  const dayPrice = (at: string, amount: string | null) => {
    if (prices.phase === 'reading' || prices.phase === 'idle') return 'ZIG’s price that day: reading…';
    const p = priceAt(at);
    if (p === null) return 'ZIG’s price that day: unknown (CoinGecko’s history has no point for it)';
    const v = valueOnDay(amount, p);
    return `ZIG was ${formatNumber(p, {style: 'currency', currency: 'USD', maximumFractionDigits: 4})} that day (CoinGecko)${v !== null ? `, so about ${formatNumber(v, {style: 'currency', currency: 'USD'})}` : ''}`;
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
        {days.length > 0 && <p className="zeco-actions"><button type="button" className="secondary" onClick={remind}>Add a reminder to your calendar</button> <span className="fine">A calendar file (.ics) with each day and a reminder at 09:00, made on this device. They are on your <Link className="text-link" href="/app/agenda">Agenda</Link> too.</span></p>}
      </article>
      <article className="zeco-card" aria-labelledby="zeco-history-title">
        <h3 id="zeco-history-title">Rewards you claimed here</h3>
        {!journal.loaded ? <ZgSkeleton label="Reading your staking history…" lines={2}/> : journal.unreadable ? <p className="fine">Your staking history could not be read on this device.</p>
          : !history.length ? <p className="fine">Claims you sign through ZIGoals on this device appear here.</p>
          : <ul className="zeco-list">{history.slice(0, 10).map(h => { const link = h.hash ? explorerLinksFor(h.network, 'transaction', h.hash)[0] : undefined; return <li key={`${h.at}:${h.hash ?? ''}`}>
            <span><strong>{h.action === 'sweep' ? 'Claimed and restaked' : 'Claimed'}</strong> · <time dateTime={h.at}>{formatDate(h.at)}</time>{tag(h.network)}</span>
            <span className="fine">{h.amount ? zigText(h.amount) : 'The amount is in the transaction'} · {h.validators.length} validator{h.validators.length === 1 ? '' : 's'}{link ? <> · <a href={link.url} target="_blank" rel="noopener noreferrer">Check it on {link.name} ↗</a></> : null}</span>
            {!h.practice && <span className="fine">{dayPrice(h.at, h.amount)}</span>}
          </li>; })}</ul>}
        {history.some(h => !h.practice) && <RewardsChart months={months}/>}
      </article>
    </div>
    <div className="zeco-actions">
      <button type="button" className="secondary" onClick={download} disabled={!history.length && !claimable.length}>Download rewards as CSV</button>
      <span className="fine">Information only, for your own records: not a tax statement.</span>
    </div>
  </section>;
}
/**
 * Session AL fourth pass (C-BN-03): the rewards claimed through ZIGoals by month, real network only, as small bars with
 * the same figures in words. A claim whose amount is only in its transaction is counted beside the bar, never drawn as 0.
 */
function RewardsChart({months}: {months: ReturnType<typeof rewardsByMonth>}) {
  const max = Math.max(0, ...months.map(m => m.zig)), label = (m: string) => formatMonth(m, {timeZone: 'UTC'});
  return <figure className="zeco-chart">
    <figcaption>Claimed through ZIGoals, by month (real network)</figcaption>
    <ol className="zeco-bars">{months.map(m => <li key={m.month}>
      <span className="zeco-bar" aria-hidden="true"><i style={{height: max > 0 ? `${Math.max(m.zig > 0 ? 4 : 0, (m.zig / max) * 100)}%` : '0%'}}/></span>
      <span className="zeco-bar-label">{label(m.month)}</span>
      <span className="zeco-bar-value">{m.known ? `${formatNumber(m.zig, {maximumFractionDigits: 2})} ZIG` : m.inTransaction ? '—' : '0'}{m.inTransaction ? ` · ${m.inTransaction} in the transaction` : ''}</span>
    </li>)}</ol>
    <p className="fine">Only claims signed through ZIGoals on this device. A claim records its amount in its transaction, not here, so it counts beside its month instead of as 0.</p>
  </figure>;
}
export default StakingClarity;
