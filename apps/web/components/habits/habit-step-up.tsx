'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import type {Habit} from '../../lib/habits';
import {STEP_MAX, setStepUp, sizeWords, stepUpOf, type Size} from '../../lib/habits-v2/step-up';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {showStatus} from '../ui/undo-toast';
import type {HabitExtrasState} from './use-habit-extras';
import './habit-mind.css';

/**
 * Session AV lane 2 (r4-mind; LEDGER #327, Atoms' start small, then step up): in a habit's Details — its small version
 * ("one page") beside the habit itself and the next step ("two pages"), which one the person is doing now, and the opt-in
 * step-up card (off by default). Choosing a size changes only what this card says; the habit's own target stays as it is.
 * Its own chunk, loaded with the habit's when and where.
 */
const SIZE_WORDS: Record<Size, string> = {small: 'The small version', full: 'The habit itself', next: 'The next step'};
export default function HabitStepUp({habit, extras, today}: {habit: Habit; extras: HabitExtrasState; today: string}) {
  const id = useId(), first = useRef<HTMLInputElement>(null), opener = useRef<HTMLButtonElement>(null);
  const s = stepUpOf(extras.data, habit.id);
  const [open, setOpen] = useState(false), [small, setSmall] = useState(s.small ?? ''), [next, setNext] = useState(s.next ?? ''), [error, setError] = useState('');
  const write = (change: Parameters<typeof setStepUp>[2], said: string) => {
    try { extras.update(r => setStepUp(r, habit.id, change)); setError(''); showStatus(said); return true; }
    catch (e) { setError(e instanceof Error && /^Write the/.test(e.message) ? e.message : `Not saved. ${deviceSettingFailureMessage(e)}`); return false; }
  };
  const save = (event: FormEvent) => { event.preventDefault(); if (write({small, next}, 'The sizes are saved.')) { setOpen(false); requestAnimationFrame(() => opener.current?.focus()); } };
  if (!extras.loaded || extras.unreadable) return null;
  const sizes = (['small', 'full', 'next'] as const).filter(z => z === 'full' || (z === 'small' ? s.small : s.next));
  return <div className="habit-step-up">
    <p className="habit-step-up-title"><strong>Start small, then step up</strong></p>
    {!open && (s.small || s.next ? <>
      <p className="fine">Now: <strong>{sizeWords(habit, s)}</strong>{s.now !== 'full' && <> ({SIZE_WORDS[s.now].toLowerCase()})</>}</p>
      {sizes.length > 1 && <fieldset className="habit-step-up-sizes"><legend className="sr-only">What you are doing now for {habit.title}</legend>
        {sizes.map(z => <label key={z} className="switch-row"><input type="radio" name={`${id}-size`} checked={s.now === z} onChange={() => write({now: z, since: today}, `Now: ${sizeWords(habit, s, z)}. The habit itself stays as it is.`)}/> <span>{SIZE_WORDS[z]}: {sizeWords(habit, s, z)}</span></label>)}
      </fieldset>}
    </> : <p className="fine">A habit is easier to keep when it can be small on a busy day: write a small version (“one page”) and, if you like, the next step (“two pages”).</p>)}
    {!open && <button ref={opener} type="button" className="quiet" aria-label={`${s.small || s.next ? 'Edit' : 'Add'} the small version and the next step for ${habit.title}`} onClick={() => { setSmall(s.small ?? ''); setNext(s.next ?? ''); setOpen(true); requestAnimationFrame(() => first.current?.focus()); }}>{s.small || s.next ? 'Edit the sizes' : 'Add a small version'}</button>}
    {open && <form className="habit-step-up-form" aria-label={`Sizes for ${habit.title}`} onSubmit={save} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); requestAnimationFrame(() => opener.current?.focus()); } }}>
      <label className="field"><span>The small version</span><input ref={first} type="text" maxLength={STEP_MAX} value={small} onChange={e => setSmall(e.target.value)} placeholder="One page"/></label>
      <label className="field"><span>The next step (optional)</span><input type="text" maxLength={STEP_MAX} value={next} onChange={e => setNext(e.target.value)} placeholder="Two pages"/></label>
      <div className="actions"><button type="submit" className="secondary">Save</button><button type="button" className="quiet" onClick={() => { setOpen(false); requestAnimationFrame(() => opener.current?.focus()); }}>Cancel</button></div>
    </form>}
    {(s.small || s.next) && <label className="switch-row"><input type="checkbox" checked={s.card} onChange={e => write({card: e.target.checked}, e.target.checked ? 'The step-up card is on: after four steady weeks it offers the next size; after two thin weeks, the small one.' : 'The step-up card is off.')}/> <span>Offer a step up after four steady weeks, and the small version after two thin ones (you decide each time)</span></label>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}
