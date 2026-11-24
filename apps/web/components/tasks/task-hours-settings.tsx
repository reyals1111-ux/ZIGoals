'use client';
import {useId, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus} from '../ui/undo-toast';
import {TASK_PLAN, type HoursBlock} from '../../lib/tasks/plan-record';
import {DEFAULT_AFTER, DEFAULT_WORK, WEEKDAY_ORDER, WEEKDAY_WORDS, afterHours, blockWords, checkBlocks, setAfterHours, setWeekdayHours, weekdayHours} from '../../lib/tasks/work-hours';
import './tasks-r4.css';

/**
 * Session AV lane 2 (r4-plan, LEDGER #301; Motion's schedules), in Tasks → This week, its own chunk: the hours tasks may be
 * placed in, per weekday (one block, or two around a break; or a day off), and the evening hours for "after hours" tasks.
 * Plan my day and Plan my week place tasks inside them; kept in `zigoals:task-plan:v1` the moment they are saved, and said.
 */
const CHOICES = [
  {value: 'weekdays', label: 'Monday to Friday', days: [1, 2, 3, 4, 5]},
  {value: 'weekend', label: 'Saturday and Sunday', days: [6, 0]},
  ...WEEKDAY_ORDER.map(d => ({value: String(d), label: WEEKDAY_WORDS[d], days: [d]})),
] as const;
type Kind = 'usual' | 'hours' | 'off';
export default function TaskHoursSettings() {
  const plan = useDeviceRecord(TASK_PLAN), id = useId(), p = plan.data;
  const [which, setWhich] = useState('weekdays'), [kind, setKind] = useState<Kind>('hours');
  const [from, setFrom] = useState('09:00'), [to, setTo] = useState('17:30'), [breakFrom, setBreakFrom] = useState(''), [breakTo, setBreakTo] = useState('');
  const [eveFrom, setEveFrom] = useState(afterHours(p).from), [eveTo, setEveTo] = useState(afterHours(p).to), [error, setError] = useState(''), [eveError, setEveError] = useState('');
  if (!plan.loaded) return <p className="fine" role="status">Opening your hours…</p>;
  const choice = CHOICES.find(c => c.value === which) ?? CHOICES[0];
  const write = (fn: Parameters<typeof plan.update>[0], said: string): boolean => {
    if (plan.unreadable) { showStatus('Your planning choices could not be read on this device, so nothing was written over them.', {tone: 'error'}); return false; }
    try { plan.update(fn); showStatus(said); return true; } catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); return false; }
  };
  const blocks = (): HoursBlock[] | string => {
    if (!breakFrom && !breakTo) return [{from, to}];
    if (!breakFrom || !breakTo) return 'Give the break a start and an end, or leave both empty.';
    if (!(from < breakFrom && breakFrom < breakTo && breakTo < to)) return 'The break sits inside the hours: it starts after they start and ends before they end.';
    return [{from, to: breakFrom}, {from: breakTo, to}];
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const b = kind === 'hours' ? blocks() : kind === 'off' ? [] : null;
    if (typeof b === 'string') { setError(b); return; }
    const wrong = b ? checkBlocks(b) : null;
    if (wrong) { setError(wrong); return; }
    setError('');
    write(x => setWeekdayHours(x, choice.days, b), b === null ? `${choice.label}: the usual hours, ${blockWords(DEFAULT_WORK)}.` : `${choice.label}: ${b.length ? blockWords(b) : 'a day off, no tasks are placed'}.`);
  };
  const saveEvening = (e: FormEvent) => {
    e.preventDefault();
    const wrong = checkBlocks([{from: eveFrom, to: eveTo}]);
    if (wrong) { setEveError(wrong); return; }
    setEveError('');
    write(x => setAfterHours(x, eveFrom === DEFAULT_AFTER.from && eveTo === DEFAULT_AFTER.to ? null : {from: eveFrom, to: eveTo}), `Evening hours for “after hours” tasks: ${blockWords([{from: eveFrom, to: eveTo}])}.`);
  };
  return <details className="tasks-hours">
    <summary>Working hours <small>where Plan my day and Plan my week place tasks</small></summary>
    <ul className="tasks-hours-week" aria-label="Your hours this week">{WEEKDAY_ORDER.map(d => <li key={d}><strong>{WEEKDAY_WORDS[d]}</strong><span>{blockWords(weekdayHours(p, d))}{p.workHours?.days?.[String(d)] ? '' : ' (the usual)'}</span></li>)}</ul>
    <form className="tasks-hours-form" aria-labelledby={`${id}-set`} noValidate onSubmit={save}>
      <p id={`${id}-set`} className="sr-only">Set the hours of a day</p>
      <label className="field"><span>Day</span><select value={which} onChange={e => setWhich(e.target.value)}>{CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <fieldset><legend>Hours</legend>
        {(['hours', 'off', 'usual'] as const).map(k => <label key={k} className="tasks-hours-choice"><input type="radio" name={`${id}-kind`} checked={kind === k} onChange={() => setKind(k)} /> {k === 'hours' ? 'These hours' : k === 'off' ? 'A day off' : `The usual (${blockWords(DEFAULT_WORK)})`}</label>)}
      </fieldset>
      {kind === 'hours' && <>
        <label className="field"><span>From</span><input type="time" value={from} onChange={e => setFrom(e.target.value || '09:00')} /></label>
        <label className="field"><span>Until</span><input type="time" value={to} onChange={e => setTo(e.target.value || '17:30')} /></label>
        <label className="field"><span>Break from — optional</span><input type="time" value={breakFrom} onChange={e => setBreakFrom(e.target.value)} /></label>
        <label className="field"><span>Break until — optional</span><input type="time" value={breakTo} onChange={e => setBreakTo(e.target.value)} /></label>
      </>}
      <button type="submit" className="secondary">Save {choice.label}</button>
      {error && <p className="tasks-field-error" role="alert">{error}</p>}
    </form>
    <form className="tasks-hours-form" aria-labelledby={`${id}-eve`} noValidate onSubmit={saveEvening}>
      <p id={`${id}-eve`} className="fine">Evening hours, for a task marked “after hours” in its editor (a hobby, a call abroad): now {blockWords([afterHours(p)])}.</p>
      <label className="field"><span>Evening from</span><input type="time" value={eveFrom} onChange={e => setEveFrom(e.target.value || DEFAULT_AFTER.from)} /></label>
      <label className="field"><span>Evening until</span><input type="time" value={eveTo} onChange={e => setEveTo(e.target.value || DEFAULT_AFTER.to)} /></label>
      <button type="submit" className="secondary">Save evening hours</button>
      {eveError && <p className="tasks-field-error" role="alert">{eveError}</p>}
    </form>
    <p className="fine">Nothing is placed outside these hours. A day off gets no tasks from a plan; you can still give a task that day yourself. Kept on this device.</p>
  </details>;
}
