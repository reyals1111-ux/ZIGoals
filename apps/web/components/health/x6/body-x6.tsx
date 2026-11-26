'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useHideFigures} from '../../hide-figures';
import {showUndo} from '../../ui/undo-toast';
import {BODY_EXTRAS, NAMED_DAY_NAME_MAX, NAMED_DAYS_MAX, WEIGH_NOTE_MAX} from '../../../lib/body-extras/schema';
import {addNamedDay, namedDaysOf, PROJECTION_MAX_DAYS, projectOn, removeNamedDay, restoreNamedDay, type Projection} from '../../../lib/body-extras/predict';
import {setWeighNote, weighIns, weighInsCsv, type WeighIn} from '../../../lib/body-extras/weigh-notes';
import type {HealthData} from '../../../lib/health';
import {weightChangeText, weightReadingText, weightText, type WeightUnit} from '../../../lib/health-units';
import {addLocalDays} from '../../../lib/local-date';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import {saveFile} from '../../../lib/notes/doc-image';
import '../health-aa.css';
import './body-x6.css';

/**
 * Session AW (X6; Happy Scale): Health → Weight's two folded tools, one lazy chunk, each opened from its fold.
 * - `named-days` (LEDGER #456): "What the trend reaches on a day you name" — up to five days kept by name, each with the
 *   weight the trend would reach IF the last four weeks' pace continued, and the sum it used. An estimate, never a promise
 *   and never advice.
 * - `weigh-notes` (LEDGER #457): every weigh-in with its own short note and, where it is one, "lowest since …" as a fact;
 *   a filter for new lows or notes; the list as a CSV.
 * Every weight figure and mark carries `data-body-figure`, so "Hide calories and weight" hides it (and the new-lows filter
 * is set aside while it is on). Kept on this device in zigoals:body-extras:v1.
 */
export default function BodyX6({part, data, today, unit}: {part: 'named-days' | 'weigh-notes'; data: HealthData; today: string; unit: WeightUnit}) {
  return part === 'named-days' ? <NamedDays data={data} today={today} unit={unit}/> : <WeighNotes data={data} unit={unit}/>;
}

export const ESTIMATE_LINE = 'If the last 4 weeks’ pace continued; an estimate, not medical advice.';
/** The words for one day's estimate, or why there is none (shared with the tests). */
export function projectionWords(p: Projection, unit: WeightUnit): {figure: string | null; sum: string | null; why: string | null} {
  if (p.kind === 'estimate') return {figure: `About ${weightText(p.grams, unit)}`, sum: `${weightText(p.nowGrams, unit)} now, ${weightChangeText(p.weeklyGrams, unit)} a week, ${formatNumber(p.weeks, {maximumFractionDigits: 1})} ${p.weeks === 1 ? 'week' : 'weeks'}`, why: null};
  const why = p.kind === 'no-rate' ? 'Not enough weigh-ins yet: the pace needs readings at least seven days apart in the last 4 weeks.'
    : p.kind === 'passed' ? 'This day has passed. Remove it, or keep it as a note of the day.'
      : p.kind === 'too-far' ? 'More than a year ahead: a 4-week pace says nothing that far out.'
        : 'The last 4 weeks’ pace, carried that far, leaves any likely weight, so no figure is given.';
  return {figure: null, sum: null, why};
}

