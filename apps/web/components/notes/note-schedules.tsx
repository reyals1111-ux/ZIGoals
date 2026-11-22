'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import type {Notes, NoteSchedule, ScheduleEvery} from '../../lib/notes/schema';
import {MAX_TEMPLATE_BODY, SCHEDULE_TITLE_MAX} from '../../lib/notes/schema';
import {addSchedule, changeSchedule, everyWords, pauseSchedule, periodStart, removeSchedule, restoreSchedule, scheduleTitle, schedulesOf, type ScheduleInput} from '../../lib/notes/schedules';
import {showUndo} from '../ui/undo-toast';
import type {Change} from './note-editor';
import {SecretGuard} from '../secret-guard/secret-guard';
import {formatWeekdayLong} from '../../lib/visual-format';

/**
 * Session AV lane 2 (notes; LEDGER #32, Notion's repeating database templates): "Repeating notes" — a note template that
 * makes a new note each day, every week on a weekday, or every month on a day; the note for the current period is made
 * when Notes opens (never twice, never for a period missed while closed). Edit, pause and remove (with Undo). Loaded when
 * its fold opens.
 */
/** Sunday … Saturday in the app's own words (Sunday 22 Nov 2026 at noon, then each day after it). */
const DAYS = Array.from({length: 7}, (_, i) => formatWeekdayLong(new Date(2026, 10, 22 + i, 12)));
const blank = (): ScheduleInput => ({title: '', body: '', every: 'week', weekday: 1, monthDay: 1});
export default function NoteSchedules({record, change, today}: {record: Notes; change: Change; today: string}) {
  const id = useId(), box = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<ScheduleInput | null>(null), [editing, setEditing] = useState<string | null>(null), [problem, setProblem] = useState('');
  const list = schedulesOf(record);
  const focus = (sel: string) => requestAnimationFrame(() => (box.current?.querySelector<HTMLElement>(sel) ?? box.current?.querySelector<HTMLElement>('.note-schedule-add'))?.focus());
  const open = (s?: NoteSchedule) => { setProblem(''); setEditing(s?.id ?? null); setForm(s ? {title: s.title, body: s.body, every: s.every, weekday: s.weekday ?? 1, monthDay: s.monthDay ?? 1} : blank()); };
  const close = () => { const was = editing; setForm(null); setEditing(null); setProblem(''); focus(was ? `[data-edit="${was}"]` : '.note-schedule-add'); };
  const save = (event: FormEvent) => {
    event.preventDefault(); if (!form) return;
    let issue = '';
    const ok = change(r => { try { return editing ? changeSchedule(r, editing, form) : addSchedule(r, form); } catch (e) { issue = e instanceof Error ? e.message : 'This could not be kept.'; throw e; } }, editing ? `“${form.title.trim()}” is saved. Its next note follows the new words.` : `“${form.title.trim()}” repeats ${everyWords(form)}. Its first note is made the next time Notes opens.`);
    if (!ok) { setProblem(issue || 'This could not be kept on this device.'); return; }
    close();
  };
  const remove = (s: NoteSchedule) => {
    let gone: {s: NoteSchedule; at: number} | null = null;
    if (!change(r => { const out = removeSchedule(r, s.id); if (out.removed) gone = {s: out.removed, at: out.at}; return out.record; }, '')) return;
    const kept = gone as {s: NoteSchedule; at: number} | null;
    if (kept) showUndo({message: `“${s.title}” no longer repeats. The notes it made stay.`, undone: `“${s.title}” repeats again.`, restore: () => { change(r => restoreSchedule(r, kept.s, kept.at), ''); }});
    focus('.note-schedule-add');
  };
  return <div className="note-schedules" ref={box}>
    <p className="fine">A repeating note starts from the words you give it, {`{date}`} becoming its day. Its note for this day, week or month is made when Notes opens.</p>
    {list.length > 0 && <ul className="note-schedule-list" aria-label="Your repeating notes">{list.map(s => <li key={s.id}>
      <p className="note-schedule-name"><strong>{s.title}</strong> <span className="fine">· {everyWords(s)}{s.paused ? ' · paused' : s.lastMade === periodStart(s, today) ? ` · made “${scheduleTitle(s, periodStart(s, today))}”` : ' · next note when Notes opens'}</span></p>
      <div className="note-actions">
        <button type="button" className="quiet" data-edit={s.id} aria-label={`Edit the repeating note “${s.title}”`} onClick={() => open(s)}>Edit</button>
        <button type="button" className="quiet" aria-pressed={!!s.paused} aria-label={`Pause the repeating note “${s.title}”`} onClick={() => change(r => pauseSchedule(r, s.id, !s.paused), s.paused ? `“${s.title}” repeats again.` : `“${s.title}” is paused.`)}>{s.paused ? 'Paused' : 'Pause'}</button>
        <button type="button" className="quiet" aria-label={`Stop the repeating note “${s.title}”`} onClick={() => remove(s)}>Stop repeating</button>
      </div>
    </li>)}</ul>}
    {form ? <form className="note-schedule-form" aria-label={editing ? 'Edit a repeating note' : 'A new repeating note'} onSubmit={save} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
      <label className="field"><span>Title</span><input autoFocus value={form.title} maxLength={SCHEDULE_TITLE_MAX} placeholder="Week plan" onChange={e => { setForm({...form, title: e.target.value}); setProblem(''); }}/></label>
      <SecretGuard text={form.title} onRemove={() => setForm({...form, title: ''})}/>
      <fieldset className="note-schedule-every"><legend>Repeats</legend>
        {(['day', 'week', 'month'] as ScheduleEvery[]).map(every => <label key={every} className="note-schedule-choice"><input type="radio" name={`${id}-every`} checked={form.every === every} onChange={() => setForm({...form, every})}/> {every === 'day' ? 'Every day' : every === 'week' ? 'Every week' : 'Every month'}</label>)}
      </fieldset>
      {form.every === 'week' && <label className="field"><span>On</span><select value={form.weekday ?? 1} onChange={e => setForm({...form, weekday: Number(e.target.value)})}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>}
      {form.every === 'month' && <label className="field"><span>On day</span><select value={form.monthDay ?? 1} onChange={e => setForm({...form, monthDay: Number(e.target.value)})}>{Array.from({length: 28}, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>}
      <label className="field"><span>Its words</span><textarea rows={6} maxLength={MAX_TEMPLATE_BODY} value={form.body} placeholder={'Three things this week:\n- \n\nLinks: [[Run a 10k]]'} onChange={e => { setForm({...form, body: e.target.value}); setProblem(''); }}/></label>
      <SecretGuard text={form.body} onRemove={() => setForm({...form, body: ''})}/>
      <div className="note-actions"><button type="submit" className="primary">{editing ? 'Save' : 'Keep this repeating note'}</button><button type="button" className="quiet" onClick={close}>Cancel</button></div>
      {problem && <p className="field-error" role="alert">{problem}</p>}
    </form> : <button type="button" className="secondary note-schedule-add" onClick={() => open()}>Make a repeating note</button>}
  </div>;
}
