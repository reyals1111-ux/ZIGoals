'use client';
import {Suspense, lazy, useId, useMemo, useState} from 'react';
import {useDeviceRecord, type DeviceRecordState} from '../ai/use-device-record';
import {usePlatform} from '../platform/use-platform';
import {ACCOUNTS} from '../../lib/accounts/schema';
import {BILLS} from '../../lib/bills/schema';
import {BUDGETS} from '../../lib/budgets/schema';
import type {MoneyLog} from '../../lib/money-log/schema';
import {FORECAST_LENGTHS, MIN_HISTORY, cashForecast, forecastDays, monthLows, plannedContributions, type CurrencyForecast, type ForecastLength, type KnownForecast} from '../../lib/cash-forecast/model';
// Session AV lane 2, round 3 (money; Simplifi): planned one-off costs, and the forecast's length (60 days, 6 or 12 months).
import {MONEY_MORE} from '../../lib/money-more/schema';
import {plannedForForecast} from '../../lib/cash-forecast/planned';
import './planned.css';
const PlannedCosts = lazy(() => import('./planned-costs'));
import {localDate} from '../../lib/local-date';
import {formatDate, formatMonth} from '../../lib/visual-format';
import {centsText, moneyCents, moneyWhole} from '../wealth/money-tools/format';
import './cash-forecast.css';
// Session AV lane 2 (money): the cash until payday and the person's own low-balance line.
import PaydayLow from './payday-low';

/**
 * Session AK (BUILD list 2 #11): Wealth → Spending → Money tools → "Next 60 days". Cash ahead, per currency, from the
 * person's own records (lib/cash-forecast/model.ts): balances, bills, repeats in the money log, Goal plans, budgets and
 * the everyday pace. "A model from your own records, not a promise" stays in view. A currency without a cash balance
 * gets no line (unknown is not zero) and a teaching sentence instead. Hand-made SVG; the same figures as text and tables.
 */
/** Session AL (PRIMITIVES 3f): a rounded figure through the one format layer (was a fixed en-GB formatter). */
const about = (cents: bigint, currency: string) => moneyWhole(centsText(cents), currency);
export const FORECAST_PROMISE = 'A model from your own records, not a promise.';
export const LENGTH_WORDS: Readonly<Record<ForecastLength, string>> = {'60d': '60 days', '6m': '6 months', '12m': '12 months'};
export default function CashForecast({log, showcase = false}: {log: DeviceRecordState<MoneyLog>; showcase?: boolean}) {
  const accounts = useDeviceRecord(ACCOUNTS), bills = useDeviceRecord(BILLS), budgets = useDeviceRecord(BUDGETS), platform = usePlatform(), more = useDeviceRecord(MONEY_MORE), today = localDate(), id = useId();
  const ready = accounts.loaded && bills.loaded && budgets.loaded && log.loaded && platform.loaded && more.loaded;
  // Session AV lane 2, round 3: the chosen length is one device preference (kept as the person picks it; the Showcase's stays in its tab).
  const [picked, setPicked] = useState<ForecastLength | null>(null), length: ForecastLength = picked ?? (more.unreadable ? null : more.data.forecast) ?? '60d', days = forecastDays(length, today), words = LENGTH_WORDS[length];
  const planned = useMemo(() => more.unreadable ? [] : plannedForForecast(more.data, log.data.entries, today), [more.unreadable, more.data, log.data.entries, today]);
  const result = useMemo(() => ready ? cashForecast({accounts: accounts.data, bills: bills.data, entries: log.data.entries, budgets: budgets.data, contributions: plannedContributions(platform.data.goals), planned, today, days}) : null,
    [ready, accounts.data, bills.data, log.data.entries, budgets.data, platform.data.goals, planned, today, days]);
  const choose = (next: ForecastLength) => { setPicked(next); if (more.unreadable) return; try { more.update(m => { const {forecast: _f, ...rest} = m; void _f; return next === '60d' ? rest : {...rest, forecast: next}; }); } catch { /* the choice still shows; it is not kept */ } };
  return <section className="money-panel cash-forecast" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Next {words}</h4>
    <div className="forecast-length" role="group" aria-label="How far ahead">{FORECAST_LENGTHS.map(l => <button key={l} type="button" className="secondary" aria-pressed={length === l} onClick={() => choose(l)}>{LENGTH_WORDS[l]}</button>)}</div>
    <p className="cash-forecast-promise"><strong>{FORECAST_PROMISE}</strong> It changes as your records change. Information, not advice.</p>
    {showcase && <p className="fine">Drawn from the Showcase&rsquo;s fictional accounts, bills and money log.</p>}
    {accounts.unreadable && <p role="alert">Your accounts could not be read on this device, so this cannot be worked out now. Nothing was changed.</p>}
    {!result ? <p className="fine" aria-busy="true">Working it out on this device…</p>
      : !result.rows.length ? <div className="cash-forecast-empty">
        <p>This needs at least one cash or savings account with its balance. Add one in What you have → Accounts.</p>
        <p className="fine">Then your bills, budgets, your money log&rsquo;s repeats and everyday pace, your Goals&rsquo; plans and your planned one-off costs shape the next {words}, per currency, never converted.</p>
      </div>
      : result.rows.map(row => <ForecastRow key={row.currency} row={row} words={words}/>)}
    {result && result.rows.length > 0 && !bills.unreadable && <PaydayLow rows={result.rows} log={log} bills={bills.data} today={today}/>}
    {result && result.unplaced.length > 0 && <p className="fine">Not drawn: bills or plans in {result.unplaced.join(', ')}, which {result.unplaced.length === 1 ? 'has' : 'have'} no cash or savings account here.</p>}
    {ready && <Suspense fallback={null}><PlannedCosts entries={log.data.entries} today={today} showcase={showcase}/></Suspense>}
  </section>;
}

