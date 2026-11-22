'use client';
import Link from 'next/link';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {DEFAULT_MORNING, MORNING_SUGGESTIONS, morningClock, morningWake, remindedSteps, saveMorning, setStepReminder, sortMorning, tickMorning} from '../../../lib/evening-plan/morning';
import {sortSteps, stepClock} from '../../../lib/evening-plan/plan';
import {EVENING_PLAN} from '../../../lib/evening-plan/schema';
import {NOTIFY_PREFS, setType, typeOn} from '../../../lib/notify/prefs';
import type {Sleep} from '../../../lib/sleep/schema';
import {formatClock} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import './av2-bodymind-sleep.css';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #236, Rise's habits at suggested times): Health → Sleep → Tonight → "Your morning
 * steps": daylight in the first hour, the first coffee once the grogginess has passed and a few more, each timed from
 * today's wake time (or the usual one) and ticked as you go; and "Reminders at your steps", a reminder at the time of each
 * chosen step, morning or evening (the notification plan's energy kind). Kept on this device in the evening plan record.
 * Plain habits of a calm morning, never medical advice. Its own chunk.
 */
export default function MorningSteps({sleep, today}: {sleep: Sleep; today: string}) {
  const record = useDeviceRecord(EVENING_PLAN), prefs = useDeviceRecord(NOTIFY_PREFS), id = useId();
  const [editing, setEditing] = useState(false), [note, setNote] = useState(''), [picked, setPicked] = useState<Set<string>>(new Set(DEFAULT_MORNING));
  if (!record.loaded) return null;
  const r = record.data, morning = r.morning, wake = morningWake(sleep, today), reminded = new Set(remindedSteps(r));
  const change = (fn: Parameters<typeof record.update>[0], said: string) => { try { record.update(fn); setNote(said); return true; } catch (e) { setNote(plainErrorMessage(e, 'That could not be saved on this device.')); return false; } };
  const at = (minutesAfter: number) => wake ? formatClock(morningClock(wake.minutes, minutesAfter)) : `${minutesAfter} min after waking`;
  const open = () => { setPicked(new Set(morning ? morning.steps.map(s => s.id) : DEFAULT_MORNING)); setEditing(true); };
  const steps = [...(r.plan ? sortSteps(r.plan.steps).map(s => ({id: s.id, label: s.label, when: formatClock(stepClock(r.plan!.bedtime, s.minutesBefore)), part: 'evening' as const})) : []),
    ...(morning ? sortMorning(morning.steps).map(s => ({id: s.id, label: s.label, when: at(s.minutesAfter), part: 'morning' as const})) : [])];
  const here = prefs.loaded && prefs.data.here === true, muted = prefs.loaded && !typeOn(prefs.data, 'energy');
  return <section className="morning-steps" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Your morning steps</h3>
    {note && <p className="fine" role="status">{note}</p>}
    {editing ? <form onSubmit={e => { e.preventDefault(); if (change(x => saveMorning(x, [...picked], new Date()), picked.size ? 'Your morning steps are saved.' : 'The morning steps are removed.')) setEditing(false); }}>
      <fieldset><legend>Steps for your mornings, timed from when you wake</legend>
        <ul>{MORNING_SUGGESTIONS.map(s => <li key={s.id}><label><input type="checkbox" checked={picked.has(s.id)} onChange={e => setPicked(p => { const n = new Set(p); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })}/><span>{s.label} <span className="fine">· {s.minutesAfter} min after waking. {s.why}</span></span></label></li>)}</ul>
      </fieldset>
      <div className="evening-actions"><button type="submit" className="primary">Save my morning steps</button><button type="button" className="quiet" onClick={() => setEditing(false)}>Cancel</button></div>
    </form>
    : morning ? <>
      <p className="fine">{wake ? wake.from === 'today' ? `Timed from your wake time today, ${formatClock(morningClock(wake.minutes, 0))}.` : `Timed from your usual wake time, ${formatClock(morningClock(wake.minutes, 0))}; log last night and they follow it.` : 'Log a night and the times follow your wake time.'}</p>
      <ul>{sortMorning(morning.steps).map(s => <li key={s.id}><label><input type="checkbox" checked={(r.mornings?.[today] ?? []).includes(s.id)} onChange={e => change(x => tickMorning(x, today, s.id, e.target.checked), e.target.checked ? `${s.label}: done this morning.` : `${s.label}: not ticked.`)}/><span><time>{at(s.minutesAfter)}</time> {s.label}</span></label></li>)}</ul>
      <div className="evening-actions"><button type="button" className="quiet" onClick={open}>Change the morning steps</button></div>
    </>
    : <><p className="fine">A few small steps after you wake — daylight in the first hour, the first coffee once the grogginess has passed — each timed from your own wake time. Plain habits, not medical advice.</p>
      <button type="button" className="secondary" onClick={open}>Choose morning steps</button></>}
    {steps.length > 0 && <details className="morning-step-reminders"><summary>Reminders at your steps{reminded.size ? ` (${reminded.size} on)` : ''}</summary>
      <ul>{steps.map(s => <li key={s.id}><label><input type="checkbox" checked={reminded.has(s.id)} onChange={e => { const on = e.target.checked; if (change(x => setStepReminder(x, s.id, on), on ? `A reminder at ${s.label.toLowerCase()}, ${s.when}.` : `No reminder at ${s.label.toLowerCase()}.`) && on && prefs.loaded && !typeOn(prefs.data, 'energy')) { try { prefs.update(p => setType(p, 'energy', true)); } catch { /* the card says it is off */ } } }}/><span>Remind me: <time>{s.when}</time> · {s.label} <span className="fine">({s.part})</span></span></label></li>)}</ul>
      {reminded.size > 0 && !here && <p className="fine">Notifications are off on this device, so these cannot reach you yet. Turn them on in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
      {reminded.size > 0 && here && muted && <p className="fine">&ldquo;Energy curve and plan steps&rdquo; is switched off in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    </details>}
  </section>;
}
