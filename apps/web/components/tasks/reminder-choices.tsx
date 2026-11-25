'use client';
import './aw-x1.css';
import {useId, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus} from '../ui/undo-toast';
import {NOTIFY_PREFS, setSnoozes, setTaskAgain, taskAgainOf} from '../../lib/notify/prefs';
import {AGAIN_EVERY, AGAIN_SUGGESTED, AGAIN_TIMES_MAX, AGAIN_TIMES_MIN, againWords} from '../../lib/tasks/remind-again';
import {MAX_SNOOZES, SNOOZE_MAX_MINUTES, SNOOZE_MIN_MINUTES, USUAL_SNOOZES, ownSnoozes, snoozeKey, snoozeLabel, type OwnSnooze} from '../../lib/tasks/snooze-choices';
import {SNOOZE_CHOICES} from '../../lib/tasks/reminders';
import {formatWeekdayLong} from '../../lib/visual-format';

/** The notification plan rewrites its snapshot when these change (components/notify/notify-sync.tsx NOTIFY_CHANGE). */
const NOTIFY_CHANGE = 'zigoals:notify-change';
/** Sunday to Saturday in the app's words (22 Nov 2026 was a Sunday). */
const weekdays = () => Array.from({length: 7}, (_, i) => formatWeekdayLong(`2026-11-${22 + i}`));
type Kind = 'for' | 'next' | 'tomorrow' | 'weekday';

/**
 * Session AW (X1, LEDGER #438, #439; Due's "remind again until done" and its own snooze times): in Tasks → This week, under
 * the planning choices, this device's default repeat for task reminders and up to six snooze choices of the person's own.
 * Both are kept in the notification preferences (`zigoals:notify:v1`) the moment they are chosen, and said. The repeats
 * and the snooze row work in the app with notifications off; with them on, the repeats also wake the device and the first
 * choice is the notification's snooze button. Its own chunk.
 */
