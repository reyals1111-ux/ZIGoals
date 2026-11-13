'use client';
import {useEffect, useRef, type ReactNode} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {usePortfolios} from '../portfolio/use-portfolios';
import {ShowcaseTag} from '../ui/showcase-tag';
import {formatUnits} from '@zigoals/chain-config';
import {isShowcase} from '../../lib/showcase-storage';
import {localDate} from '../../lib/local-date';
import {referenceQuote} from '../../lib/product-insights';
import type {MarketQuote} from '../../lib/market-quotes';
import type {Accounts} from '../../lib/accounts/schema';
import {coinKey, type PortfolioCurrency} from '../../lib/portfolio/schema';
import {WALLET_NAMES} from '../../lib/staking/tracked-wallets';
import {NETWORTH_HISTORY, SOURCE_LABELS, drawnRuns, gapDays, seriesLines, snapshotOf, withSnapshot, wouldRecord, type SeriesLine, type SeriesPoint, type WealthRowInput} from '../../lib/networth-history';
import {formatDate, formatDateTime, formatMoney} from '../../lib/visual-format';
import './networth-history.css';

/**
 * Session AO (Part 5, backlog #11; ADR-039 owner rule 2): net worth by source, inside Wealth's "Your wealth over time".
 * Opening Wealth records today's snapshot once its records and prices have loaded (lib/networth-history.ts snapshotOf),
 * only when it differs from what today already holds, never for a past day and never in the Showcase (whose labelled
 * example history is in the tab's own storage). Each source and currency is its own line; a line is drawn only between
 * neighbouring recorded days with a value, so a day not opened, or a day with no value, is a gap.
 */
type Props = {rows: readonly WealthRowInput[]; accounts: {data: Accounts; loaded: boolean; unreadable: boolean}; quotes: readonly MarketQuote[]; now: number; ready: boolean; showcase: boolean};
const moneyOf = (value: string, currency: string) => { const text = formatMoney(value, currency); return text === 'Unavailable' ? `${value} ${currency}` : text; };
const asOfText = (asOf: string | null) => !asOf ? 'as-of time unknown' : /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? `balances as of ${formatDate(asOf)}` : `as of ${formatDateTime(asOf)}`;
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

export function NetworthHistory({rows, accounts, quotes, now, ready, showcase}: Props) {
  const history = useDeviceRecord(NETWORTH_HISTORY), portfolios = usePortfolios(), names = useDeviceRecord(WALLET_NAMES);
  // `ready`: the prices have been read (the market clock `now` is set), so a snapshot never records a price still loading.
  const canRecord = ready && now > 0 && !showcase && history.loaded && !history.unreadable && accounts.loaded && !accounts.unreadable && portfolios.loaded && !portfolios.unreadable && !portfolios.showcase && names.loaded;
  const day = localDate();
  const entry = canRecord ? snapshotOf({day, at: new Date(now).toISOString(), wealthRows: rows, accounts: accounts.data, portfolios: portfolios.data, walletNames: names.unreadable ? undefined : names.data,
    portfolioPrice: (key: string, currency: PortfolioCurrency) => {
      const ref = portfolios.data.portfolios.flatMap(p => p.coins).find(c => coinKey(c.ref) === key)?.ref;
      const quote = ref ? referenceQuote(ref, currency, quotes, now) : undefined;
      return quote ? {value: formatUnits(quote.price, quote.priceDecimals), at: quote.observedAt ?? quote.fetchedAt} : undefined;
    }}) : null;
  // The figures, not the moment: a re-render with the same figures writes nothing.
  const recordKey = entry ? `${entry.day}|${JSON.stringify(entry.sources)}` : '';
  const latest = useRef(entry);
  useEffect(() => { latest.current = entry; });
  const update = history.update;
  useEffect(() => {
    const next = latest.current;
    if (!recordKey || !next || isShowcase()) return;
    try { if (wouldRecord(history.data, next)) update(h => withSnapshot(h, next)); } catch { /* storage refused: tried again the next time Wealth opens */ }
  }, [recordKey, history.data, update]);

  const lines = seriesLines(history.data), first = history.data.days[0], gaps = gapDays(history.data), example = !!history.data.example;
  return <section className="networth-history" aria-labelledby="networth-history-title">
    <h3 id="networth-history-title">Net worth by source</h3>
    {example && <p className="fine"><ShowcaseTag/>Fictional example history, kept in this Showcase tab and never mixed with your own records.</p>}
    {history.unreadable ? <p role="alert">The recorded history on this device could not be read. It has not been changed, and nothing new is recorded until it reads again.</p>
      : !first ? <p className="picker-mode-note">Recording starts today. A day is recorded each day you open Wealth; days you do not open stay empty and are never filled in.</p>
      : <>
        <p className="networth-history-since"><strong>Recorded since {formatDate(first.day)}</strong> · {history.data.days.length} {history.data.days.length === 1 ? 'day' : 'days'} recorded{gaps > 0 && <> · {gaps} {gaps === 1 ? 'day' : 'days'} not opened, shown as gaps</>}</p>
        <p className="fine">A day is recorded when you open Wealth, never filled in afterwards. Each source and currency stands on its own: nothing is converted or added up (tracked wallets are also part of Wealth holdings).</p>
        <div className="networth-history-grid">{lines.map(line => <SeriesCard key={`${line.source}:${line.currency}`} line={line} from={first.day} to={history.data.days.at(-1)!.day}/>)}</div>
      </>}
  </section>;
}

