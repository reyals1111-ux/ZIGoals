'use client';
import {useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showToast} from '../ui/undo-toast';
import {addPortfolioAlert, checkPortfolioAlerts, newAlertId, portfolioAlertLine, removePortfolioAlert} from '../../lib/price-alerts/engine';
import {PRICE_ALERTS} from '../../lib/price-alerts/schema';
import './price-alerts.css';

/**
 * Session AV (owner follow-up 1, F-MOVE-ALERT; CoinStats' portfolio-value alerts): "Value alert" under a portfolio's
 * summary — tell me when this portfolio is worth above or below a value, in its own currency. Checked when this
 * portfolio's page shows a complete value (every held coin priced; an unknown value never fires), with a toast; the
 * fired line joins the alerts' log. In the app only, information not advice. Lazy, in the portfolio's own place.
 */
export default function PortfolioValueAlert({portfolioId, portfolioName, currency, value}: {portfolioId: string; portfolioName: string; currency: 'USD' | 'EUR'; /** The whole value now, or null while any held coin has no price. */ value: string | null}) {
  const alerts = useDeviceRecord(PRICE_ALERTS), id = useId(), toasted = useRef(new Set<string>());
  const [direction, setDirection] = useState<'above' | 'below'>('above'), [amount, setAmount] = useState(''), [status, setStatus] = useState('');
  useEffect(() => {
    if (!alerts.loaded || alerts.unreadable || value === null || !(alerts.data.portfolio ?? []).some(a => a.active && a.portfolioId === portfolioId)) return;
    const {record, fired} = checkPortfolioAlerts(alerts.data, pid => pid === portfolioId ? value : null, new Date().toISOString());
    if (!fired.length) return;
    try { alerts.update(() => record); } catch { return; }
    for (const f of fired) if (!toasted.current.has(f.alert.id)) { toasted.current.add(f.alert.id); showToast({message: `Value alert: ${f.text}`}); }
  }, [alerts, value, portfolioId]);
  if (!alerts.loaded || alerts.unreadable) return null;
  const mine = (alerts.data.portfolio ?? []).filter(a => a.portfolioId === portfolioId);
  const save = (e: FormEvent) => {
    e.preventDefault();
    const v = amount.trim().replace(',', '.');
    if (!/^\d{1,15}(\.\d{1,2})?$/.test(v) || Number(v) <= 0) { setStatus('Enter a value above zero, such as 10000 or 2500.50.'); return; }
    const alert = {id: newAlertId(), portfolioId, portfolioName: portfolioName.slice(0, 100), currency, direction, value: v, createdAt: new Date().toISOString(), active: true};
    try { alerts.update(r => addPortfolioAlert(r, alert)); setAmount(''); setStatus(`Alert set: ${portfolioAlertLine(alert)}. Checked when this portfolio shows a full value; nothing is sent.`); }
    catch (cause) { setStatus(cause instanceof Error ? cause.message : 'Not saved on this device.'); }
  };
  return <details className="price-alert-form portfolio-value-alert"><summary>Value alert{mine.some(a => a.active) ? ` (${mine.filter(a => a.active).length} set)` : ''}</summary>
    <form onSubmit={save} aria-label={`Value alert for ${portfolioName}`} noValidate>
      <div className="form-grid">
        <label>Worth<select value={direction} onChange={e => setDirection(e.target.value as 'above' | 'below')}><option value="above">above</option><option value="below">below</option></select></label>
        <label>Value ({currency})<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} aria-describedby={`${id}-note`} required/></label>
      </div>
      <button type="submit" className="secondary">Set alert</button>
      {status && <p role="status" className="fine">{status}</p>}
      <p id={`${id}-note`} className="fine">Checked when this portfolio shows its full value (every coin priced). In the app only; not advice: an alert never buys, sells or moves anything.</p>
    </form>
    {mine.length > 0 && <ul className="price-alerts-list">{mine.map(a => <li key={a.id}><span>{portfolioAlertLine(a)}{a.active ? '' : ' · reached'}</span><button type="button" className="text-link" aria-label={`Remove the alert ${portfolioAlertLine(a)}`} onClick={() => { try { alerts.update(r => removePortfolioAlert(r, a.id)); } catch { /* kept */ } }}>Remove</button></li>)}</ul>}
  </details>;
}
