'use client';
import {useEffect, useId, useState, type FormEvent} from 'react';
import {createPortal} from 'react-dom';
import {FORGOT_WAIT_MS, PIN_RULE, UNLOCKED_SESSION_KEY, newLock, readLock, tryPin, writeLock, type DeviceLock} from '../lib/device-lock';
import './device-lock.css';

/** Session AH (SE14): see lib/device-lock.ts. Every storage call is guarded: if storage cannot be read, nothing is locked. */
const local = () => { try { return window.localStorage; } catch { return null; } };
const unlockedHere = () => { try { return window.sessionStorage.getItem(UNLOCKED_SESSION_KEY) === '1'; } catch { return true; } };
const markUnlocked = (on: boolean) => { try { if (on) window.sessionStorage.setItem(UNLOCKED_SESSION_KEY, '1'); else window.sessionStorage.removeItem(UNLOCKED_SESSION_KEY); } catch { /* a refused store keeps the tab open */ } };
const LOCK_EVENT = 'zigoals-device-lock';
const seconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

/** The lock screen, shown when a lock is set and this tab has not been unlocked yet. The page behind it is inert. */
export function DeviceLockGate() {
  const [lock, setLock] = useState<DeviceLock | null>(null), [locked, setLocked] = useState(false);
  const [pin, setPin] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [now, setNow] = useState(0);
  const [forgotAt, setForgotAt] = useState<number | null>(null), id = useId();
  useEffect(() => {
    const read = () => { const l = readLock(local()); setLock(l); setLocked(!!l && !unlockedHere()); };
    read(); window.addEventListener(LOCK_EVENT, read); window.addEventListener('storage', read);
    return () => { window.removeEventListener(LOCK_EVENT, read); window.removeEventListener('storage', read); };
  }, []);
  useEffect(() => {
    if (!locked) return;
    const others = [...document.body.children].filter(el => !el.classList.contains('device-lock-host')) as HTMLElement[];
    for (const el of others) el.setAttribute('inert', '');
    const tick = window.setInterval(() => setNow(Date.now()), 1000); setNow(Date.now());
    return () => { for (const el of others) el.removeAttribute('inert'); window.clearInterval(tick); };
  }, [locked]);
  if (!locked || !lock || typeof document === 'undefined') return null;
  const wait = lock.retryAt > now ? lock.retryAt - now : 0, forgotLeft = forgotAt !== null ? forgotAt + FORGOT_WAIT_MS - now : null;
  async function unlock(event: FormEvent) {
    event.preventDefault(); if (!lock || busy) return;
    setBusy(true);
    const out = await tryPin(lock, pin.trim(), Date.now());
    try { writeLock(local()!, out.lock); } catch { /* the count is kept in memory then */ }
    setLock(out.lock); setBusy(false); setPin('');
    if (out.ok) { markUnlocked(true); setLocked(false); setMessage(''); return; }
    setMessage(out.waitMs ? `That PIN is not right. Try again in ${seconds(out.waitMs)} s.` : 'That PIN is not right. Try again.');
  }
  function removeLock() { try { writeLock(local()!, null); } catch { /* nothing stored, nothing to remove */ } markUnlocked(true); setLocked(false); window.dispatchEvent(new Event(LOCK_EVENT)); }
  return createPortal(<div className="device-lock-host"><div className="device-lock" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
    <h1 id={`${id}-t`}>ZIGoals is locked on this device</h1>
    <form onSubmit={e => void unlock(e)}>
      <label className="field">PIN<input type="password" inputMode="numeric" autoComplete="off" autoFocus maxLength={8} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} aria-describedby={`${id}-m`} disabled={wait > 0} /></label>
      <button className="primary" type="submit" disabled={busy || wait > 0 || !PIN_RULE.test(pin)}>{wait > 0 ? `Wait ${seconds(wait)} s` : 'Unlock'}</button>
    </form>
    <p id={`${id}-m`} role="status">{message}</p>
    {forgotAt === null ? <button type="button" className="text-link" onClick={() => setForgotAt(Date.now())}>Forgot the PIN?</button>
      : <div className="device-lock-forgot"><p>The lock only hides the screen; your records are not locked away. You can remove the lock {forgotLeft && forgotLeft > 0 ? `in ${seconds(forgotLeft)} s` : 'now'}, and everything stays as it is.</p>
        <button type="button" className="secondary" disabled={!!forgotLeft && forgotLeft > 0} onClick={removeLock}>Remove the lock</button></div>}
  </div></div>, document.body);
}

/** Settings → Account & devices: turn the lock on with a PIN, lock now, or turn it off. */
export function DeviceLockSettings() {
  const [lock, setLock] = useState<DeviceLock | null>(null), [pin, setPin] = useState(''), [again, setAgain] = useState(''), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null), id = useId();
  useEffect(() => { const read = () => setLock(readLock(local())); read(); window.addEventListener(LOCK_EVENT, read); return () => window.removeEventListener(LOCK_EVENT, read); }, []);
  async function turnOn(event: FormEvent) {
    event.preventDefault();
    if (!PIN_RULE.test(pin)) { setMessage({text: 'Use 4 to 8 digits.', failed: true}); return; }
    if (pin !== again) { setMessage({text: 'The two PINs differ. Type the same PIN twice.', failed: true}); return; }
    try { writeLock(local()!, await newLock(pin)); markUnlocked(true); window.dispatchEvent(new Event(LOCK_EVENT)); setPin(''); setAgain(''); setMessage({text: 'The lock is on. A new tab or window asks for the PIN.'}); }
    catch { setMessage({text: 'This browser could not save the lock. Nothing changed.', failed: true}); }
  }
  const turnOff = () => { try { writeLock(local()!, null); window.dispatchEvent(new Event(LOCK_EVENT)); setMessage({text: 'The lock is off.'}); } catch { setMessage({text: 'This browser could not remove the lock.', failed: true}); } };
  const lockNow = () => { markUnlocked(false); window.dispatchEvent(new Event(LOCK_EVENT)); };
  return <section className="panel device-lock-settings" id="device-lock" aria-labelledby={`${id}-t`}>
    <p className="eyebrow">THIS DEVICE</p><h2 id={`${id}-t`}>Screen lock</h2>
    <p>Optional, and off unless you turn it on. A PIN hides ZIGoals when a new tab or window opens on this device. It does not encrypt your records, and a forgotten PIN never locks them away: the lock screen can remove the lock after a short wait.</p>
    {lock ? <div className="actions"><button type="button" className="secondary" onClick={lockNow}>Lock now</button><button type="button" className="quiet" onClick={turnOff}>Turn the lock off</button></div>
      : <form className="platform-form" onSubmit={e => void turnOn(e)} aria-label="Set a PIN">
        <label className="field">PIN (4 to 8 digits)<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} /></label>
        <label className="field">The same PIN again<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={again} onChange={e => setAgain(e.target.value.replace(/\D/g, ''))} /></label>
        <button className="secondary" type="submit">Turn the lock on</button>
      </form>}
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
    <p className="fine">Kept on this device only (never synced or exported). Face ID and passkeys are not offered: without a server check they would only look safer.</p>
  </section>;
}
