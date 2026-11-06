'use client';
import {useId, useState} from 'react';
import {useShowcase} from '../showcase-controls';
import './erase-everything.css';

/**
 * Session AJ (Part 10, owner amendment A6): "Erase everything on this device", at the end of Backup & restore. Every
 * ZIGoals record leaves this browser (lib/erase-everything.ts: every "zigoals" key and every ZIGoals database); the
 * person types ERASE to confirm, after a nudge to make Export everything first. Nothing outside this browser changes.
 * Not offered in the Showcase (its data is the tab's own and leaves with "Exit Showcase").
 * Session AL (BN-022, BN-023, BN-105; P-BN-31): the confirm step says how many records and stores this browser holds;
 * the armed button looks like a warning, not like a disabled one; after a full erase one press opens the app fresh
 * (first-run defaults: the money and chain pages stay off until chosen again, as on a new device); the copy names every
 * area, and says the offline copy of the app (pages, no records) goes too and comes back when ZIGoals next opens.
 */
type Found = {keys: number; databases: number | null};
async function countHere(): Promise<Found> {
  const {zigoalsKeys, KNOWN_DATABASES, ERASE_PREFIX} = await import('../../lib/erase-everything');
  let keys = 0;
  for (const area of ['localStorage', 'sessionStorage'] as const) { try { keys += zigoalsKeys(window[area]).length; } catch { /* refused */ } }
  let databases: number | null = null;
  try { const listed = await indexedDB.databases?.(); if (listed) databases = new Set(listed.map(d => d.name).filter((n): n is string => !!n && (n.startsWith(ERASE_PREFIX) || (KNOWN_DATABASES as readonly string[]).includes(n)))).size; } catch { /* the browser cannot list them */ }
  return {keys, databases};
}
export function EraseEverything() {
  const showcase = useShowcase(), id = useId();
  const [open, setOpen] = useState(false), [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [found, setFound] = useState<Found | null>(null), [erased, setErased] = useState(false);
  if (showcase) return null;
  const arm = () => { setOpen(true); setStatus(''); setFound(null); void countHere().then(setFound, () => setFound(null)); };
  const erase = async () => {
    setBusy(true); setStatus('');
    try {
      const {eraseEverythingOnThisDevice, ERASE_CONFIRM} = await import('../../lib/erase-everything');
      if (typed.trim() !== ERASE_CONFIRM) { setStatus('Type ERASE to confirm.'); return; }
      const result = await eraseEverythingOnThisDevice();
      setOpen(false); setTyped('');
      if (result.failed.length) { setStatus(`Erased ${result.keys} records. ${result.failed.length} stores are open in another ZIGoals tab: close it and erase again.`); return; }
      setStatus(`Erased ${result.keys} records and ${result.databases} stores from this browser. Open ZIGoals fresh now: this page still shows what it had in memory.`); setErased(true);
    } catch { setStatus('Nothing could be erased just now. Your records are as they were.'); }
    finally { setBusy(false); }
  };
  const armed = typed.trim() === 'ERASE';
  return <section className="panel erase-everything" id="erase-everything" aria-labelledby={`${id}-t`}>
    <p className="eyebrow">THIS DEVICE</p>
    <h3 id={`${id}-t`}>Erase everything on this device</h3>
    <p className="fine">Removes every ZIGoals record from this browser: goals, habits, Health, Wealth, the Checklist, Tasks, Notes and the Journal, Chess usernames, ZIGi&rsquo;s and NOVA&rsquo;s chats, notes and settings, photos, keys and wallets you watch, the screen lock and your choices (theme, pages, layout). The app&rsquo;s own offline copy (its pages, none of your records) goes too and is fetched again when ZIGoals next opens. It cannot reach anything public on a blockchain, a provider&rsquo;s copy, or another device. <a className="text-link" href="#export-everything">Make Export everything first</a> if you want a copy.</p>
    {!open ? <button type="button" className="secondary" onClick={arm}>Erase everything…</button> :
      <form onSubmit={e => { e.preventDefault(); void erase(); }} aria-label="Confirm erasing everything on this device">
        <p>{found ? `This browser holds ${found.keys} ZIGoals ${found.keys === 1 ? 'record' : 'records'}${found.databases === null ? '' : ` and ${found.databases} ${found.databases === 1 ? 'store' : 'stores'}`}. All of them go, and it cannot be undone.` : 'Every ZIGoals record in this browser goes, and it cannot be undone.'} Afterwards ZIGoals opens fresh, with the first-run choices of a new device.</p>
        <label className="field">Type ERASE to confirm<input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false}/></label>
        <div className="actions"><button type="submit" className={`danger${armed ? ' is-armed' : ''}`} disabled={busy || !armed}>{busy ? 'Erasing…' : 'Erase everything'}</button><button type="button" className="secondary" onClick={() => { setOpen(false); setTyped(''); }}>Cancel</button></div>
      </form>}
    {status && <p role="status" className="fine">{status}</p>}
    {/* A fresh start in one press (not an automatic reload: the page must not move while the erase's own checks run). */}
    {erased && <button type="button" className="primary" onClick={() => window.location.replace('/app')}>Open ZIGoals fresh</button>}
  </section>;
}
