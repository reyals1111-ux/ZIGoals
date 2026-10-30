'use client';
import {useCallback, useEffect, useId, useRef, useState} from 'react';
import './wallet-holdings.css';
import {useMarketQuotes} from '../platform/use-market-quotes';
import {useBaseCurrency} from '../platform/wealth-total';
import {isShowcase} from '../../lib/showcase-storage';
import {PortfolioDecimal} from '../../lib/portfolio/math';
import {quoteFor} from '../../lib/price-alerts/engine';
import {formatDateTime, formatMoney, formatQuantity} from '../../lib/visual-format';
import {XPUB_OPEN_EVENT} from '../../lib/wallets/xpub/events';
import {KIND_LABEL, parseExtendedKey, XpubError} from '../../lib/wallets/xpub/derive';
import {createScanner, MIN_REFRESH_MS, refreshAllowed, type Scanner} from '../../lib/wallets/xpub/scan';
import {newWatchedId, putWatched, readWatched, removeWatched, xpubStorageAvailable, type WatchedEntry} from '../../lib/wallets/xpub/store';

/**
 * Session AJ (item 36; D2b, amendment A5): watch a whole Bitcoin wallet by its extended PUBLIC key on Wealth. The key stays
 * in its own IndexedDB database on this device (never synced, exported, backed up or logged); its addresses are worked out
 * here and read from mempool.space only, when the page opens and by hand, at most every 5 minutes, stopping at 20 unused
 * addresses in a row. The balance shows with its value in the person's currency; nothing can be sent from a public key.
 * Not in the Showcase.
 */
