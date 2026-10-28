'use client';
import {useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {EXCHANGES, EXCHANGE_NAMES, type ExchangeCall, type ExchangeId} from '../../lib/exchanges/allowlist';
import {signCall} from '../../lib/exchanges/sign';
import {checkPermissions, readBalances} from '../../lib/exchanges/read';
import {forgetExchangeKey, openExchangeKey, sealExchangeKey} from '../../lib/exchanges/vault';
import {EXCHANGES_RECORD, exchangesSchema, type ExchangesRecord} from '../../lib/exchanges/record';
import {GUIDES, KEY_LABELS} from '../../lib/exchanges/guides';
import {formatDateTime, formatExactNumber} from '../../lib/visual-format';

/**
 * Session AI (J14): exchanges read on this device, read-only. A key is checked on the exchange's own word before it is
 * kept (one that can trade, withdraw or transfer is refused), sealed on this device (never in localStorage, never exported
 * or synced), and used only to read balances through ZIGoals' read-only relay; "Remove exchange" erases it. Kraken,
 * Coinbase and Binance (ADR-034 N15). Balances can then be imported into a real portfolio from "From your wallets".
 */
async function relay(exchange: ExchangeId, call: ExchangeCall, keyId: string, secret: string): Promise<unknown> {
  const signed = await signCall(exchange, call, keyId, secret);
  const res = await fetch('/api/exchange', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(signed), cache: 'no-store'});
  const out = await res.json().catch(() => null) as {status?: number; data?: unknown; error?: string} | null;
  if (!res.ok || !out || out.error) throw Error(out?.error ?? 'The relay could not be reached.');
  if ((out.status ?? 500) >= 400 && exchange !== 'kraken') throw Error(`${EXCHANGE_NAMES[exchange]} refused the request (HTTP ${out.status}). Check the key and its permissions.`);
  return out.data;
}
export function ExchangesPanel({showcase}: {showcase: boolean}) {
  const record = useDeviceRecord(EXCHANGES_RECORD), [adding, setAdding] = useState<ExchangeId | null>(null), [busy, setBusy] = useState(false);
  const [keyId, setKeyId] = useState(''), [secret, setSecret] = useState(''), [note, setNote] = useState(''), [error, setError] = useState('');
  const save = (fn: (r: ExchangesRecord) => ExchangesRecord) => record.update(r => exchangesSchema.parse(fn(r)));
  async function read(exchange: ExchangeId, given?: {keyId: string; secret: string}) {
    const key = given ?? await openExchangeKey(exchange); if (!key) throw Error('No key is kept for this exchange on this device. Connect it again.');
    try {
      const balances = readBalances(exchange, await relay(exchange, 'balances', key.keyId, key.secret)), at = new Date().toISOString();
      save(r => ({...r, connections: {...r.connections, [exchange]: {...(r.connections[exchange] ?? {connectedAt: at}), read: {at, balances}, error: undefined}}}));
      return balances.length;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The balances could not be read.';
      save(r => ({...r, connections: {...r.connections, [exchange]: {...(r.connections[exchange] ?? {connectedAt: new Date().toISOString()}), error: message.slice(0, 200)}}}));
      throw cause;
    }
  }
  async function connect(event: FormEvent) {
    event.preventDefault(); if (!adding) return;
    setBusy(true); setError(''); setNote('');
    const exchange = adding, given = {keyId: keyId.trim(), secret: secret.trim()};
    try {
      const verdict = checkPermissions(exchange, await relay(exchange, 'permissions', given.keyId, given.secret));
      if (!verdict.ok) { setError(`${verdict.reason} Nothing was kept.`); return; }
      await sealExchangeKey(exchange, given);
      save(r => ({...r, connections: {...r.connections, [exchange]: {connectedAt: new Date().toISOString()}}}));
      setKeyId(''); setSecret(''); setAdding(null);
      const n = await read(exchange, given);
      setNote(`${EXCHANGE_NAMES[exchange]} connected, read-only: ${n} ${n === 1 ? 'asset' : 'assets'} read.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The exchange could not be checked.'); }
    finally { setBusy(false); setSecret(''); }
  }
  async function remove(exchange: ExchangeId) {
    setBusy(true);
    try { await forgetExchangeKey(exchange); save(r => { const c = {...r.connections}; delete c[exchange]; return {...r, connections: c}; }); setNote(`${EXCHANGE_NAMES[exchange]} removed: its key is erased from this device.`); }
    catch { setError('The key could not be erased here; clear this site\'s data to remove it.'); } finally { setBusy(false); }
  }
  if (!record.loaded) return null;
  const connected = EXCHANGES.filter(e => record.data.connections[e]);
  return <section className="panel exchanges-panel" aria-labelledby="exchanges-title">
    <h3 id="exchanges-title">Exchanges (read-only)</h3>
    {showcase ? <p className="fine">Exchanges are not connected in the Showcase.</p> : <>
      {connected.map(e => { const c = record.data.connections[e]!; return <article key={e} className="exchange-connection" aria-label={EXCHANGE_NAMES[e]}>
        <p><strong>{EXCHANGE_NAMES[e]}</strong> · read-only{c.read ? ` · read ${formatDateTime(c.read.at)}` : ''}</p>
        {c.read && <ul>{c.read.balances.map(b => <li key={b.asset}>{formatExactNumber(b.amount)} {b.asset}</li>)}</ul>}
        {c.error && <p role="alert" className="fine">{c.error} The last good read is kept.</p>}
        <div className="actions"><button type="button" className="secondary" disabled={busy} onClick={() => { setBusy(true); setError(''); read(e).then(n => setNote(`${EXCHANGE_NAMES[e]}: ${n} ${n === 1 ? 'asset' : 'assets'} read.`), cause => setError(cause instanceof Error ? cause.message : 'Not read.')).finally(() => setBusy(false)); }}>Read balances</button>
          <button type="button" className="text-link" disabled={busy} onClick={() => void remove(e)}>Remove exchange</button></div>
      </article>; })}
      {!adding && <div className="actions">{EXCHANGES.filter(e => !record.data.connections[e]).map(e => <button key={e} type="button" className="secondary" onClick={() => { setAdding(e); setError(''); setNote(''); }}>Connect {EXCHANGE_NAMES[e]}</button>)}</div>}
      {adding && <form className="exchange-connect" onSubmit={connect} aria-label={`Connect ${EXCHANGE_NAMES[adding]}`}>
        <ol className="fine">{GUIDES[adding].map(step => <li key={step}>{step}</li>)}</ol>
        <label className="field"><span>{KEY_LABELS[adding].keyId}</span><input autoComplete="off" spellCheck={false} value={keyId} onChange={e => setKeyId(e.target.value)} /></label>
        <label className="field"><span>{KEY_LABELS[adding].secret}</span><textarea autoComplete="off" spellCheck={false} rows={adding === 'coinbase' ? 5 : 2} value={secret} onChange={e => setSecret(e.target.value)} /><small>{KEY_LABELS[adding].secretHint}</small></label>
        <p className="fine">ZIGoals checks with {EXCHANGE_NAMES[adding]} that this key can only read; a key that can trade, withdraw or transfer is refused and not kept. The key is encrypted on this device, never exported or synced, and used only to read your balances through ZIGoals&rsquo; read-only relay, which keeps nothing.</p>
        <div className="actions"><button type="submit" className="primary" disabled={busy || !keyId.trim() || !secret.trim()}>{busy ? 'Checking…' : 'Check and connect'}</button><button type="button" className="quiet" onClick={() => { setAdding(null); setSecret(''); }}>Cancel</button></div>
      </form>}
    </>}
    {note && <p role="status">{note}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
