'use client';
import Link from 'next/link';
import {useEffect, useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useMarketQuotes} from '../platform/use-market-quotes';
import {usePlatform} from '../platform/use-platform';
import {showToast} from '../ui/undo-toast';
import {goalProgress} from '../../lib/positions';
import {addAlert, alertLine, checkPriceAlerts, markSeen, newAlertId, removeAlert, unseen} from '../../lib/price-alerts/engine';
import {PRICE_ALERTS, type PriceAlert} from '../../lib/price-alerts/schema';
import {formatDateTime} from '../../lib/visual-format';
import './price-alerts.css';

/**
 * Session AJ (item 15, WE17/J11; owner decision D9): price alerts tied to goals, in the app only.
 * - The check runs whenever the prices this app already read change (the shared quote cache: `useMarketQuotes([])` asks
 *   for nothing new) and when a page with alerts opens; a goal alert counts the goal's progress as the Goals page does.
 * - A fired alert shows once as a toast, stays on Today until marked seen, and is listed in Activity.
 * - Not advice; nothing is bought, sold or sent. Push (CO11) comes later; `channels.push` stays false here.
 */
export function usePriceAlertWatch() {
  const alerts = useDeviceRecord(PRICE_ALERTS), platform = usePlatform(), {quotes} = useMarketQuotes([]);
  const toasted = useRef(new Set<string>());
  useEffect(() => {
    if (!alerts.loaded || alerts.unreadable || !alerts.data.alerts.some(a => a.active)) return;
    const goalPercent = (goalId: string) => { try { if (!platform.loaded || platform.error) return null; const p = goalProgress(platform.data, goalId, Date.now(), quotes); return p.requiresReview ? null : Number(p.progressPct); } catch { return null; } };
    const {record, fired} = checkPriceAlerts(alerts.data, quotes, new Date().toISOString(), goalPercent);
    if (!fired.length) return;
    try { alerts.update(() => record); } catch { return; }
    for (const f of fired) if (!toasted.current.has(f.alert.id)) { toasted.current.add(f.alert.id); showToast({message: `Price alert: ${f.text}`, link: {href: '/app', label: 'See on Today'}}); }
  }, [alerts, platform.loaded, platform.error, platform.data, quotes]);
  return alerts;
}
/** On the pages that read prices (Markets, Wealth, Portfolio, a goal): checks the alerts, shows nothing itself. */
export function PriceAlertWatcher() { usePriceAlertWatch(); return null; }

/** Today: the alerts that fired and are not seen yet, and how many wait. */
export function PriceAlertsTodayCard() {
  const alerts = usePriceAlertWatch();
  if (!alerts.loaded || alerts.unreadable) return null;
  const fresh = unseen(alerts.data), waiting = alerts.data.alerts.filter(a => a.active);
  if (!fresh.length && !waiting.length) return null;
  const text = (a: PriceAlert) => [...alerts.data.fired].reverse().find(f => f.alertId === a.id)?.text ?? alertLine(a);
  return <section className="panel price-alerts-card" aria-labelledby="price-alerts-title">
    <p className="eyebrow">YOUR PRICE ALERTS</p><h3 id="price-alerts-title">{fresh.length ? `${fresh.length} price alert${fresh.length === 1 ? '' : 's'} reached` : `${waiting.length} price alert${waiting.length === 1 ? '' : 's'} waiting`}</h3>
    {fresh.length > 0 && <ul className="price-alerts-list">{fresh.map(a => <li key={a.id}><strong>{text(a)}</strong>{a.firedAt && <span className="fine">Reached {formatDateTime(a.firedAt)}</span>}</li>)}</ul>}
    {waiting.length > 0 && <p className="fine">{fresh.length ? `${waiting.length} more waiting: ` : 'Waiting: '}{waiting.slice(0, 3).map(alertLine).join(' · ')}{waiting.length > 3 ? ' · …' : ''}</p>}
    <p className="fine">Checked with the prices this app already read, when it opens and when prices refresh. Information only, not advice.</p>
    {fresh.length > 0 && <div className="actions"><button type="button" className="secondary" onClick={() => { try { alerts.update(r => markSeen(r, new Date().toISOString())); } catch { /* stays until next time */ } }}>Seen</button><Link className="text-link" href="/app/activity">In Activity →</Link></div>}
  </section>;
}