function SeriesCard({line, from, to}: {line: SeriesLine; from: string; to: string}) {
  const last = line.points.at(-1)!, label = `${SOURCE_LABELS[line.source]} · ${line.currency}`;
  return <article className="networth-series">
    <h4>{label}</h4>
    <p className="networth-series-latest">{last.value === null ? <span>No value on {formatDate(last.day)}</span> : <strong data-private-amount>{moneyOf(last.value, line.currency)}</strong>} <small>{formatDate(last.day)} · {asOfText(last.asOf)}</small></p>
    {last.value === null && last.missing && <p className="networth-series-missing">No value: {last.missing.join(', ')}</p>}
    <Spark line={line} from={from} to={to} label={label}/>
    <details className="networth-series-days"><summary>Recorded days</summary><DayTable line={line}/></details>
  </article>;
}

const W = 320, H = 80, PAD = 6;
function Spark({line, from, to, label}: {line: SeriesLine; from: string; to: string; label: string}) {
  const known = line.points.filter(p => p.value !== null).map(p => Number(p.value));
  const lo = known.length ? Math.min(...known) : 0, hi = known.length ? Math.max(...known) : 1, span = hi - lo || Math.abs(hi) || 1;
  const d0 = dayNumber(from), days = Math.max(1, dayNumber(to) - d0);
  const x = (p: SeriesPoint) => PAD + (dayNumber(p.day) - d0) / days * (W - 2 * PAD), y = (p: SeriesPoint) => H - PAD - (Number(p.value) - (hi === lo ? lo - span / 2 : lo)) / span * (H - 2 * PAD);
  const runs = drawnRuns(line.points), unknown = line.points.filter(p => p.value === null);
  const summary = `${label}: ${line.points.length} recorded ${line.points.length === 1 ? 'day' : 'days'} from ${formatDate(line.points[0]!.day)}${unknown.length ? `, ${unknown.length} without a value` : ''}. Days not recorded are gaps. Every day is listed under Recorded days.`;
  return <svg className="networth-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} preserveAspectRatio="none">
    <line x1={PAD} x2={W - PAD} y1={H - 1} y2={H - 1} className="networth-spark-base"/>
    {runs.map(run => run.length > 1 ? <polyline key={run[0]!.day} points={run.map(p => `${x(p).toFixed(1)},${y(p).toFixed(1)}`).join(' ')} className="networth-spark-line"/> : <circle key={run[0]!.day} cx={x(run[0]!)} cy={y(run[0]!)} r={2.5} className="networth-spark-dot"/>)}
    {unknown.map(p => <rect key={p.day} x={x(p) - 1.5} y={H - 9} width={3} height={8} className="networth-spark-unknown"/>)}
  </svg>;
}

function DayTable({line}: {line: SeriesLine}) {
  const shown = line.points.slice(-31), rows: ReactNode[] = [];
  shown.forEach((p, i) => {
    const prev = shown[i - 1], skipped = prev ? dayNumber(p.day) - dayNumber(prev.day) - 1 : 0;
    if (skipped > 0) rows.push(<tr key={`gap-${p.day}`} className="networth-gap-row"><td colSpan={3}>{skipped} {skipped === 1 ? 'day' : 'days'} not recorded</td></tr>);
    rows.push(<tr key={p.day}><th scope="row">{formatDate(p.day)}</th><td data-private-amount>{p.value === null ? `No value: ${(p.missing ?? []).join(', ')}` : moneyOf(p.value, line.currency)}</td><td>{asOfText(p.asOf)}</td></tr>);
  });
  return <table className="networth-days"><caption className="fine">{line.points.length > shown.length ? `The last ${shown.length} of ${line.points.length} recorded days` : `${line.points.length} recorded ${line.points.length === 1 ? 'day' : 'days'}`}, newest last</caption>
    <thead><tr><th scope="col">Day</th><th scope="col">Value</th><th scope="col">As of</th></tr></thead><tbody>{rows}</tbody></table>;
}
