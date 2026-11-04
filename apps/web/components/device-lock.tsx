'use client';
import {useEffect, useId, useState, type FormEvent} from 'react';
import {createPortal} from 'react-dom';
import {FORGOT_WAIT_MS, PIN_RULE, UNLOCKED_SESSION_KEY, checkNewPin, newLock, readLock, tryPin, writeLock, type DeviceLock} from '../lib/device-lock';
import {FieldError, useFormErrors} from './primitives/field-error';
import './device-lock.css';
import './settings/erase-everything.css'; // the shared warning style of a destructive button

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
  const [eraseOpen, setEraseOpen] = useState(false), [eraseTyped, setEraseTyped] = useState(''), [erasing, setErasing] = useState(false), [eraseMessage, setEraseMessage] = useState('');
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
  // Session AL (BN-113): the other honest way out of a forgotten PIN is to erase what ZIGoals keeps in this browser
  // (the same erase as Settings → Erase everything), after a typed confirmation; the page then starts fresh.
  async function eraseHere(event: FormEvent) {
    event.preventDefault(); if (erasing || eraseTyped.trim() !== 'ERASE') return;
    setErasing(true); setEraseMessage('');
    try {
      const {eraseEverythingOnThisDevice} = await import('../lib/erase-everything');
      const result = await eraseEverythingOnThisDevice();
      if (result.failed.length) { setEraseMessage('Most of it was erased, but another ZIGoals tab still holds some records open. Close the other tabs and erase again.'); setErasing(false); return; }
      window.location.reload();
    } catch { setEraseMessage('Nothing could be erased just now. Your records are as they were.'); setErasing(false); }
  }
  return createPortal(<div className="device-lock-host"><div className="device-lock" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
    <h1 id={`${id}-t`}>ZIGoals is locked on this device</h1>
    {/* Session AL (P-DV-127, DV-121): said up front, not only behind "Forgot the PIN?". */}
    <p className="fine">A screen cover: it hides ZIGoals in this browser. Your records are not encrypted by it.</p>
    <form onSubmit={e => void unlock(e)}>
      <label className="field">PIN<input type="password" inputMode="numeric" autoComplete="off" autoFocus maxLength={8} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} aria-describedby={`${id}-m`} disabled={wait > 0} /></label>
      <button className="primary" type="submit" disabled={busy || wait > 0 || !PIN_RULE.test(pin)}>{wait > 0 ? `Wait ${seconds(wait)} s` : 'Unlock'}</button>
    </form>
    <p id={`${id}-m`} role="status">{message}</p>
    {forgotAt === null ? <button type="button" className="text-link" onClick={() => setForgotAt(Date.now())}>Forgot the PIN?</button>
      : <div className="device-lock-forgot"><p>The lock only hides the screen; your records are not locked away. There are two ways out, and both are open to anyone using this browser:</p>
        <p><strong>Keep your records:</strong> remove the lock {forgotLeft && forgotLeft > 0 ? `in ${seconds(forgotLeft)} s` : 'now'}, and everything stays as it is.</p>
        <button type="button" className="secondary" disabled={!!forgotLeft && forgotLeft > 0} onClick={removeLock}>Remove the lock</button>
        <p><strong>Start fresh:</strong> erase everything ZIGoals keeps in this browser (goals, habits, Health, Wealth, chats, choices and the lock). It cannot be undone, and nothing outside this browser changes.</p>
        {!eraseOpen ? <button type="button" className="secondary" onClick={() => setEraseOpen(true)}>Erase this device&rsquo;s data…</button>
          : <form onSubmit={e => void eraseHere(e)} aria-label="Confirm erasing this device's data">
            <label className="field">Type ERASE to confirm<input value={eraseTyped} onChange={e => setEraseTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false}/></label>
            <div className="actions"><button type="submit" className="danger" disabled={erasing || eraseTyped.trim() !== 'ERASE'}>{erasing ? 'Erasing…' : 'Erase everything on this device'}</button><button type="button" className="secondary" onClick={() => { setEraseOpen(false); setEraseTyped(''); }}>Cancel</button></div>
          </form>}
        {eraseMessage && <p role="alert">{eraseMessage}</p>}
      </div>}
  </div></div>, document.body);
}

/**
 * Settings → Account & devices: turn the lock on with a PIN, lock now, or turn it off.
 * Session AL (BN-113, NB-145): the PIN is checked exactly as typed (lib/device-lock.ts checkNewPin) and nothing is
 * stripped or cut; a failed try clears the confirmation, so an old entry can never confirm a later PIN; the lock is
 * written only after two equal, valid entries. Turning it off asks for the PIN (a forgotten PIN: Lock now, then
 * "Forgot the PIN?"). The card says that every tab and window of this browser locks.
 */