function NamedDays({data, today, unit}: {data: HealthData; today: string; unit: WeightUnit}) {
  const record = useDeviceRecord(BODY_EXTRAS), [name, setName] = useState(''), [on, setOn] = useState(''), [note, setNote] = useState('');
  if (!record.loaded) return null;
  const days = namedDaysOf(record.data, today), full = days.length >= NAMED_DAYS_MAX;
  function add(e: FormEvent) {
    e.preventDefault();
    try { record.update(r => addNamedDay(r, {name, on}, today)); setNote(`“${name.trim()}” is kept on this device.`); setName(''); setOn(''); }
    catch (cause) { setNote(plainErrorMessage(cause, 'That could not be saved on this device.')); }
  }
  function remove(dayId: string) {
    const day = (record.data.namedDays ?? []).find(d => d.id === dayId);
    if (!day) return;
    try {
      record.update(r => removeNamedDay(r, dayId)); setNote(`“${day.name}” is removed.`);
      showUndo({message: `“${day.name}” is removed.`, undone: `“${day.name}” is back.`, restore: () => record.update(r => restoreNamedDay(r, day))});
    } catch (cause) { setNote(plainErrorMessage(cause, 'That could not be saved on this device.')); }
  }
  return <section className="x6-tool x6-named" aria-label="A day you name">
    <p className="x6-line">{ESTIMATE_LINE} The trend today plus the weekly rate of your last 4 weeks of weigh-ins, times the weeks to that day. It says what the line would reach, not what will happen.</p>
    {record.unreadable && <p className="notice" role="alert">The days kept on this device could not be read. Their bytes are kept; saving writes a new record.</p>}
    {days.length ? <ul className="x6-list">{days.map(d => {
      const w = projectionWords(projectOn(data, today, d.on), unit);
      return <li key={d.id}>
        <div className="x6-item"><strong>{d.name}</strong> <span className="x6-day">{formatDate(d.on, {weekday: true})}</span>
          {w.figure ? <><span className="x6-figure" data-body-figure="">{w.figure}</span><span className="x6-sum" data-body-figure="">{w.sum}</span><span className="health-estimate-tag">an estimate</span></> : <span className="x6-line">{w.why}</span>}
        </div>
        <button type="button" className="quiet" onClick={() => remove(d.id)} aria-label={`Remove ${d.name}`}>Remove</button>
      </li>;
    })}</ul> : <p className="x6-line">Name a day ahead — a wedding, a race, a holiday — and see where the trend would be on it if the last 4 weeks’ pace continued. Up to {NAMED_DAYS_MAX} days, kept on this device.</p>}
    {full ? <p className="x6-line">{NAMED_DAYS_MAX} days are kept, the most there can be. Remove one to name another.</p>
      : <form className="x6-form" onSubmit={add}>
        <label className="field"><span>Name of the day</span><input value={name} onChange={e => setName(e.target.value)} maxLength={NAMED_DAY_NAME_MAX} autoComplete="off" placeholder="The wedding" required/></label>
        <label className="field"><span>The day</span><input type="date" value={on} onChange={e => setOn(e.target.value)} min={addLocalDays(today, 1)} max={addLocalDays(today, PROJECTION_MAX_DAYS)} required/></label>
        <button type="submit" className="secondary">Keep this day</button>
      </form>}
    <p className={note ? "x6-line" : "sr-only"} role="status" aria-live="polite">{note}</p>
  </section>;
}