export default function ReminderChoices() {
  const prefs = useDeviceRecord(NOTIFY_PREFS), id = useId();
  const [kind, setKind] = useState<Kind>('for'), [minutes, setMinutes] = useState('120'), [clock, setClock] = useState('19:00'), [weekday, setWeekday] = useState('1'), [error, setError] = useState('');
  if (!prefs.loaded) return <p className="fine" role="status">Opening your reminder choices…</p>;
  const again = taskAgainOf(prefs.data), own = ownSnoozes(prefs.data.snoozes), shown = own ?? USUAL_SNOOZES;
  const write = (change: Parameters<typeof prefs.update>[0], said: string) => {
    if (prefs.unreadable) { showStatus('Your notification choices could not be read on this device, so nothing was written over them.', {tone: 'error'}); return false; }
    try { prefs.update(change); window.dispatchEvent(new Event(NOTIFY_CHANGE)); showStatus(said); return true; }
    catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); return false; }
  };
  const setEvery = (v: string) => {
    if (v === '') { write(p => setTaskAgain(p, null), 'Task reminders go off once, as before.'); return; }
    const next = {every: Number(v), times: again?.times ?? AGAIN_SUGGESTED.times};
    write(p => setTaskAgain(p, next), `Task reminders now remind you again every ${next.every} minutes, up to ${next.times} times, until you tick Done or Snooze.`);
  };
  const setTimes = (v: string) => { if (!again) return; const next = {every: again.every, times: Number(v)}; write(p => setTaskAgain(p, next), `Task reminders remind you again ${againWords(next)}.`); };
  const add = (e: FormEvent) => {
    e.preventDefault();
    let choice: OwnSnooze;
    if (kind === 'for') {
      const m = /^\d{1,4}$/.test(minutes.trim()) ? Number(minutes) : NaN;
      if (!(m >= SNOOZE_MIN_MINUTES && m <= SNOOZE_MAX_MINUTES)) { setError(`Enter whole minutes from ${SNOOZE_MIN_MINUTES} to ${SNOOZE_MAX_MINUTES}, for example 120 for 2 hours.`); return; }
      choice = {for: m};
    } else {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock)) { setError('Choose a time, for example 19:00.'); return; }
      choice = {at: clock, day: kind === 'weekday' ? Number(weekday) : kind};
    }
    const base = own ?? [];
    if (base.some(c => snoozeKey(c) === snoozeKey(choice))) { setError(`“${snoozeLabel(choice)}” is already one of your choices.`); return; }
    if (base.length >= MAX_SNOOZES) { setError(`Six choices is the most; remove one first.`); return; }
    setError('');
    write(p => setSnoozes(p, [...base, choice]), `Added “${snoozeLabel(choice)}” to your snooze choices.${base.length ? '' : ' Your own choices replace the usual three.'}`);
  };
  const remove = (c: OwnSnooze) => { const rest = (own ?? []).filter(x => snoozeKey(x) !== snoozeKey(c)); write(p => setSnoozes(p, rest.length ? rest : null), rest.length ? `Removed “${snoozeLabel(c)}”.` : `Removed “${snoozeLabel(c)}”. The usual three are back.`); };
  const first = (c: OwnSnooze) => { const rest = (own ?? []).filter(x => snoozeKey(x) !== snoozeKey(c)); write(p => setSnoozes(p, [c, ...rest]), `“${snoozeLabel(c)}” is first now: it is the snooze button on a notification.`); };
  return <section id="reminder-choices" className="tasks-plan-settings aw-reminder-choices" aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`}>Reminders: remind again and snooze</h3>
    <div className="tasks-plan-settings-fields">
      <label className="field"><span>Remind again</span><select value={again ? String(again.every) : ''} aria-describedby={`${id}-again`} onChange={e => setEvery(e.target.value)}>
        <option value="">No, once</option>{AGAIN_EVERY.map(n => <option key={n} value={n}>Every {n} minutes</option>)}</select></label>
      {again && <label className="field"><span>Up to</span><select value={String(again.times)} onChange={e => setTimes(e.target.value)}>
        {Array.from({length: AGAIN_TIMES_MAX - AGAIN_TIMES_MIN + 1}, (_, k) => k + AGAIN_TIMES_MIN).map(n => <option key={n} value={n}>{n} times</option>)}</select></label>}
    </div>
    <p className="fine" id={`${id}-again`}>{again ? `A task reminder that has gone off comes back ${againWords(again)}, until you tick Done or Snooze. Inside your quiet hours it waits until they end.` : 'A task reminder goes off once. Choose how often it comes back until you tick Done or Snooze; one task can have its own in its editor.'}</p>
    <h4>Snooze choices</h4>
    <ul className="aw-snooze-list" aria-label={own ? 'Your snooze choices' : 'The usual snooze choices'}>
      {own ? own.map((c, i) => <li key={snoozeKey(c)}><span>{snoozeLabel(c)}{i === 0 ? ' · on the notification' : ''}</span>
        {i > 0 && <button type="button" className="text-link" aria-label={`Put “${snoozeLabel(c)}” first`} onClick={() => first(c)}>Put first</button>}
        <button type="button" className="text-link" aria-label={`Remove “${snoozeLabel(c)}”`} onClick={() => remove(c)}>Remove</button></li>)
        : SNOOZE_CHOICES.map(c => <li key={c.id}><span>{c.label}{c.id === '1h' ? ' · on the notification' : ''}</span></li>)}
    </ul>
    <p className="fine">{own ? `${shown.length} of ${MAX_SNOOZES}. They show on each reminder that has gone off; the first is also the snooze button on a notification (“Snooze ${snoozeLabel(shown[0]!)}”).` : 'No choices of your own yet: each reminder offers 15 min, 1 h and Tomorrow, and a notification “Snooze 1 h”. Add up to six of your own, such as 2 h, this evening at 19:00 or Monday 09:00; they replace these.'}</p>
    <form className="aw-snooze-add" noValidate onSubmit={add} aria-label="Add a snooze choice">
      <label className="field"><span>Snooze</span><select value={kind} onChange={e => { setKind(e.target.value as Kind); setError(''); }}>
        <option value="for">For a length</option><option value="next">Until a time later (today or tonight)</option><option value="tomorrow">Until tomorrow at</option><option value="weekday">Until a weekday at</option></select></label>
      {kind === 'for' ? <label className="field"><span>Minutes</span><input inputMode="numeric" autoComplete="off" value={minutes} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} onChange={e => { setMinutes(e.target.value); setError(''); }} /></label>
        : <>{kind === 'weekday' && <label className="field"><span>Weekday</span><select value={weekday} onChange={e => setWeekday(e.target.value)}>{weekdays().map((w, i) => <option key={w} value={i}>{w}</option>)}</select></label>}
          <label className="field"><span>Time</span><input type="time" value={clock} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} onChange={e => { setClock(e.target.value); setError(''); }} /></label></>}
      <button type="submit" className="secondary" disabled={(own?.length ?? 0) >= MAX_SNOOZES}>Add the choice</button>
      {own && <button type="button" className="quiet" onClick={() => write(p => setSnoozes(p, null), 'The usual three snooze choices are back.')}>Back to the usual three</button>}
      {error && <p id={`${id}-err`} className="tasks-field-error" role="alert">{error}</p>}
    </form>
    <p className="fine">Kept on this device. Both work in the app with notifications off; once notifications are on (Settings → Notifications), the repeats also reach this device while ZIGoals is closed.</p>
  </section>;
}
