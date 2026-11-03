'use client';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {removeWithUndo} from '../ui/remove-with-undo';
import {SUPPLEMENTS, MAX_TIMES, NAME_MAX, DOSE_MAX, NOTE_MAX, EVERY_DAY, type SupplementItem, type Supplements} from '../../lib/supplements/schema';
import {addSupplement, dayBit, dayDoses, editSupplement, markSupplement, removeSupplement, setSupplementReminder, supplementSummary, type SupplementDraft} from '../../lib/supplements/log';
import {addLocalDays} from '../../lib/local-date';
import {formatClock, formatDate, formatWeekday} from '../../lib/visual-format';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {isShowcase} from '../../lib/showcase-storage';
import './supplements.css';
import {ArtNote} from '../illustrations/art-note';

/**
 * Session AK (F5b): the supplements and medication log (Health → Diary, "Supplements and medication (optional)"), on
 * this device only: what the person takes, the dose in their own words, when, and each day's taken or skipped. A local
 * reminder per time when they choose it, which never shows the name. Information only: no medical advice, no dose checks,
 * no interaction claims. A day not logged is unknown, never "missed".
 */
// The weekday choices, Monday first, written by the date format (never typed by hand): 5 Jan 2026 is a Monday.
const MONDAY = '2026-01-05', WEEK = Array.from({length: 7}, (_, i) => addLocalDays(MONDAY, i));
type Form = {name: string; dose: string; kind: SupplementItem['kind']; times: string[]; asNeeded: boolean; weekdays: number; remind: boolean; note: string};
const blank = (): Form => ({name: '', dose: '', kind: 'supplement', times: ['08:00'], asNeeded: false, weekdays: EVERY_DAY, remind: false, note: ''});
const formOf = (i: SupplementItem): Form => ({name: i.name, dose: i.dose ?? '', kind: i.kind, times: i.times.length ? [...i.times] : ['08:00'], asNeeded: !i.times.length, weekdays: i.weekdays ?? EVERY_DAY, remind: i.remind === true, note: i.note ?? ''});
const draftOf = (f: Form): SupplementDraft => ({name: f.name, dose: f.dose, kind: f.kind, times: f.asNeeded ? [] : f.times.filter(Boolean), weekdays: f.weekdays, remind: !f.asNeeded && f.remind, note: f.note});
function scheduleText(i: SupplementItem) {
  if (!i.times.length) return 'as needed';
  const days = (i.weekdays ?? EVERY_DAY) === EVERY_DAY ? 'every day' : WEEK.filter(d => ((i.weekdays ?? EVERY_DAY) & dayBit(d)) !== 0).map(d => formatWeekday(d)).join(', ');
  return `${i.times.map(formatClock).join(', ')} · ${days}`;
}
export function SupplementsCard({date, today}: {date: string; today: string}) {
  const record = useDeviceRecord(SUPPLEMENTS), r: Supplements = record.loaded && !record.unreadable ? record.data : {version: 1};
  const [form, setForm] = useState<Form>(blank), [editing, setEditing] = useState<string | null>(null), [adding, setAdding] = useState(false), [note, setNote] = useState('');
  const items = r.items ?? [], doses = date <= today ? dayDoses(r, date) : [], summary = supplementSummary(r, today, 14);
  const run = (fn: (c: Supplements) => Supplements, done: string) => { try { record.update(fn); setNote(done); return true; } catch (e) { setNote(e instanceof Error && !/storage|quota/i.test(e.message) ? e.message : `Not kept on this device. ${deviceSettingFailureMessage(e)}`); return false; } };
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({...f, [key]: value}));
  if (record.loaded && record.unreadable) return <p role="alert">Your supplements log on this device could not be read, so it is not shown or changed.</p>;
  const formOpen = adding || editing !== null;
  return <div className="supplements" role="group" aria-labelledby="supplements-title">
    <p className="eyebrow">On this device only{isShowcase() ? ' · Showcase example' : ''}</p>
    <h3 id="supplements-title">Supplements and medication</h3>
    <p className="fine">A log for your own notes. It gives no medical advice, checks no doses and makes no claims about how things work together; a pharmacist or doctor can answer those.</p>
    {!items.length && !formOpen && <ArtNote pillar="health"><p className="health-empty-inline">Keep a simple log of what you take: a name, the dose in your own words and when. Tick Taken or Skipped each day; a day you do not tick stays “not logged”. Reminders are optional and never show the name.</p></ArtNote>}
    {doses.length > 0 && <section aria-labelledby="supplements-day-title">
      <h4 id="supplements-day-title">{date === today ? 'Today' : formatDate(date)}</h4>
      <ul className="supplements-doses">{doses.map(d => <li key={`${d.itemId}|${d.slot}`}>
        <div><strong>{d.name}</strong><small>{[d.dose, d.slot === 'any' ? 'as needed' : formatClock(d.slot), d.kind === 'medication' ? 'medication' : null].filter(Boolean).join(' · ')}</small></div>
        <div className="actions" role="group" aria-label={`${d.name}${d.slot === 'any' ? '' : ` at ${formatClock(d.slot)}`}`}>
          {(['taken', 'skipped'] as const).map(status => <button key={status} type="button" className="quiet" aria-pressed={d.status === status} onClick={() => run(c => markSupplement(c, d.itemId, date, d.slot, d.status === status ? null : status, new Date().toISOString()), d.status === status ? `${d.name}: mark cleared.` : `${d.name}: ${status}.`)}>{status === 'taken' ? 'Taken' : 'Skipped'}</button>)}
        </div>
      </li>)}</ul>
    </section>}
    {items.length > 0 && <section aria-labelledby="supplements-list-title">
      <h4 id="supplements-list-title">What you keep track of</h4>
      <ul className="supplements-items">{items.map(i => { const s = summary.find(x => x.itemId === i.id); return <li key={i.id}>
        <div><strong>{i.name}</strong><small>{[i.dose, scheduleText(i), i.remind ? 'reminder on' : null].filter(Boolean).join(' · ')}</small>
          {s && <small>Last 14 days: {s.taken} taken{s.skipped ? ` · ${s.skipped} skipped` : ''}{s.notLogged ? ` · ${s.notLogged} not logged` : ''}</small>}</div>
        <div className="actions">
          {i.times.length > 0 && <button type="button" className="quiet" aria-pressed={i.remind === true} aria-label={`Reminder for ${i.name}`} onClick={() => run(c => setSupplementReminder(c, i.id, !i.remind), i.remind ? 'Reminder off.' : 'Reminder on, on this device. It never shows the name.')}>Reminder</button>}
          <button type="button" className="quiet" aria-label={`Edit ${i.name}`} onClick={() => { setEditing(i.id); setAdding(false); setForm(formOf(i)); setNote(''); }}>Edit</button>
          <button type="button" className="quiet" aria-label={`Remove ${i.name}`} onClick={() => { removeWithUndo(record.update, c => removeSupplement(c, i.id), `${i.name} removed with its log.`, `${i.name} is back.`).catch(e => setNote(`Not removed. ${deviceSettingFailureMessage(e)}`)); if (editing === i.id) setEditing(null); }}>Remove</button>
        </div>
      </li>; })}</ul>
    </section>}
    {!formOpen && <div className="actions"><button type="button" className="secondary" onClick={() => { setAdding(true); setEditing(null); setForm(blank()); setNote(''); }}>Add a supplement or medication</button></div>}
    {formOpen && <form className="supplements-form" aria-label={editing ? 'Edit this item' : 'Add a supplement or medication'} onSubmit={e => { e.preventDefault(); const ok = editing ? run(c => editSupplement(c, editing, draftOf(form)), `${form.name.trim()} saved.`) : run(c => addSupplement(c, draftOf(form), new Date().toISOString()), `${form.name.trim()} added.`); if (ok) { setAdding(false); setEditing(null); setForm(blank()); } }}>
      <label className="field"><span>Name</span><input type="text" required maxLength={NAME_MAX} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Vitamin D" /></label>
      <label className="field"><span>Dose (your own words, optional)</span><input type="text" maxLength={DOSE_MAX} value={form.dose} onChange={e => set('dose', e.target.value)} placeholder="1 capsule" /></label>
      <label className="field"><span>Kind</span><select value={form.kind} onChange={e => set('kind', e.target.value as Form['kind'])}><option value="supplement">Supplement</option><option value="medication">Medication</option></select></label>
      <label className="checkbox"><input type="checkbox" checked={form.asNeeded} onChange={e => set('asNeeded', e.target.checked)} />As needed (no set time)</label>
      {!form.asNeeded && <fieldset className="supplements-times"><legend>Times</legend>
        {form.times.map((t, n) => <div key={n} className="supplements-time"><label className="field"><span>Time {n + 1}</span><input type="time" required value={t} onChange={e => set('times', form.times.map((x, k) => k === n ? e.target.value : x))} /></label>{form.times.length > 1 && <button type="button" className="quiet" aria-label={`Remove time ${n + 1}`} onClick={() => set('times', form.times.filter((_, k) => k !== n))}>Remove</button>}</div>)}
        {form.times.length < MAX_TIMES && <button type="button" className="quiet" onClick={() => set('times', [...form.times, '20:00'])}>Add a time</button>}
      </fieldset>}
      {!form.asNeeded && <fieldset className="supplements-days"><legend>Days</legend>{WEEK.map(d => { const bit = dayBit(d); return <label key={d} className="checkbox"><input type="checkbox" checked={(form.weekdays & bit) !== 0} onChange={e => set('weekdays', e.target.checked ? form.weekdays | bit : form.weekdays & ~bit)} />{formatWeekday(d)}</label>; })}</fieldset>}
      {!form.asNeeded && <label className="checkbox"><input type="checkbox" checked={form.remind} onChange={e => set('remind', e.target.checked)} />Remind me on this device (the reminder never shows the name)</label>}
      <label className="field"><span>Note (optional)</span><input type="text" maxLength={NOTE_MAX} value={form.note} onChange={e => set('note', e.target.value)} /></label>
      <div className="actions"><button type="submit" className="primary">{editing ? 'Save' : 'Add'}</button><button type="button" className="quiet" onClick={() => { setAdding(false); setEditing(null); setNote(''); }}>Cancel</button></div>
    </form>}
    {/* Session AK (F8): always present, so the first note is announced too. */}<p className="fine" role="status" aria-live="polite">{note}</p>
    <p className="fine">Kept in this browser only and never synced; included in Export everything and removed by the account’s erase. Reminders follow this device’s notification settings and quiet hours.</p>
  </div>;
}
export default SupplementsCard;
