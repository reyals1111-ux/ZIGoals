'use client';
import {useId, useMemo, useState} from 'react';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {addLocalDays, localDate} from '../../lib/local-date';
import {leverageCost, tiltLine, tiltSignals, tradeHealth, type LeverageInput, type LeverageResult} from '../../lib/portfolio/trader';
import type {Portfolio} from '../../lib/portfolio/schema';
import {formatMoney, formatMonth, formatNumber, formatSignedMoney} from '../../lib/visual-format';

/**
 * Session AJ (item 30; owner decision D11): trader tools on a portfolio's Insights view, offered only when it has sells and
 * shown only after the person turns them on (zigoals:ui-prefs:v1 `trader.on`). Trade health and the tilt check read the
 * recorded trades; the leverage card is an illustration with figures the person types (never stored). Not advice.
 */
const pct = (share: number, digits = 0) => formatNumber(share, {style: 'percent', maximumFractionDigits: digits});
const direction = (v: string | null) => v === null ? undefined : Number(v) > 0 ? 'up' : Number(v) < 0 ? 'down' : undefined;

export function TraderTools({portfolio}: {portfolio: Portfolio}) {
  const prefs = useUiPrefs(), id = useId();
  const on = prefs.loaded && prefs.data.trader?.on === true;
  const turn = (value: boolean) => { try { void prefs.update(r => ({...r, trader: {...r.trader, on: value}})); } catch { /* stays as it was */ } };
  if (!prefs.loaded) return null;
  if (!on) return <section className="panel trader-tools trader-tools-offer" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">OPTIONAL</p><h3 id={`${id}-title`}>Trader tools</h3>
    <p className="fine">Your wins and losses, how long you held what you sold, fees, results by month, a gentle tilt check and a cost-of-leverage illustration, all from your own trades. Off until you turn them on; not advice.</p>
    <button type="button" className="secondary" onClick={() => turn(true)}>Turn on trader tools</button>
  </section>;
  return <section className="panel trader-tools" aria-labelledby={`${id}-title`}>
    <header className="trader-tools-head"><div><p className="eyebrow">TRADER TOOLS · YOUR OWN TRADES</p><h3 id={`${id}-title`}>Trade health</h3></div><button type="button" className="text-link" onClick={() => turn(false)}>Turn off</button></header>
    <TiltCheck portfolio={portfolio}/>
    <Health portfolio={portfolio}/>
    <LeverageCard currency={portfolio.currency}/>
    <p className="fine">Information from what you recorded, not advice. Nothing here buys, sells or predicts anything.</p>
  </section>;
}

function Health({portfolio}: {portfolio: Portfolio}) {
  const health = useMemo(() => { try { return tradeHealth(portfolio); } catch { return null; } }, [portfolio]);
  if (!health) return <p className="fine">These trades cannot be counted: a sale is larger than what was held on its date. Check the transactions.</p>;
  const c = portfolio.currency;
  return <>
    <dl className="trader-figures">
      <div><dt>Sales</dt><dd>{formatNumber(health.sales)}</dd></div>
      <div><dt>Wins · losses</dt><dd>{health.wins} · {health.losses}{health.even ? ` · ${health.even} even` : ''}</dd></div>
      <div><dt>Share won</dt><dd>{health.winShare === null ? 'Unknown' : pct(health.winShare)}</dd></div>
      <div><dt>Average hold</dt><dd>{health.averageHoldDays === null ? 'Unknown' : `${formatNumber(Math.round(health.averageHoldDays))} ${Math.round(health.averageHoldDays) === 1 ? 'day' : 'days'}`}</dd></div>
      <div><dt>Fees</dt><dd>{formatMoney(health.fees, c)}{health.feeShare !== null && <span className="fine"> · {pct(health.feeShare, 2)} of {formatMoney(health.traded, c)} traded</span>}</dd></div>
    </dl>
    {health.unknown > 0 && <p className="fine">{health.unknown} {health.unknown === 1 ? 'sale has' : 'sales have'} no known cost (a transfer in without a price), so {health.unknown === 1 ? 'it is' : 'they are'} neither a win nor a loss here.</p>}
    <h4>Realised result by month</h4>
    <ul className="trader-months">{health.byMonth.map(m => <li key={m.month}><span>{formatMonth(`${m.month}-15T12:00:00Z`, {timeZone: 'UTC'})}</span><strong data-direction={direction(m.result)}>{m.result === null ? 'Unknown' : formatSignedMoney(m.result, c)}</strong><span className="fine">{m.sales} {m.sales === 1 ? 'sale' : 'sales'}</span></li>)}</ul>
    <p className="fine">Results by first in, first out (the oldest coins sell first), fees included. Your Realised gains file uses the average cost.</p>
  </>;
}

