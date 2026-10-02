import {useEffect, useId, useRef, useState} from 'react';
import {isShowcase} from '../../lib/showcase-storage';
import {NebulaFlow} from '../nebula-flow';
import {deviceHoldsAccount, markSyncOfferLater, readSyncOffer, syncOfferState} from '../../lib/sync-offer/offer';
import './sync-offer.css';

/**
 * The encrypted-sync offer (Session L), shown in Settings right under email sign-in once an account is signed in and
 * sync is not on here yet. Non-blocking and inline: it explains sync in plain words and hands over to the existing
 * controls below it. "Turn on" does exactly what "Create encrypted account vault" does for a new vault, or moves to the
 * existing recovery-secret field when the account already has one; Health keeps its own unticked consent (the same
 * in-memory choice as the existing checkbox). "Not now" leaves a one-line reminder in the same place.
 *
 * Kept apart from the existing controls on purpose: no form, no password field, no status or alert role, no autofocus,
 * and no label or button name that the existing controls use, so they and their tests behave exactly as before.
 * Nothing is written to storage except by "Not now".
 */
export function SyncOffer({account, manifest, opened, preparing, busy, health, onHealth, onCreate}: {
  account: string | null;
  manifest: unknown;
  opened: boolean;
  preparing: boolean;
  busy: boolean;
  health: boolean;
  onHealth: (value: boolean) => void;
  /** The existing "Create encrypted account vault" action. */
  onCreate: () => void;
}) {
  const id = useId(), root = useRef<HTMLElement>(null), focusTarget = useRef<HTMLElement>(null), pendingFocus = useRef(false);
  const [later, setLater] = useState(false), [startedHere, setStartedHere] = useState(false), [hint, setHint] = useState(false);
  // Read once on this device, on mount: reading never writes.
  useEffect(() => { try { setLater(readSyncOffer(window.localStorage) !== 'unanswered'); } catch { /* storage unavailable: unanswered */ } }, []);
  // A new account starts the offer afresh.
  useEffect(() => { setStartedHere(false); setHint(false); }, [account]);
  const deviceKnown = !!account && typeof window !== 'undefined' && (() => { try { return deviceHoldsAccount(window.localStorage, account); } catch { return false; } })();
  const state = syncOfferState({account, manifest, opened, preparing, startedHere, later, deviceKnown, showcase: typeof window !== 'undefined' && isShowcase()});
  // Focus moves only after the person's own tap, to the text that says what happens next, once that text is shown.
  useEffect(() => { if (pendingFocus.current && focusTarget.current) { pendingFocus.current = false; focusTarget.current.focus(); } });
  if (state === 'hidden') return null;
  const device = state === 'offer-device' || state === 'reminder-device';

  function turnOn() {
    if (device) {
      // The existing unlock form, right below this card.
      const field = root.current?.closest('#encrypted-sync')?.querySelector<HTMLInputElement>('form input[type="password"]');
      if (field) { field.focus(); return; }
      if (hint) { focusTarget.current?.focus(); return; }
      setHint(true); pendingFocus.current = true; return;
    }
    setStartedHere(true); pendingFocus.current = true; onCreate();
  }
  function notNow() {
    markSyncOfferLater((() => { try { return window.localStorage; } catch { return null; } })());
    setLater(true); pendingFocus.current = true;
  }

  if (state === 'next-step') return <section ref={root} className="panel sync-offer" aria-labelledby={id + 'title'}>
    <p className="eyebrow">ENCRYPTED SYNC</p>
    <h2 id={id + 'title'}><NebulaFlow identity="sync-offer-next">Save your recovery secret</NebulaFlow></h2>
    <p ref={el => { focusTarget.current = el; }} tabIndex={-1}>Your recovery secret is ready below. Save it in your password manager now: it is shown only while this vault is being created. Then confirm you saved it and create the vault.</p>
  </section>;

  if (state === 'reminder-new' || state === 'reminder-device') return <section ref={root} className="panel sync-offer sync-offer-reminder" aria-labelledby={id + 'reminder'}>
    <p id={id + 'reminder'} ref={hint ? undefined : el => { focusTarget.current = el; }} tabIndex={-1}><strong>{device ? 'Encrypted sync is on for your account, but not on this device yet.' : 'Encrypted sync is off for this account on this device.'}</strong></p>
    <p>{device ? 'Unlock with your recovery secret whenever you’re ready, and this device catches up automatically.' : 'Turn it on any time to keep your devices up to date. Until then, account records stay locked here; sign out to use this device’s own records.'}</p>
    {hint && <p className="fine" ref={el => { focusTarget.current = el; }} tabIndex={-1}>Enter your recovery secret in the field below.</p>}
    <div className="actions"><button type="button" className="primary" disabled={busy} onClick={turnOn}>Turn on encrypted sync</button></div>
  </section>;

  return <section ref={root} className="panel sync-offer" aria-labelledby={id + 'title'} aria-describedby={id + 'lede'}>
    <p className="eyebrow">ENCRYPTED SYNC</p>
    <h2 id={id + 'title'}><NebulaFlow identity="sync-offer-title">{device ? 'Bring this device up to date' : 'Keep your devices in sync automatically'}</NebulaFlow></h2>
    {device
      ? <p id={id + 'lede'}>Your account already has encrypted sync. Unlock it here with your recovery secret, and this device catches up automatically.</p>
      : <p id={id + 'lede'}>Turn it on once, and your Goals, Wealth, Habits and Today preferences stay up to date on every device you unlock. No backups or transfers by hand.</p>}
    <p>Your data is end-to-end encrypted on this device before it leaves; nobody else can read it.</p>
    <p className="sync-offer-secret">{device
      ? 'Your password manager can fill in the recovery secret. Your email code signs you in, but it cannot unlock your data.'
      : 'You’ll get a recovery secret. Keep it safe; a password manager is ideal. Your email code signs you in, but only the recovery secret unlocks your data, and ZIGoals asks for it each time you open your account on a device.'}</p>
    <div className="sync-offer-health">
      <label className="checkbox" htmlFor={id + 'health'}><input id={id + 'health'} type="checkbox" checked={health} aria-describedby={id + 'health-note'} onChange={e => onHealth(e.target.checked)}/>Also sync my Health records (optional)</label>
      <p className="fine" id={id + 'health-note'}>Health stays on this device unless you tick this.</p>
    </div>
    {hint && <p className="fine" ref={el => { focusTarget.current = el; }} tabIndex={-1}>Enter your recovery secret in the field below.</p>}
    <div className="actions">
      <button type="button" className="primary" disabled={busy} onClick={turnOn}>Turn on encrypted sync (recommended)</button>
      <button type="button" className="secondary" onClick={notNow}>Not now</button>
    </div>
  </section>;
}