type Filter = 'all' | 'lows' | 'notes';
const SHOWN = 30;
function lowText(w: WeighIn): string | null {
  if (!w.low) return null;
  return w.low.since ? `lowest since ${formatDate(w.low.since, {year: false})}` : 'lowest of all your readings';
}
function WeighNotes({data, unit}: {data: HealthData; unit: WeightUnit}) {
  const record = useDeviceRecord(BODY_EXTRAS), hidden = useHideFigures();
  const [filter, setFilter] = useState<Filter>('all'), [editing, setEditing] = useState<string | null>(null), [text, setText] = useState(''), [all, setAll] = useState(false), [note, setNote] = useState('');
  // The note's field takes the cursor when "Add a note" opens it.
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) field.current?.focus(); }, [editing]);
  // Closing the field puts the cursor back on that weigh-in's own button.
  const close = (weighId: string) => { setEditing(null); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-x6-note="${weighId}"]`)?.focus()); };
  if (!record.loaded) return null;
  const rows = weighIns(data.weights, record.data), shownFilter: Filter = hidden && filter === 'lows' ? 'all' : filter;
  const picked = rows.filter(w => shownFilter === 'lows' ? !!w.low : shownFilter === 'notes' ? !!w.note : true), list = all ? picked : picked.slice(0, SHOWN);
  function save(e: FormEvent, w: WeighIn) {
    e.preventDefault();
    try { record.update(r => setWeighNote(r, data.weights, w.id, text)); setNote(text.trim() ? `Note kept for ${formatDate(w.date)}.` : `Note cleared for ${formatDate(w.date)}.`); close(w.id); }
    catch (cause) { setNote(plainErrorMessage(cause, 'That could not be saved on this device.')); }
  }
  const FILTERS: [Filter, string][] = [['all', 'All weigh-ins'], ...(hidden ? [] : [['lows', 'New lows'] as [Filter, string]]), ['notes', 'With a note']];
  return <section className="x6-tool x6-notes" aria-label="Notes and new lows">
    <p className="x6-line">A short note on a weigh-in (“after the holiday”, “new scale”). “Lowest since …” marks a reading lower than every one since that day: a fact in the list, nothing more.</p>
    {record.unreadable && <p className="notice" role="alert">The notes on this device could not be read. Their bytes are kept; saving writes a new record.</p>}
    {!rows.length ? <p className="x6-line">No weigh-ins yet. Add a reading below; a note can go with it.</p> : <>
      <div className="x6-filter" role="group" aria-label="Show">{FILTERS.map(([f, label]) => <button key={f} type="button" className="secondary" aria-pressed={shownFilter === f} onClick={() => { setFilter(f); setAll(false); }}>{label}</button>)}</div>
      {hidden && <p className="x6-line">New lows are hidden with your weight figures on this device.</p>}
      {picked.length ? <ul className="x6-list" aria-label="Weigh-ins">{list.map(w => <li key={w.id}>
        <div className="x6-item"><strong>{formatDate(w.date)}</strong> <span className="x6-figure" data-body-figure="">{weightReadingText(w.grams, unit)}</span>{lowText(w) && <span className="x6-low" data-body-figure="">{lowText(w)}</span>}
          {editing === w.id ? <form className="x6-form" onSubmit={e => save(e, w)}>
            <label className="field"><span>Note for {formatDate(w.date)}</span><input value={text} onChange={e => setText(e.target.value)} maxLength={WEIGH_NOTE_MAX} autoComplete="off" placeholder="after the holiday" ref={field}/></label>
            <button type="submit" className="secondary">Save note</button><button type="button" className="quiet" onClick={() => close(w.id)}>Cancel</button>
          </form> : w.note && <span className="x6-note">“{w.note}”</span>}
        </div>
        {editing !== w.id && <button type="button" className="quiet" data-x6-note={w.id} aria-label={`${w.note ? 'Edit note' : 'Add a note'} for ${formatDate(w.date)}`} onClick={() => { setEditing(w.id); setText(w.note ?? ''); }}>{w.note ? 'Edit note' : 'Add a note'}</button>}
      </li>)}</ul> : <p className="x6-line">{shownFilter === 'lows' ? 'No new lows in your weigh-ins yet.' : 'No notes yet. “Add a note” beside a weigh-in keeps one.'}</p>}
      {picked.length > SHOWN && <button type="button" className="text-link" aria-expanded={all} onClick={() => setAll(!all)}>{all ? `Show the latest ${SHOWN}` : `Show all ${picked.length}`}</button>}
      <button type="button" className="secondary" onClick={() => saveFile(weighInsCsv(rows), 'weigh-ins.csv', 'text/csv')}>Download weigh-ins with notes (CSV)</button>
      <p className="x6-line">Made on this device; nothing is sent. Notes stay on this device (they are in Export everything too).</p>
    </>}
    <p className={note ? "x6-line" : "sr-only"} role="status" aria-live="polite">{note}</p>
  </section>;
}
