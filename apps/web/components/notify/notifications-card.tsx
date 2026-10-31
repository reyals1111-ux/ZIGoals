'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {Switch} from '../ai/ai-switch';
import {NOTIFY_LABELS, NOTIFY_PREFS, NOTIFY_TYPES, eveningTime, morningTime, setTime, setType, typeOn, type NotifyType} from '../../lib/notify/prefs';
import {REMINDERS_PLAN, quietHours} from '../../lib/reminders-plan/schema';
import {pushSupport} from '../../lib/push/support';
import {isShowcase} from '../../lib/showcase-storage';
import {formatClock} from '../../lib/visual-format';
import {NOTIFY_CHANGE} from './notify-sync';
import './notifications.css';

type Phase = {kind: 'checking'} | {kind: 'off'; publicKey: string} | {kind: 'on'} | {kind: 'unavailable'; text: string; install?: boolean};
/**
 * Settings → Notifications (Session AK Part 2, ADR-036 Q3, D1, A1–A4): one switch per type, the morning and evening
 * times, the quiet hours (the reminders plan's), a test button and turn off. Permission is asked only inside the tap on
 * "Turn on". Until the owner switches push on for this build the card explains that it is being switched on; the
 * choices below still save, so they are ready.
 */
export function NotificationsCard() {
  const prefs = useDeviceRecord(NOTIFY_PREFS), plan = useDeviceRecord(REMINDERS_PLAN);
  const [phase, setPhase] = useState<Phase>({kind: 'checking'}), [busy, setBusy] = useState(false), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      if (isShowcase()) { if (active) setPhase({kind: 'unavailable', text: 'Not available in the Showcase: its example data never reaches a notification.'}); return; }
      const support = pushSupport();
      if (support === 'needs-install') { if (active) setPhase({kind: 'unavailable', text: 'On iPhone and iPad, notifications work in ZIGoals saved to your Home Screen (iOS 16.4 or later).', install: true}); return; }
      if (support === 'unsupported') { if (active) setPhase({kind: 'unavailable', text: 'This browser does not support notifications from web apps.'}); return; }
      const device = await import('../../lib/notify/device');
      if (await device.notifyOn()) { if (active) setPhase({kind: 'on'}); return; }
      const status = await device.notifyStatus();
      if (active) setPhase(status.enabled ? {kind: 'off', publicKey: status.publicKey} : {kind: 'unavailable', text: status.message});
    })();
    return () => { active = false; };
  }, []);
  const changed = () => window.dispatchEvent(new Event(NOTIFY_CHANGE));
  const save = (change: Parameters<typeof prefs.update>[0], said?: string) => { try { prefs.update(change); changed(); if (said) setMessage({text: said}); } catch { setMessage({text: 'This choice could not be saved on this device.', failed: true}); } };
  const turnOn = async () => {
    if (phase.kind !== 'off') return;
    setBusy(true); setMessage(null);
    try {
      const device = await import('../../lib/notify/device'), result = await device.turnOnNotifications(phase.publicKey);
      if (result.ok) { save(p => ({...p, here: true})); setPhase({kind: 'on'}); setMessage({text: `Notifications are on for this device.${result.note ? ` ${result.note}` : ''}`}); }
      else setMessage({text: result.message, failed: true});
    } finally { setBusy(false); }
  };
  const turnOff = async () => {
    setBusy(true); setMessage(null);
    try {
      const device = await import('../../lib/notify/device');
      await device.turnOffNotifications(); save(p => ({...p, here: false}));
      const status = await device.notifyStatus();
      setPhase(status.enabled ? {kind: 'off', publicKey: status.publicKey} : {kind: 'unavailable', text: status.message});
      setMessage({text: 'Turned off. This device’s record left the notification service.'});
    } finally { setBusy(false); }
  };
  const test = async () => { setBusy(true); try { setMessage({text: await (await import('../../lib/notify/device')).sendTestNotification()}); } finally { setBusy(false); } };
  const quiet = quietHours(plan.data), state = phase.kind === 'checking' ? 'Checking…' : phase.kind === 'on' ? 'On for this device.' : phase.kind === 'off' ? 'Off.' : phase.text;
  return <section className="panel notify-card" id="notifications" aria-labelledby="notify-title" data-state={phase.kind}>
    <p className="eyebrow">NOTIFICATIONS{phase.kind === 'unavailable' && !phase.install && <span className="unavailable-pill">Being switched on</span>}</p>
    <h2 id="notify-title">Notifications, even when ZIGoals is closed.</h2>
    <p>Your habits, water, wind-down, contributions, bills, price alerts and the weekly review, on time. The text is written on this device from your own records; the server only knows <em>when</em> to wake this device, never <em>why</em>.</p>
    <details className="notify-server"><summary>What the server gets, and what it never gets</summary>
      <ul><li>a random id and secret made on this device, and the address your browser hands out for push messages;</li><li>your time zone, your quiet hours and the minutes of the day this device should wake.</li></ul>
      <p>Never a habit’s name, an amount, a kind of reminder or anything you record. Every message is empty: the notification is composed here, after it arrives. Turning off deletes this device’s record at once; unused records leave after 30 days.</p>
    </details>
    <p role="status" className="notify-state">{state}{phase.kind === 'unavailable' && phase.install && <> <Link href="/app/help#install">How to add ZIGoals to your Home Screen →</Link></>}</p>
    <div className="notify-actions">
      {phase.kind === 'off' && <button type="button" className="primary" disabled={busy} onClick={() => void turnOn()}>{busy ? 'Setting up…' : 'Turn on notifications'}</button>}
      {phase.kind === 'on' && <><button type="button" className="secondary" disabled={busy} onClick={() => void test()}>Send a test notification</button><button type="button" className="quiet" disabled={busy} onClick={() => void turnOff()}>{busy ? 'Turning off…' : 'Turn off and delete from the server'}</button></>}
    </div>
    {message && <p role={message.failed ? 'alert' : 'status'} className="notify-message">{message.text}</p>}
    <fieldset className="notify-types" disabled={!prefs.loaded}>
      <legend>What to be told about</legend>
      {NOTIFY_TYPES.map((type: NotifyType) => <Switch key={type} label={NOTIFY_LABELS[type].title} note={NOTIFY_LABELS[type].blurb} checked={typeOn(prefs.data, type)} onChange={on => save(p => setType(p, type, on))}/>)}
    </fieldset>
    <div className="notify-times">
      <label className="field"><span>Morning orbit at</span><input type="time" step={60} value={morningTime(prefs.data)} onChange={e => { if (e.target.value) save(p => setTime(p, 'morning', e.target.value)); }}/></label>
      <label className="field"><span>Evening wrap-up at</span><input type="time" step={60} value={eveningTime(prefs.data)} onChange={e => { if (e.target.value) save(p => setTime(p, 'evening', e.target.value)); }}/></label>
    </div>
    <p className="fine">Quiet hours: nothing between {formatClock(quiet.from)} and {formatClock(quiet.to)} in this device’s time zone. <Link href="/app/settings/reminders">Change quiet hours and the review day →</Link> Your device’s own Do Not Disturb still applies.</p>
  </section>;
}
