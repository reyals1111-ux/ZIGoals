'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {habitDay, habitRuleOn, type Habit} from '../../lib/habits';
import {CHECKLIST_MAX_ITEMS, CHECKLIST_TEXT_MAX, checklistLine, checklistToday, setChecklistSteps, stepsFromLines, tickStep} from '../../lib/habit-checklist/checklist';
import {deviceSettingFailureMessage, storageMessageOr} from '../../lib/storage-error-copy';
import type {HabitCardStore} from './use-habits';
import type {HabitExtrasState} from './use-habit-extras';
import './habit-checklist.css';

/**
 * Session AL Part 15 (AL-COMPETITOR-GAP-105; C-NB-11, C-NB-35): a checklist inside a habit. `part="ticks"` is on the card
 * itself, only for a habit that has steps: one checkbox per step for today. Ticking the last step of a yes/no habit that is
 * due today checks it in (the person's own tick; the check-in has its usual Undo on the card). `part="editor"` sits in
 * the card's Details: "One step per line". The steps and today's ticks are kept in the habit extras (lib/habit-checklist).
 */
export function HabitChecklist({habit, store, extras, keep, part}: {habit: Habit; store: HabitCardStore; extras: HabitExtrasState; keep: ReadonlySet<string>; part: 'ticks' | 'editor'}) {
  const id = useId(), usable = extras.loaded && !extras.unreadable, now = usable ? checklistToday(extras.data, habit.id, store.today) : null;
  const [said, setSaid] = useState(''), [error, setError] = useState(''), [editing, setEditing] = useState(false), [draft, setDraft] = useState('');
  const box = useRef<HTMLTextAreaElement>(null), opened = useRef(false);
  useEffect(() => { if (editing) { opened.current = true; box.current?.focus(); } }, [editing]);
  const returnHere = (el: HTMLButtonElement | null) => { if (el && opened.current) { opened.current = false; el.focus(); } };
  if (!usable) return null;
  if (part === 'ticks') {
    if (!now) return null;
    const rule = habitRuleOn(habit, store.today), day = habitDay(habit, store.today, store.today);
    const checksIn = rule?.state === 'active' && rule.type === 'build' && rule.measurement.kind === 'boolean' && day.scheduled;
    async function toggle(stepId: string, on: boolean) {
      setError('');
      try {
        const next = extras.update(r => tickStep(r, habit.id, stepId, store.today, on));
        const after = checklistToday(next, habit.id, store.today);
        if (on && after?.all && checksIn && day.status !== 'complete') {
          try { await store.smartDone(habit.id, store.today); setSaid(`All ${after.total} steps done: ${habit.title} is checked in for today.`); }
          catch (e) { setSaid(''); setError(`All steps are ticked, but the check-in was not saved. ${storageMessageOr(e, 'Try again.')}`); }
        } else setSaid(after ? checklistLine(after) : '');
      } catch (e) { setError(`Not saved. ${deviceSettingFailureMessage(e)}`); }
    }
    return <fieldset className="habit-checklist" aria-describedby={`${id}-line`}>
      <legend className="sr-only">Steps of {habit.title} today</legend>
      <ul>{now.items.map(item => <li key={item.id}><label className="checkbox"><input type="checkbox" checked={now.ticked.has(item.id)} disabled={rule?.state !== 'active'} onChange={e => void toggle(item.id, e.target.checked)}/><span>{item.text}</span></label></li>)}</ul>
      <p className="fine" id={`${id}-line`}>{checklistLine(now)}{checksIn && !now.all && day.status !== 'complete' ? ' · the last tick checks the habit in' : ''}. A new day starts with every step open.</p>
      {/* aria-live, not role=status: the card's own status line (a check-in's result) stays the one status in the card */}<p className="sr-only habit-checklist-said" aria-live="polite">{said}</p>
      {error && <p role="alert" className="habit-inline-error">{error}</p>}
    </fieldset>;
  }
  function save(text: string) {
    try {
      const steps = stepsFromLines(text);
      extras.update(r => setChecklistSteps(r, habit.id, steps, store.today, keep));
      setError(''); setEditing(false); setSaid(steps.length ? `Checklist saved: ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}.` : 'Checklist removed.');
    } catch (e) { setError(e instanceof RangeError ? e.message : `Not saved. ${deviceSettingFailureMessage(e)}`); }
  }
  return <div className="habit-checklist-editor">
    {!editing && <p className="fine">{now ? `${now.total} ${now.total === 1 ? 'step' : 'steps'} inside this habit, ticked on the card.` : 'A habit with several parts, like a morning routine, can hold its own steps to tick each day.'} <button ref={returnHere} type="button" className="quiet" aria-label={`${now ? 'Edit' : 'Add'} the checklist of ${habit.title}`} onClick={() => { setDraft(now ? now.items.map(i => i.text).join('\n') : ''); setSaid(''); setEditing(true); }}>{now ? 'Edit checklist' : 'Add a checklist'}</button></p>}
    {editing && <form aria-label={`Checklist of ${habit.title}`} noValidate onSubmit={e => { e.preventDefault(); save(draft); }}>
      <label className="field"><span>Steps, one per line (at most {CHECKLIST_MAX_ITEMS}, {CHECKLIST_TEXT_MAX} characters each)</span><textarea ref={box} rows={4} value={draft} onChange={e => setDraft(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} placeholder={'Make the bed\nStretch\nGlass of water'}/></label>
      <div className="actions"><button type="submit" className="secondary">Save checklist</button>{now && <button type="button" className="quiet" onClick={() => save('')}>Remove checklist</button>}<button type="button" className="quiet" onClick={() => { setEditing(false); setError(''); }}>Cancel</button></div>
    </form>}
    {/* aria-live, not role=status: the card's own status line (a check-in's result) stays the one status in the card */}<p className="sr-only habit-checklist-said" aria-live="polite">{said}</p>
    {error && <p role="alert" className="habit-inline-error" id={`${id}-error`}>{error}</p>}
  </div>;
}
export default HabitChecklist;
