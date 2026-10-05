'use client';
import {useEffect, useId, useState} from 'react';
import {getAppStorage} from '../lib/showcase-storage';
import {choosePortfolioSync, portfolioSyncChosen, type PortfolioOutcome} from '../lib/vault/portfolio-sync';

export type PortfolioStatus = PortfolioOutcome | {state: 'error'; message: string} | {state: 'removed'};
const LINES: Record<Exclude<PortfolioStatus['state'], 'conflict' | 'error'>, string> = {
  unchanged: 'Portfolio synced.', adopted: 'Portfolio synced.', pushed: 'Portfolio synced.', pulled: 'Portfolio updated from its encrypted copy.',
  deleted: 'The Portfolio’s encrypted copy was deleted on another device, so Portfolio sync is off here. Tick it again to upload this device’s Portfolio.',
  stale: 'The Portfolio’s encrypted copy was made with your previous vault key. Open ZIGoals on a device that has your Portfolio to upload it again.',
  removed: 'The Portfolio’s encrypted copy was deleted. Your Portfolio on this device was not changed.',
};

/**
 * Session U Part 9 (ADR-013): "Also sync my Portfolio (optional)", beside the Health choice. Unticked by default; the
 * choice is kept for this account on this device (not in the remembered-device record). The Portfolio itself stays
 * where it is and never feeds Wealth or Goals; only its encrypted copy travels, after the account records sync.
 */
export function PortfolioSyncChoice({opened, busy, status, onSync, onDelete}: {opened: boolean; busy: boolean; status: PortfolioStatus | null; onSync: (choice?: 'keep-device' | 'keep-cloud') => Promise<void>; onDelete: () => Promise<void>}) {
  const id = useId();
  const [chosen, setChosen] = useState(() => { try { return portfolioSyncChosen(getAppStorage()); } catch { return false; } });
  const [confirming, setConfirming] = useState(false), [note, setNote] = useState('');
  // A deletion seen at sync, or made here, turns the stored choice off: the box follows what is stored after each outcome.
  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; try { setChosen(portfolioSyncChosen(getAppStorage())); } catch { /* the box keeps its state */ } }); return () => { active = false; }; }, [status]);
  const shown = chosen;
  function choose(enabled: boolean) {
    setNote('');
    try { choosePortfolioSync(getAppStorage(), enabled); setChosen(enabled); if (enabled && opened) void onSync(); }
    catch { setNote('This choice could not be saved on this device. Nothing was synced.'); }
  }
  return <div className="portfolio-sync-choice">
    <label className="checkbox" htmlFor={id + 'portfolio'}><input id={id + 'portfolio'} type="checkbox" checked={shown} disabled={busy} aria-describedby={id + 'portfolio-note'} onChange={e => choose(e.target.checked)} />Also sync my Portfolio (optional)</label>
    <p className="fine" id={id + 'portfolio-note'}>An encrypted copy of your Portfolio travels with this account, separate from your account records. It never feeds Wealth or Goals. Turning this off stops Portfolio transfers on this device; it does not delete the copy.</p>
    {status?.state === 'conflict' ? <div className="notice" role="alert">
      <p>Your Portfolio changed on this device and in its encrypted copy. Choose which one to keep. Keeping the copy keeps this device’s Portfolio as a recovery copy here.</p>
      <div className="actions"><button type="button" className="secondary" disabled={busy} onClick={() => void onSync('keep-device')}>Keep this device’s Portfolio</button><button type="button" className="secondary" disabled={busy} onClick={() => void onSync('keep-cloud')}>Keep the encrypted copy</button></div>
    </div> : status ? <p className="fine" role="status">{status.state === 'error' ? status.message : LINES[status.state]}</p> : null}
    {opened && shown && (confirming ? <div className="actions"><p className="fine">Every device then stops syncing its Portfolio, and each keeps its own.</p><button type="button" className="secondary" disabled={busy} onClick={() => { setConfirming(false); void onDelete(); }}>Delete the encrypted copy</button><button type="button" className="quiet" onClick={() => setConfirming(false)}>Keep it</button></div>
      : <button type="button" className="quiet" disabled={busy} onClick={() => setConfirming(true)}>Delete the Portfolio’s encrypted copy…</button>)}
    {note && <p role="alert">{note}</p>}
  </div>;
}