function TiltCheck({portfolio}: {portfolio: Portfolio}) {
  const prefs = useUiPrefs(), [now] = useState(() => Date.now()), today = localDate(new Date(now));
  const signals = useMemo(() => { try { return tiltSignals(portfolio, now); } catch { return []; } }, [portfolio, now]);
  const hiddenUntil = prefs.data.trader?.tiltHiddenUntil;
  if (!signals.length || (hiddenUntil && hiddenUntil >= today)) return null;
  const hide = () => { try { void prefs.update(r => ({...r, trader: {...r.trader, tiltHiddenUntil: addLocalDays(today, 7)}})); } catch { /* shows again next time */ } };
  return <div className="trader-tilt" role="note" aria-label="A moment to check in">
    <p><strong>A moment to check in.</strong> {signals.map(tiltLine).join(' ')}</p>
    <p className="fine">Is this still your plan? Only you decide; this is what your records show, not advice.</p>
    <button type="button" className="text-link" onClick={hide}>Not now (for 7 days)</button>
  </div>;
}

function LeverageCard({currency}: {currency: string}) {
  const id = useId();
  const [form, setForm] = useState<{size: string; leverage: string; entry: string; side: 'long' | 'short'; rate: string; rateKind: 'yearly' | 'per-8h'; days: string}>({size: '1000', leverage: '5', entry: '', side: 'long', rate: '10', rateKind: 'yearly', days: '30'});
  const [result, setResult] = useState<LeverageResult | null>(null), [problem, setProblem] = useState('');
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({...f, [k]: v}));
  const work = (event: React.FormEvent) => {
    event.preventDefault(); setProblem('');
    const clean = (v: string) => v.trim().replace(',', '.');
    if (![form.size, form.entry, form.rate].every(v => /^\d+(\.\d+)?$/.test(clean(v)))) { setResult(null); setProblem('Enter plain numbers, such as 1000 or 0.01.'); return; }
    try { const input: LeverageInput = {size: clean(form.size), leverage: Number(form.leverage), entry: clean(form.entry), side: form.side, rate: clean(form.rate), rateKind: form.rateKind, days: Number(form.days)}; setResult(leverageCost(input)); }
    catch (cause) { setResult(null); setProblem(cause instanceof Error ? cause.message : 'These figures cannot be worked out.'); }
  };
  return <details className="trader-leverage"><summary>The cost of leverage (an illustration)</summary>
    <form onSubmit={work} aria-labelledby={`${id}-lev`}>
      <p id={`${id}-lev`} className="fine">Type the figures of a position you are thinking about. Nothing is saved or sent.</p>
      <div className="form-grid">
        <label>Position size ({currency})<input inputMode="decimal" value={form.size} onChange={e => set('size', e.target.value)} required/></label>
        <label>Leverage (×)<input inputMode="numeric" value={form.leverage} onChange={e => set('leverage', e.target.value)} required/></label>
        <label>Entry price ({currency})<input inputMode="decimal" value={form.entry} onChange={e => set('entry', e.target.value)} required/></label>
        <label>Side<select value={form.side} onChange={e => set('side', e.target.value as 'long' | 'short')}><option value="long">Long</option><option value="short">Short</option></select></label>
        <label>Rate (%)<input inputMode="decimal" value={form.rate} onChange={e => set('rate', e.target.value)} required/></label>
        <label>Rate is<select value={form.rateKind} onChange={e => set('rateKind', e.target.value as 'yearly' | 'per-8h')}><option value="yearly">a yearly borrowing rate</option><option value="per-8h">a funding rate per 8 hours</option></select></label>
        <label>Days held<input inputMode="numeric" value={form.days} onChange={e => set('days', e.target.value)} required/></label>
      </div>
      <button type="submit" className="secondary">Work it out</button>
    </form>
    {problem && <p role="alert" className="fine">{problem}</p>}
    {result && <div role="status" className="trader-leverage-result">
      <p>Keeping it open {form.days} days costs about <strong>{formatMoney(result.cost, currency)}</strong>, {pct(result.costShareOfMargin)} of your {formatMoney(result.margin, currency)} margin.</p>
      <p>A move of <strong>{pct(result.moveToClose, 1)}</strong> against you (to about {formatMoney(result.closePrice, currency)}) would use up that margin, before fees and your exchange&rsquo;s own maintenance rules, which close positions sooner.</p>
      <p className="fine">An illustration, not a quote and not advice. Rates change; your exchange&rsquo;s figures are the ones that count.</p>
    </div>}
  </details>;
}