const BTC_REF = {provider: 'coingecko', kind: 'coin', id: 'bitcoin'} as const;
const btcText = (sats: string) => new PortfolioDecimal(sats).dividedBy(1e8).toFixed();
export default function XpubWatch() {
  const [entries, setEntries] = useState<WatchedEntry[] | null>(null), [busy, setBusy] = useState<string | null>(null), [status, setStatus] = useState('');
  const [name, setName] = useState(''), [key, setKey] = useState(''), [error, setError] = useState(''), [open, setOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#xpub');
  const scanner = useRef<Scanner | null>(null), id = useId(), currency = useBaseCurrency(), [now, setNow] = useState(() => Date.now());
  const market = useMarketQuotes(entries?.length ? [{marketRef: BTC_REF, currency}] : false), quote = quoteFor(market.quotes, 'bitcoin', currency);
  const reload = useCallback(async () => setEntries(await readWatched()), []);
  const read = useCallback(async (entry: WatchedEntry) => {
    setBusy(entry.id); setStatus(`Reading ${entry.name} from mempool.space…`);
    try {
      scanner.current ??= createScanner();
      const result = await scanner.current.scan(parseExtendedKey(entry.key)), at = new Date().toISOString();
      await putWatched({...entry, last: {at, sats: result.sats.toString(), used: result.used, scanned: result.scanned}});
      setStatus(`${entry.name}: read ${result.scanned} addresses, ${result.used} used.`);
    } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'The balance could not be read just now.'); }
    finally { setBusy(null); setNow(Date.now()); await reload(); }
  }, [reload]);
  // On open: read each key whose last read is 5 minutes old or more, one after another (never a loop).
  const started = useRef(false);
  useEffect(() => {
    if (started.current || isShowcase()) return; started.current = true;
    void (async () => { const list = await readWatched(); setEntries(list); for (const e of list) if (refreshAllowed(e.last?.at, Date.now())) await read(e); })();
  }, [read]);
  // Shown once a key is watched, or when the wallet menu's "Watch a Bitcoin wallet (xpub)" opened it (#xpub); otherwise
  // Wealth stays as it was. Nothing renders before the device's keys are read (no flash, no server/browser mismatch).
  const [asked, setAsked] = useState(() => typeof window !== 'undefined' && window.location.hash === '#xpub');
  useEffect(() => { const show = () => { setAsked(true); setOpen(true); }; window.addEventListener(XPUB_OPEN_EVENT, show); return () => window.removeEventListener(XPUB_OPEN_EVENT, show); }, []);
  if (isShowcase() || entries === null || (!entries.length && !asked)) return null;
  const add = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try {
      const watched = parseExtendedKey(key), entry: WatchedEntry = {id: newWatchedId(), kind: watched.kind, key: key.trim(), name: name.trim() || `Bitcoin wallet (${watched.kind})`, addedAt: new Date().toISOString()};
      await putWatched(entry); setKey(''); setName(''); setOpen(false); await reload(); await read(entry);
    } catch (cause) { setError(cause instanceof XpubError || cause instanceof Error ? cause.message : 'That key could not be added.'); }
  };
  const remove = async (entry: WatchedEntry) => { setAsked(true); try { await removeWatched(entry.id); setStatus(`${entry.name} removed from this device.`); } catch { setStatus('It could not be removed just now.'); } await reload(); };
  return <section id="xpub" className="panel xpub-watch" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">BITCOIN · WATCH-ONLY</p>
    <h3 id={`${id}-title`}>A whole Bitcoin wallet, by its public key</h3>
    {entries && entries.length > 0 && <ul className="xpub-list">{entries.map(e => {
      const value = e.last && quote ? new PortfolioDecimal(e.last.sats).dividedBy(1e8).times(new PortfolioDecimal(quote.price).dividedBy(new PortfolioDecimal(10).pow(quote.priceDecimals))).toFixed(2) : null;
      const allowed = refreshAllowed(e.last?.at, now), wait = e.last ? Math.ceil((MIN_REFRESH_MS - (now - Date.parse(e.last.at))) / 60_000) : 0;
      return <li key={e.id}>
        <div><strong>{e.name}</strong><span className="fine">{KIND_LABEL[e.kind]}</span></div>
        <div>{e.last ? <><strong>{formatQuantity(btcText(e.last.sats))} BTC</strong> <span className="fine">confirmed · {value === null ? 'value unavailable' : formatMoney(value, currency)} · {e.last.used} {e.last.used === 1 ? 'address' : 'addresses'} used · read {formatDateTime(e.last.at)}</span></> : <span className="fine">Not read yet</span>}</div>
        <div className="xpub-actions">
          <button type="button" className="secondary" disabled={!!busy || !allowed} onClick={() => void read(e)}>{busy === e.id ? 'Reading…' : 'Refresh'}</button>
          {!allowed && <span className="fine">Again in {wait} min</span>}
          <button type="button" className="text-link" disabled={!!busy} onClick={() => void remove(e)} aria-label={`Remove ${e.name}`}>Remove</button>
        </div>
      </li>;
    })}</ul>}
    {status && <p role="status" className="fine">{status}</p>}
    {!xpubStorageAvailable() ? <p className="fine">This browser cannot keep a watched key on this device.</p> : !open ? <button type="button" className="secondary" onClick={() => setOpen(true)}>Watch a wallet by its xpub</button> :
      <form className="xpub-form" onSubmit={e => void add(e)} aria-label="Watch a Bitcoin wallet by its public key">
        <label>Name<input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="For example: Savings wallet"/></label>
        <label>Extended public key (xpub, ypub or zpub)<textarea value={key} onChange={e => setKey(e.target.value)} rows={3} required autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={!!error} aria-describedby={`${id}-help`}/></label>
        {error && <p role="alert" className="fine">{error}</p>}
        <div className="actions"><button type="submit" className="primary" disabled={!!busy}>Watch</button><button type="button" className="secondary" onClick={() => { setOpen(false); setError(''); }}>Cancel</button></div>
      </form>}
    <p className="fine" id={`${id}-help`}>Public keys only: never paste a private key (xprv) or recovery words anywhere. The key stays on this device (not synced, exported or backed up). To read the balance, ZIGoals works out the wallet&rsquo;s addresses here and asks mempool.space about each one, so mempool.space sees those addresses and your IP address; nothing else does. Read when this page opens and when you tap Refresh, at most every 5 minutes.</p>
  </section>;
}
