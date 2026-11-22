'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import {formatDate} from '../../../lib/visual-format';
import {PLANNED_WORKOUTS, type PlannedRecord, type StatusKind} from '../../../lib/workouts/planned';
import {clearStatus, currentStatus, lastEnded, setStatus, STATUS_KINDS, STATUS_WORDS, withStatuses} from '../../../lib/workouts/status';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import {useDeviceRecord} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';
import './gym-r5.css';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #374, Gentler Streak's activity status): Health → Workouts → Start a workout →
 * "Your status". Ill, injured, on a break or travelling, from a day until you clear it: its days' planned workouts are set
 * aside (never missed), its weeks pass over your week streak, and the training load is not compared; when you are back it
 * says so. The status stays on this device and never goes in a notification. Everyday words, no advice. Its own chunk.
 */
const day = (d: string) => formatDate(d, {weekday: true, year: false});
export default function WorkoutStatus({today}: {today: string}) {
  const rec = useDeviceRecord(PLANNED_WORKOUTS), id = useId(), back = useRef<HTMLButtonElement>(null), setBtn = useRef<HTMLButtonElement>(null);
  const [kind, setKind] = useState<StatusKind>('break'), [from, setFrom] = useState(today), [said, setSaid] = useState(''), [changing, setChanging] = useState(false);
  if (!rec.loaded) return null;
  if (rec.unreadable) return <p className="fine" role="alert">Your plan on this device could not be read, so a status cannot be set here now.</p>;
  const r: PlannedRecord = rec.data, open = currentStatus(r, today), ended = open ? null : lastEnded(r, today);
  const keep = (change: (c: PlannedRecord) => PlannedRecord, text: string, undone: string) => {
    const before = r.statuses;
    try { rec.update(change); } catch (e) { setSaid(e instanceof Error && !/storage|quota/i.test(e.message) ? e.message : `Not kept on this device. ${deviceSettingFailureMessage(e)}`); return false; }
    setSaid(text); showUndo({message: text, undone, restore: () => rec.update(c => withStatuses(c, before))});
    return true;
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const words = STATUS_WORDS[kind];
    if (keep(c => setStatus(c, {kind, from, today, id: `status-${crypto.randomUUID()}`, now: new Date().toISOString()}), `Status set: ${words.since} since ${day(from)}. Planned workouts in that time are set aside.`, 'The status is as it was.')) {
      setChanging(false); requestAnimationFrame(() => back.current?.focus());
    }
  };
  return <div className="r5-status">
    <p className="fine">For a time you cannot train as usual. While a status is set, its days’ planned workouts are set aside (never missed), its weeks pass over your week streak, and the training load is not compared. It stays on this device and is never put in a notification.</p>
    {open && <p className="r5-status-now" role="status"><strong>{STATUS_WORDS[open.kind].en}</strong> since {day(open.from)}. Planned workouts are set aside until you clear it.</p>}
    {!open && ended && <p className="fine">Back after a break: your last status ended on {day(ended.to!)}.</p>}
    {open && !changing ? <div className="actions">
      <button ref={back} type="button" className="secondary" onClick={() => { if (keep(c => clearStatus(c, today), 'Welcome back: the status is cleared. Planned workouts from today count again.', `${STATUS_WORDS[open.kind].en} is set again.`)) requestAnimationFrame(() => setBtn.current?.focus()); }}>I’m back: clear the status</button>
      <button type="button" className="quiet" onClick={() => { setKind(open.kind); setFrom(open.from); setChanging(true); }}>Change it</button>
    </div> : <form className="r5-status-form" onSubmit={submit} aria-labelledby={`${id}-legend`}>
      <fieldset><legend id={`${id}-legend`}>{open ? 'Change your status' : 'Set a status'}</legend>
        <div className="r5-choices">{STATUS_KINDS.map(k => <label key={k} className="r5-choice"><input type="radio" name={`${id}-kind`} checked={kind === k} onChange={() => setKind(k)}/> {STATUS_WORDS[k].en}</label>)}</div>
      </fieldset>
      <label className="field"><span>Since</span><input type="date" max={today} value={from} onChange={e => setFrom(e.target.value)}/></label>
      <div className="actions"><button ref={setBtn} type="submit" className="secondary">{open ? 'Save the status' : 'Set this status'}</button>{open && <button type="button" className="quiet" onClick={() => setChanging(false)}>Cancel</button>}</div>
    </form>}
    <p className="sr-only" role="status" aria-live="polite">{said}</p>
  </div>;
}