/** Set an alert for one coin (a price above or below, or a goal reaching a percent with this coin's price). */
export function PriceAlertForm({coin, coinName, currency, goals = [], defaultKind = 'price'}: {coin: string; coinName: string; currency: 'USD' | 'EUR'; goals?: readonly {id: string; name: string}[]; defaultKind?: 'price' | 'goal'}) {
  const alerts = useDeviceRecord(PRICE_ALERTS), id = useId();
  const [kind, setKind] = useState<'price' | 'goal'>(goals.length ? defaultKind : 'price'), [direction, setDirection] = useState<'above' | 'below'>('above'), [price, setPrice] = useState(''), [goalId, setGoalId] = useState(goals[0]?.id ?? ''), [percent, setPercent] = useState('100'), [status, setStatus] = useState('');
  if (!alerts.loaded) return null;
  const mine = alerts.data.alerts.filter(a => a.coin === coin && a.active);
  const save = (event: React.FormEvent) => {
    event.preventDefault(); setStatus('');
    const goal = goals.find(g => g.id === goalId), base = {id: newAlertId(), coin, coinName, currency, createdAt: new Date().toISOString(), active: true, channels: {inApp: true, push: false}} as const;
    const alert: PriceAlert = kind === 'price' ? {...base, kind, direction, price: price.trim().replace(',', '.')} : {...base, kind, goalId, goalName: goal?.name ?? '', percent: Number(percent)};
    try { alerts.update(r => addAlert(r, alert)); setPrice(''); setStatus(`Alert set: ${alertLine(alert)}. ZIGoals checks it with prices it already reads; nothing is sent.`); }
    catch (cause) { setStatus(cause instanceof Error && /already set|Up to/.test(cause.message) ? cause.message : kind === 'price' ? 'Enter a price, such as 65000 or 0.25.' : 'Choose a goal and a percent from 1 to 1000.'); }
  };
  return <details className="price-alert-form"><summary>Price alert{mine.length ? ` (${mine.length} set)` : ''}</summary>
    <form onSubmit={save} aria-label={`Price alert for ${coinName}`}>
      <fieldset className="price-alert-kind"><legend>Alert me when</legend>
        <label><input type="radio" name={`${id}-kind`} checked={kind === 'price'} onChange={() => setKind('price')}/> {coinName}&rsquo;s price</label>
        {goals.length > 0 && <label><input type="radio" name={`${id}-kind`} checked={kind === 'goal'} onChange={() => setKind('goal')}/> {coinName} puts a goal at a percent</label>}
      </fieldset>
      {kind === 'price' ? <div className="form-grid">
        <label>Goes<select value={direction} onChange={e => setDirection(e.target.value as 'above' | 'below')}><option value="above">above</option><option value="below">below</option></select></label>
        <label>Price ({currency})<input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} required/></label>
      </div> : <div className="form-grid">
        <label>Goal<select value={goalId} onChange={e => setGoalId(e.target.value)}>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label>At (%)<input inputMode="numeric" value={percent} onChange={e => setPercent(e.target.value)} required/></label>
      </div>}
      <button type="submit" className="secondary">Set alert</button>
      {status && <p role="status" className="fine">{status}</p>}
      <p className="fine">In the app only (on Today and in Activity). Not advice: an alert never buys, sells or moves anything.</p>
    </form>
    {mine.length > 0 && <ul className="price-alerts-list">{mine.map(a => <li key={a.id}><span>{alertLine(a)}</span><button type="button" className="text-link" onClick={() => { try { alerts.update(r => removeAlert(r, a.id)); } catch { /* kept */ } }}>Remove</button></li>)}</ul>}
  </details>;
}
