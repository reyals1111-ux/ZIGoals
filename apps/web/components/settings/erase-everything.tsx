'use client';
import {useId, useState} from 'react';
import {useShowcase} from '../showcase-controls';

/**
 * Session AJ (Part 10, owner amendment A6): "Erase everything on this device", at the end of Backup & restore. Every
 * ZIGoals record leaves this browser (lib/erase-everything.ts: every "zigoals" key and every ZIGoals database); the
 * person types ERASE to confirm, after a nudge to make Export everything first. Nothing outside this browser changes.
 * Not offered in the Showcase (its data is the tab's own and leaves with "Exit Showcase").
 */
export function EraseEverything() {
  const showcase = useShowcase(), id = useId();
  const [open, setOpen] = useState(false), [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  if (showcase) return null;
  const erase = async () => {
    setBusy(true); setStatus('');
    try {
      const {eraseEverything, ERASE_CONFIRM} = await import('../../lib/erase-everything');
      if (typed.trim() !== ERASE_CONFIRM) { setStatus('Type ERASE to confirm.'); return; }
      const result = await eraseEverything();
      setStatus(result.failed.length ? `Erased ${result.keys} records. ${result.failed.length} stores are open in another ZIGoals tab: close it and erase again.` : `Erased ${result.keys} records and ${result.databases} stores from this browser. The app starts fresh when you reload.`);
      setOpen(false); setTyped('');
    } catch { setStatus('Nothing could be erased just now. Your records are as they were.'); }
    finally { setBusy(false); }
  };
  return <section className="panel erase-everything" id="erase-everything" aria-labelledby={`${id}-t`}>
    <p className="eyebrow">THIS DEVICE</p>
    <h3 id={`${id}-t`}>Erase everything on this device</h3>
    <p className="fine">Removes every ZIGoals record from this browser: goals, habits, Health, Wealth, ZIGi&rsquo;s chats and notes, photos, keys you watch and your choices. It cannot reach anything public on a blockchain, a provider&rsquo;s copy, or another device. <a className="text-link" href="#export-everything">Make Export everything first</a> if you want a copy.</p>
    {!open ? <button type="button" className="secondary" onClick={() => { setOpen(true); setStatus(''); }}>Erase everything…</button> :
      <form onSubmit={e => { e.preventDefault(); void erase(); }} aria-label="Confirm erasing everything on this device">
        <label className="field">Type ERASE to confirm<input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false}/></label>
        <div className="actions"><button type="submit" className="danger" disabled={busy || typed.trim() !== 'ERASE'}>Erase everything</button><button type="button" className="secondary" onClick={() => { setOpen(false); setTyped(''); }}>Cancel</button></div>
      </form>}
    {status && <p role="status" className="fine">{status}</p>}
  </section>;
}
