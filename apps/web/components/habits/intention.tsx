'use client';
import {useEffect, useRef, useState} from 'react';
import type {Habit} from '../../lib/habits';
import {habitIntention, intentionLine, INTENTION_MAX, setHabitIntention, WHY_MAX} from '../../lib/habit-intentions/intentions';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {HabitExtrasState} from './use-habit-extras';
import {TimeSuggest} from './time-suggest';
import './intention.css';

/**
 * Session AK (F5b): a habit's implementation intention on its card ("After I pour my coffee → 2 min stretch · in the
 * kitchen"): when and where, in the person's own words, kept in the habit extras (it travels with them as the habit's
 * time does). Below it, the usual-time offer (time-suggest.tsx). Loaded when the card's Details open.
 */
export function HabitIntention({habit, extras, keep, today, zone}: {habit: Habit; extras: HabitExtrasState | null; keep: ReadonlySet<string>; today: string; zone: string}) {
  const usable = !!extras?.loaded && !extras.unreadable, current = usable ? habitIntention(extras!.data, habit.id) : null;
  const [open, setOpen] = useState(false), [when, setWhen] = useState(current?.when ?? ''), [where, setWhere] = useState(current?.where ?? ''), [why, setWhy] = useState(current?.why ?? ''), [error, setError] = useState('');
  const line = intentionLine(habit.title, current);
  // Session AK (F8, WCAG 2.4.3): the form replaces the button that opened it, so focus moves to its first field, and back
  // to that button (Edit, or Add when and where) when the form closes.
  const first = useRef<HTMLInputElement>(null), wasOpen = useRef(false);
  useEffect(() => { if (open) { wasOpen.current = true; first.current?.focus(); } }, [open]);
  const returnHere = (el: HTMLButtonElement | null) => { if (el && wasOpen.current) { wasOpen.current = false; el.focus(); } };
  const save = (draft: {when: string; where: string; why?: string} | null) => {
    try { extras!.update(r => setHabitIntention(r, habit.id, draft, keep)); setError(''); setOpen(false); } catch (e) { setError(`Not saved. ${deviceSettingFailureMessage(e)}`); }
  };
  return <div className="habit-intention">
    {usable && !open && (line
      ? <p className="habit-intention-line"><span>{line}</span> <button ref={returnHere} type="button" className="quiet" aria-label={`Edit when and where for ${habit.title}`} onClick={() => { setWhen(current?.when ?? ''); setWhere(current?.where ?? ''); setWhy(current?.why ?? ''); setOpen(true); }}>Edit</button></p>
      : <p className="fine habit-intention-empty">Deciding when and where makes a habit easier to start: “After I pour my coffee, in the kitchen.” <button ref={returnHere} type="button" className="quiet" aria-label={`Add when and where for ${habit.title}`} onClick={() => { setWhy(current?.why ?? ''); setOpen(true); }}>Add when and where</button></p>)}
    {/* Session AL Part 15 (AL-COMPETITOR-GAP-100; C-NB-02): the habit's own why, in the person's words, edited with when and where */}
    {usable && !open && (current?.why
      ? <p className="habit-intention-why"><span>Why: {current.why}</span> <button type="button" className="quiet" aria-label={`Edit why ${habit.title} matters`} onClick={() => { setWhen(current?.when ?? ''); setWhere(current?.where ?? ''); setWhy(current.why ?? ''); setOpen(true); }}>Edit</button></p>
      : <p className="fine habit-intention-empty">A reason in your own words helps on the days it is hard. <button type="button" className="quiet" aria-label={`Add why ${habit.title} matters`} onClick={() => { setWhen(current?.when ?? ''); setWhere(current?.where ?? ''); setWhy(''); setOpen(true); }}>Add your why</button></p>)}
    {open && <form className="habit-intention-form" aria-label={`When and where for ${habit.title}`} onSubmit={e => { e.preventDefault(); save({when, where, why}); }}>
      <label className="field"><span>When</span><input ref={first} type="text" maxLength={INTENTION_MAX} value={when} onChange={e => setWhen(e.target.value)} placeholder="After I pour my coffee" /></label>
      <label className="field"><span>Where</span><input type="text" maxLength={INTENTION_MAX} value={where} onChange={e => setWhere(e.target.value)} placeholder="In the kitchen" /></label>
      <label className="field habit-intention-why-field"><span>Why it matters to you (optional)</span><input type="text" maxLength={WHY_MAX} value={why} onChange={e => setWhy(e.target.value)} placeholder="So I have energy for the kids" /></label>
      <div className="actions"><button type="submit" className="secondary">Save</button>{(line || current?.why) && <button type="button" className="quiet" onClick={() => save(null)}>Clear</button>}<button type="button" className="quiet" onClick={() => { setOpen(false); setError(''); }}>Cancel</button></div>
    </form>}
    {error && <p role="alert">{error}</p>}
    <TimeSuggest habit={habit} today={today} zone={zone} keep={keep} />
  </div>;
}
export default HabitIntention;