function ForecastRow({row, words}: {row: CurrencyForecast; words: string}) {
  const id = useId();
  if (!row.known) return <div className="cash-forecast-row">
    <h5>{row.currency}</h5>
    <p>No line for {row.currency}: none of its cash or savings accounts has a balance yet. Add one in What you have → Accounts.</p>
  </div>;
  const c = row.currency, last = row.points.at(-1)!;
  return <div className="cash-forecast-row" role="group" aria-labelledby={`${id}-cur`}>
    <h5 id={`${id}-cur`}>{c}</h5>
    <p className="cash-forecast-lowest">Lowest around {formatDate(row.lowest.date)}: about <strong>{about(row.lowest.cents, c)}</strong>{row.lowest.cents < 0n ? ' (below zero)' : ''}.</p>
    {row.lowestLow && row.lowestLow.cents < row.lowest.cents && <p className="fine">At the pace of your leanest month of the last 90 days: about {about(row.lowestLow.cents, c)} around {formatDate(row.lowestLow.date)}.</p>}
    <Chart row={row} labelId={`${id}-chart`} words={words}/>
    <p className="fine">Today about {about(row.startCents, c)}; in {words} about {about(last.mid, c)}{last.low !== undefined && last.high !== undefined ? ` (a range of about ${about(last.low, c)} to ${about(last.high, c)} from your own months)` : ''}.</p>
    <ul className="fine cash-forecast-notes">
      <li>Starts from your latest balances{row.oldestBalance < row.points[0]!.date ? ` (the oldest from ${formatDate(row.oldestBalance)})` : ''}.{row.missingBalances ? ` ${row.missingBalances} cash ${row.missingBalances === 1 ? 'account has' : 'accounts have'} no balance yet and ${row.missingBalances === 1 ? 'is' : 'are'} not counted.` : ''}</li>
      <li>{row.everyday.source === 'log' ? `Everyday money: the average of your last ${row.everyday.days} days in the money log (about ${moneyCents(row.everyday.outCents / BigInt(row.everyday.days), c)} a day out, ${moneyCents(row.everyday.inCents / BigInt(row.everyday.days), c)} a day in), without bills and repeats.`
        : row.everyday.source === 'budgets' ? `Everyday spending: your monthly ${c} budgets (about ${moneyCents(row.everyday.outCents / 365n, c)} a day). After ${MIN_HISTORY} days of logging, your own pace is used instead.`
        : `Your everyday spending is not known yet, so the line holds only the dated items; the real line is likely lower. Log your spending for ${MIN_HISTORY} days or set a budget.`}</li>
      {row.events.some(e => e.kind === 'contribution') && <li>Planned Goal contributions are counted as money leaving your cash.</li>}
      {row.events.some(e => e.kind === 'planned') && <li>Your planned one-off costs are counted on their day (one whose day has passed, tomorrow) until your money log shows them.</li>}
      {!row.range && row.everyday.source === 'log' && <li>A range appears once your log covers 60 days.</li>}
    </ul>
    {row.events.length > 0 && <details className="cash-forecast-events"><summary>Dated items ({row.events.length})</summary>
      <table><caption>Bills, repeats and plans in the next {words}, {c}</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">What</th><th scope="col">Amount</th></tr></thead>
        <tbody>{row.events.map((e, i) => <tr key={`${e.date}-${e.title}-${i}`}><td>{formatDate(e.date)}</td><td>{e.title} <span className="fine">· {e.kind === 'bill' ? 'bill' : e.kind === 'repeat-out' ? 'repeats in your log' : e.kind === 'repeat-in' ? 'income that repeats' : e.kind === 'planned' ? 'planned cost' : 'Goal plan'}</span></td><td>{e.cents < 0n ? '−' : '+'}{moneyCents(e.cents < 0n ? -e.cents : e.cents, c)}</td></tr>)}</tbody>
      </table></details>}
    <MonthLows row={row}/>
    <details className="cash-forecast-events"><summary>Week by week</summary>
      <table><caption>Expected cash at the end of each week, {c}</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">About</th>{row.range && <th scope="col">Range</th>}</tr></thead>
        <tbody>{row.points.filter((_, k) => k % 7 === 0 || k === row.points.length - 1).map(p => <tr key={p.date}><td>{formatDate(p.date)}</td><td>{about(p.mid, c)}</td>{row.range && <td>{about(p.low!, c)} to {about(p.high!, c)}</td>}</tr>)}</tbody>
      </table></details>
  </div>;
}

