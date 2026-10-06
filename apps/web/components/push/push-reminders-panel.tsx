'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useState} from 'react';
import {localDate} from '../../lib/local-date';
import {TIME, type QuietHours} from '../../lib/push/schedule';
import {usePush} from './use-push';
import './push.css';

/** The one line that says where this device stands, and whether Turn on is offered. */
export function pushStateLine(p: Pick<ReturnType<typeof usePush>, 'support' | 'availability' | 'record' | 'permission' | 'account' | 'showcase'>): {text: string; canTurnOn: boolean; install?: boolean} {
  if (p.showcase) return {text: 'Not available in Showcase.', canTurnOn: false};
  if (p.availability === 'unavailable') return {text: 'Not available in this build.', canTurnOn: false};
  if (p.support === 'needs-install') return {text: 'Add ZIGoals to your Home Screen first.', canTurnOn: false, install: true};
  if (p.support === 'unsupported') return {text: 'Not supported in this browser.', canTurnOn: false};
  if (!p.record.loaded || p.availability === 'unknown') return {text: 'Checking…', canTurnOn: false};
  if (p.record.locked) return {text: 'Unlock your account records first.', canTurnOn: false};
  if (p.record.data) return {text: `On · reminder times checked ${p.record.data.lastSyncDay === localDate() ? 'today' : `on ${p.record.data.lastSyncDay}`}.`, canTurnOn: false};
  if (p.permission === 'denied') return {text: 'Blocked in your device settings.', canTurnOn: false};
  if (!p.account) return {text: 'Off. Sign in to your account first.', canTurnOn: false};
  return {text: 'Off.', canTurnOn: true};
}
/** Session V Part 13 (owner-approved, ADR-014): reminder names in notifications, opt-in; loaded only with push on. */
const ReminderNames = lazy(() => import('./reminder-names'));
/**
 * Settings → "Reminders on this phone, even when ZIGoals is closed" (ADR-010): explicit opt-in per device, what the
 * server gets in plain words, the fixed text, the state, quiet hours, and "Turn off and delete from the server".
 */
export function PushRemindersPanel() {
  const push = usePush(), state = pushStateLine(push);
  const [draft, setDraft] = useState<QuietHours | null>(null);
  useEffect(() => { setDraft(null); }, [push.record.data?.quiet.from, push.record.data?.quiet.to]);
  const quiet = draft ?? push.record.data?.quiet ?? {from: '22:00', to: '07:00'};
  const validQuiet = TIME.test(quiet.from) && TIME.test(quiet.to);
  return <section className="panel push-panel" id="reminders" aria-labelledby="push-title">
    <p className="eyebrow">REMINDERS WHEN CLOSED</p>
    <h2 id="push-title">Reminders on this phone, even when ZIGoals is closed.</h2>
    <p>Your reminder times stay as they are. After one, your device shows a single notification, &ldquo;A reminder from ZIGoals&rdquo;, or the habit&rsquo;s name if you turn that on below; opening it brings you to Today. Off unless you turn it on here, for this device only.</p>
    <details className="push-server"><summary>What the server gets, and what it never gets</summary>
      <ul><li>the address your browser hands out for push messages, and the two keys that encrypt them;</li><li>your reminder times as times of day, your time zone and the weekdays they apply to;</li><li>your quiet hours.</li></ul>
      <p>Never a habit&rsquo;s name, a count, or anything you record. The platform&rsquo;s push service (Apple, Google, Mozilla or Microsoft, depending on your browser) delivers the message and sees when it was sent, not what. Everything is deleted when you turn this off, sign out or delete your account, and after 30 days without opening ZIGoals on this device.</p>
    </details>
    <p role="status" className="push-state">{state.text}{state.install && <> <Link href="/app/help#install">How to install &rarr;</Link></>}</p>
    {push.record.data && <form className="push-quiet" aria-label="Quiet hours" onSubmit={event => { event.preventDefault(); if (validQuiet) void push.setQuiet(quiet); }}>
      <label className="field"><span>Quiet from</span><input type="time" step={60} value={quiet.from} onChange={event => setDraft({...quiet, from: event.target.value})} disabled={push.busy} /></label>
      <label className="field"><span>Quiet until</span><input type="time" step={60} value={quiet.to} onChange={event => setDraft({...quiet, to: event.target.value})} disabled={push.busy} /></label>
      <button type="submit" className="secondary" disabled={push.busy || !draft || !validQuiet || (draft.from === push.record.data.quiet.from && draft.to === push.record.data.quiet.to)}>Save quiet hours</button>
    </form>}
    {push.record.data && <p className="fine">Nothing is sent between {push.record.data.quiet.from} and {push.record.data.quiet.to}, in this device&rsquo;s time zone.</p>}
    {push.record.data && <Suspense fallback={null}><ReminderNames/></Suspense>}
    <div className="actions">
      {state.canTurnOn && <button type="button" className="primary" disabled={push.busy} onClick={() => void push.turnOn()}>{push.busy ? 'Setting up…' : 'Turn on on this device'}</button>}
      {push.record.data && <button type="button" className="secondary" disabled={push.busy} onClick={() => void push.turnOff()}>{push.busy ? 'Turning off…' : 'Turn off and delete from the server'}</button>}
    </div>
    {push.record.unreadable && <p className="fine">This device&rsquo;s push setting could not be read; turning it off and on again replaces it.</p>}
    {push.message && <p role={push.message.failed ? 'alert' : 'status'}>{push.message.text}</p>}
    <p className="fine">Reminders in the app itself need no account and keep working without this.</p>
  </section>;
}
