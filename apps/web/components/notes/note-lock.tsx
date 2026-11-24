'use client';
import Link from 'next/link';
import {useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {readLock, tryPin, writeLock, type DeviceLock} from '../../lib/device-lock';

/**
 * Session AV lane 2 (r4-notes; LEDGER #318): a locked note's cover — its words show after this device's screen-cover
 * PIN (the same check and the same waits after wrong tries as the screen cover), for this visit only. With no PIN set on
 * this device the note opens with a tap, and says why. Its own chunk.
 */
const local = () => { try { return window.localStorage; } catch { return null; } };
export default function NoteLock({onOpen}: {onOpen: () => void}) {
  const id = useId(), field = useRef<HTMLInputElement>(null);
  const [lock, setLock] = useState<DeviceLock | null | undefined>(undefined), [pin, setPin] = useState(''), [said, setSaid] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { setLock(readLock(local())); }, []);
  const open = async (e: FormEvent) => {
    e.preventDefault(); if (!lock || busy) return;
    setBusy(true);
    const out = await tryPin(lock, pin.trim(), Date.now());
    try { writeLock(local()!, out.lock); } catch { /* the count stays in memory */ }
    setLock(out.lock); setBusy(false); setPin('');
    if (out.ok) { onOpen(); return; }
    setSaid(out.waitMs ? `That PIN is not right. Try again in ${Math.max(1, Math.ceil(out.waitMs / 1000))} s.` : 'That PIN is not right. Try again.');
    field.current?.focus();
  };
  return <section className="note-lock" aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`} className="note-lock-title"><span aria-hidden="true">🔒 </span>This note is locked</h3>
    {lock === undefined ? <p className="fine">Reading the lock…</p> : lock ? <form onSubmit={e => void open(e)} className="note-lock-form">
      <label className="field"><span>Your screen-cover PIN</span><input ref={field} type="password" inputMode="numeric" autoComplete="off" value={pin} maxLength={8} onChange={e => setPin(e.target.value)} aria-describedby={`${id}-s`}/></label>
      <button type="submit" className="primary" disabled={busy || !pin.trim()}>Show this note</button>
      <p id={`${id}-s`} className="fine" role="status">{said}</p>
    </form> : <>
      <p className="fine">The screen cover is off on this device, so this note opens with a tap. <Link className="text-link" href="/app/settings#device-lock">Set a PIN</Link> to keep it behind one.</p>
      <button type="button" className="primary" onClick={onOpen}>Show this note</button>
    </>}
    <p className="fine">A locked note stays out of Search, the Graph, NOVA and the Markdown export. Its words are not encrypted: they stay in this browser and in Export everything, so your backup is whole.</p>
  </section>;
}