const W = 600, H = 200, PAD = 8;
/**
 * Session AV lane 2, round 3 (money; Simplifi's projected balances): each month's lowest point on the line, an estimate
 * from the person's own records (and, with a range, at the leanest pace).
 */
function MonthLows({row}: {row: KnownForecast}) {
  const lows = monthLows(row), c = row.currency;
  return <details className="cash-forecast-events forecast-months" open={lows.length > 2}><summary>Each month&rsquo;s lowest point</summary>
    <table><caption>The lowest expected cash in each month, {c}. An estimate from your own records, not a promise.</caption>
      <thead><tr><th scope="col">Month</th><th scope="col">Lowest, about</th><th scope="col">Around</th>{row.range && <th scope="col">At your leanest pace</th>}</tr></thead>
      <tbody>{lows.map(m => <tr key={m.month}><th scope="row">{formatMonth(m.month)}</th><td>{about(m.cents, c)}{m.cents < 0n ? ' (below zero)' : ''}</td><td>{formatDate(m.date)}</td>{row.range && <td>{m.lowCents !== undefined ? about(m.lowCents, c) : '—'}</td>}</tr>)}</tbody>
    </table></details>;
}
function Chart({row, labelId, words}: {row: KnownForecast; labelId: string; words: string}) {
  const values = row.points.flatMap(p => [p.mid, p.low ?? p.mid, p.high ?? p.mid, 0n]);
  const min = values.reduce((m, v) => v < m ? v : m), max = values.reduce((m, v) => v > m ? v : m), span = max - min || 1n;
  const x = (k: number) => PAD + (k * (W - 2 * PAD)) / Math.max(1, row.points.length - 1);
  const y = (v: bigint) => PAD + Number(((max - v) * 10_000n) / span) / 10_000 * (H - 2 * PAD);
  const line = (pick: (k: number) => bigint) => row.points.map((_, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${y(pick(k)).toFixed(1)}`).join(' ');
  const lowK = row.points.findIndex(p => p.date === row.lowest.date);
  const band = row.range ? `${line(k => row.points[k]!.high!)} ${row.points.map((_, i) => { const k = row.points.length - 1 - i; return `L${x(k).toFixed(1)} ${y(row.points[k]!.low!).toFixed(1)}`; }).join(' ')} Z` : null;
  return <svg className="cash-forecast-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Expected ${row.currency} cash over the next ${words}`} aria-describedby={`${labelId}-desc`}>
    <desc id={`${labelId}-desc`}>Expected cash over the next {words}; the lowest point is marked. The same figures are in the text and tables beside it.</desc>
    {min < 0n && max > 0n && <line className="cash-forecast-zero" x1={PAD} x2={W - PAD} y1={y(0n)} y2={y(0n)}/>}
    {band && <path className="cash-forecast-band" d={band}/>}
    <path className="cash-forecast-line" d={line(k => row.points[k]!.mid)}/>
    {lowK >= 0 && <line className="cash-forecast-low" x1={x(lowK)} x2={x(lowK)} y1={PAD} y2={H - PAD}/>}
  </svg>;
}