export function DeviceLockSettings() {
  const [lock, setLock] = useState<DeviceLock | null>(null), [pin, setPin] = useState(''), [again, setAgain] = useState(''), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null), id = useId();
  const [offPin, setOffPin] = useState(''), [offBusy, setOffBusy] = useState(false), form = useFormErrors(), off = useFormErrors();
  useEffect(() => { const read = () => setLock(readLock(local())); read(); window.addEventListener(LOCK_EVENT, read); return () => window.removeEventListener(LOCK_EVENT, read); }, []);
  async function turnOn(event: FormEvent) {
    event.preventDefault(); setMessage(null);
    const problem = checkNewPin(pin, again);
    if (problem) { form.fail(problem); setAgain(''); return; }
    try { writeLock(local()!, await newLock(pin)); markUnlocked(true); window.dispatchEvent(new Event(LOCK_EVENT)); setPin(''); setAgain(''); form.clear(); setMessage({text: 'The lock is on. Every new tab or window of this browser asks for this PIN. Keep it somewhere safe.'}); }
    catch { setPin(''); setAgain(''); setMessage({text: 'This browser could not save the lock. Nothing changed: the lock is off.', failed: true}); }
  }
  async function turnOff(event: FormEvent) {
    event.preventDefault(); setMessage(null);
    if (!lock || offBusy) return;
    if (!PIN_RULE.test(offPin)) { off.fail({pin: 'Type your PIN (4 to 8 digits) to turn the lock off.'}); return; }
    setOffBusy(true);
    const out = await tryPin(lock, offPin, Date.now());
    setOffBusy(false); setOffPin('');
    if (!out.ok) {
      try { writeLock(local()!, out.lock); } catch { /* the count is kept in memory then */ }
      setLock(out.lock);
      off.fail({pin: out.waitMs ? `That PIN is not right. Try again in ${seconds(out.waitMs)} s.` : 'That PIN is not right. The lock stays on.'});
      return;
    }
    try { writeLock(local()!, null); window.dispatchEvent(new Event(LOCK_EVENT)); off.clear(); setMessage({text: 'The lock is off.'}); } catch { setMessage({text: 'This browser could not remove the lock.', failed: true}); }
  }
  const lockNow = () => { markUnlocked(false); window.dispatchEvent(new Event(LOCK_EVENT)); };
  return <section className="panel device-lock-settings" id="device-lock" aria-labelledby={`${id}-t`}>
    <p className="eyebrow">THIS DEVICE · SCREEN LOCK</p><h2 id={`${id}-t`}>Screen cover with a PIN</h2>
    {/* Session AL (P-DV-127, DV-121): named for what it is, a cover; anyone at this browser can wait a minute and remove it. */}
    <p>Optional, and off unless you turn it on. It is a screen cover, not a lock on your records. A PIN hides ZIGoals when a new tab or window opens in this browser: every tab and window of this browser profile locks, not only this one. It does not encrypt your records, and a forgotten PIN never locks them away: the lock screen can remove the lock after a short wait, or erase this device&rsquo;s data.</p>
    {lock ? <>
      <div className="actions"><button type="button" className="secondary" onClick={lockNow}>Lock now</button></div>
      <form className="platform-form" onSubmit={e => void turnOff(e)} aria-label="Turn the lock off">
        <label className="field">Your PIN, to turn the lock off<input {...off.field('pin')} type="password" inputMode="numeric" autoComplete="off" maxLength={16} value={offPin} onChange={e => setOffPin(e.target.value)} /></label>
        <FieldError {...off.message('pin')}/>
        <button type="submit" className="quiet" disabled={offBusy}>Turn the lock off</button>
        <p className="fine">Forgot it? Choose Lock now, then &ldquo;Forgot the PIN?&rdquo; on the lock screen.</p>
      </form>
    </> : <form className="platform-form" onSubmit={e => void turnOn(e)} aria-label="Set a PIN" noValidate>
        <label className="field">PIN (4 to 8 digits)<input {...form.field('pin')} type="password" inputMode="numeric" autoComplete="new-password" maxLength={16} value={pin} onChange={e => setPin(e.target.value)} /></label>
        <FieldError {...form.message('pin')}/>
        <label className="field">The same PIN again<input {...form.field('again')} type="password" inputMode="numeric" autoComplete="new-password" maxLength={16} value={again} onChange={e => setAgain(e.target.value)} /></label>
        <FieldError {...form.message('again')}/>
        <button className="secondary" type="submit">Turn the lock on</button>
      </form>}
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
    <p className="fine">Kept on this device only (never synced or exported). Face ID and passkeys are not offered: without a server check they would only look safer.</p>
  </section>;
}
