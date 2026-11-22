'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import type {Habit} from '../../lib/habits';
import {areaWeekRows, withAreaGoal, type AreaWeekRow} from '../../lib/habit-areas/week';
import {formatNumber} from '../../lib/visual-format';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {HabitExtrasState} from './use-habit-extras';
import './habit-options.css';

/**
 * Session AV lane 2 (habits; LEDGER #53, Finch's Self-Care Areas and Weekly Milestones): each life area's week — "Health:
 * 9 of 12 this week" — with its weekly milestone (every check-in due, or the person's own number) and the weeks in a
 * row it was reached. Loaded when the fold opens. An empty state teaches where an area is chosen.
 */
export default function HabitAreasWeek({habits, extras, today}: {habits: readonly Habit[]; extras: HabitExtrasState; today: string}) {
  if (!extras.loaded) return null;
  if (extras.unreadable) return <p role="alert" className="fine">Your areas on this device could not be read, so they are not shown.</p>;
  const rows = areaWeekRows(habits, extras.data, extras.areas, today);
  if (!rows.length) return <p className="fine habit-areas-empty">No habit has a life area yet. Open a habit&rsquo;s Details and choose <strong>◈ Choose an area</strong>: each area then shows its week here, with a weekly milestone.</p>;
  return <ul className="habit-areas-week" aria-label="Your areas this week">{rows.map(r => <AreaRow key={r.id} row={r} extras={extras} />)}</ul>;
}
function AreaRow({row, extras}: {row: AreaWeekRow; extras: HabitExtrasState}) {
  const [editing, setEditing] = useState(false), [value, setValue] = useState(String(row.goal || '')), [said, setSaid] = useState(''), [error, setError] = useState('');
  const save = (goal: number | null) => {
    try { extras.update(r => withAreaGoal(r, row.id, goal)); setError(''); setSaid(goal === null ? `${row.label}: the milestone is every check-in due again.` : `${row.label}: your weekly milestone is ${formatNumber(goal)}.`); setEditing(false); }
    catch (cause) { setError(cause instanceof Error && /whole number/.test(cause.message) ? cause.message : `Not saved on this device. ${deviceSettingFailureMessage(cause)}`); }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); const n = Number(value); save(Number.isInteger(n) && n >= 1 && n <= 500 ? n : NaN); };
  const id = `area-goal-${row.id}`, opener = useRef<HTMLButtonElement>(null), wasEditing = useRef(false);
  // Closing the form (Save, Cancel, Escape) gives focus back to its button, never to the page.
  useEffect(() => { if (wasEditing.current && !editing) opener.current?.focus(); wasEditing.current = editing; }, [editing]);
  return <li className="habit-area-week">
    <p className="habit-area-week-line"><strong>{row.label}</strong>: {formatNumber(row.done)} of {formatNumber(row.due)} this week <span className="fine">· {formatNumber(row.habits)} {row.habits === 1 ? 'habit' : 'habits'}</span></p>
    <progress max={Math.max(1, row.goal)} value={Math.min(row.done, Math.max(1, row.goal))} aria-label={`${row.label}: ${row.done} of ${row.goal} toward this week's milestone`} />
    <p className="fine">{row.goal > 0 ? `Weekly milestone: ${formatNumber(row.goal)}${row.own ? ' (your own)' : ' (every check-in due)'}` : 'Nothing due this week yet'}{row.reached ? ' · reached ✓' : ''}{row.weeksInRow > 1 ? ` · ${formatNumber(row.weeksInRow)} weeks in a row` : ''}</p>
    {!editing ? <button ref={opener} type="button" className="quiet" aria-label={`Set the weekly milestone for ${row.label}`} onClick={() => { setValue(String(row.goal || '')); setSaid(''); setEditing(true); }}>Set the milestone</button>
      : <form className="habit-area-goal" onSubmit={submit}>
        <label className="field" htmlFor={id}><span>Check-ins a week for {row.label}</span><input id={id} type="number" inputMode="numeric" min={1} max={500} step={1} autoFocus value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setEditing(false); } }} /></label>
        <button type="submit" className="secondary">Save</button>
        {row.own && <button type="button" className="quiet" onClick={() => save(null)}>Every check-in due</button>}
        <button type="button" className="quiet" onClick={() => setEditing(false)}>Cancel</button>
      </form>}
    <p className="fine" role="status">{said}</p>
    {error && <p className="fine" role="alert">{error}</p>}
  </li>;
}
