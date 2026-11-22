'use client';
import {useState} from 'react';
import {habitRuleOn, type Habit} from '../../lib/habits';
import {DIFFICULTIES, DIFFICULTY_WORDS, DIFFICULTY_XP, FOCUS_BONUS_XP, optionsOf, withHabitOptions, type Difficulty} from '../../lib/habit-options/rule';
import {refreshHabitOptions} from '../../lib/habit-options/install';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {HabitExtrasState} from './use-habit-extras';
import './habit-options.css';

/**
 * Session AV lane 2 (habits; LEDGER #45, #49, #50, #52, #57): a habit's own options, in its Details (loaded when the
 * person opens them). Each change saves at once on this device (the habit extras, synced with them) and says so; focus
 * stays on the control. Plain words; the XP lines say the game layer must be on.
 */
export default function HabitOptions({habit, today, extras, keep}: {habit: Habit; today: string; extras: HabitExtrasState; keep: ReadonlySet<string>}) {
  const [said, setSaid] = useState(''), [error, setError] = useState('');
  if (!extras.loaded || extras.unreadable) return null;
  const rule = habitRuleOn(habit, today) ?? habit.rules.at(-1)!;
  const o = optionsOf(extras.data, habit.id);
  const daily = rule.targetPeriod === 'day' && rule.schedule.kind !== 'frequency';
  const canWhenever = daily && rule.type === 'build' && rule.schedule.kind === 'daily';
  const id = `habit-options-${habit.id}`;
  const save = (patch: Parameters<typeof withHabitOptions>[2], words: string) => {
    try { extras.update(r => withHabitOptions(r, habit.id, patch, keep)); refreshHabitOptions(); setError(''); setSaid(words); }
    catch (cause) { setSaid(''); setError(`Not saved on this device. ${deviceSettingFailureMessage(cause)}`); }
  };
  return <details className="habit-details habit-options" data-testid="habit-options">
    <summary aria-label={`Habit options for ${habit.title}`}>Habit options</summary>
    <fieldset className="habit-options-set">
      <legend className="sr-only">Options for {habit.title}</legend>
      {canWhenever || o.whenever ? <label className="checkbox habit-option"><input type="checkbox" checked={!!o.whenever} onChange={e => save({whenever: e.target.checked}, e.target.checked ? 'Whenever: no set days. It is never due or missed.' : 'Every day again.')} aria-describedby={`${id}-whenever`} /><span>Whenever, no set days<small id={`${id}-whenever`} className="fine">Log it on any day you like. It is never due, never missed and never reminds you.</small></span></label>
        : rule.type === 'build' && daily && <p className="fine">To log it whenever you like, set its repeat to Every day first.</p>}
      {!o.whenever && daily && rule.type === 'build' && <label className="checkbox habit-option"><input type="checkbox" checked={!!o.twoDay} onChange={e => save({twoDay: e.target.checked}, e.target.checked ? 'Your streak now keeps one missed day.' : 'Your streak ends on any missed day again.')} aria-describedby={`${id}-two`} /><span>Never miss twice<small id={`${id}-two`} className="fine">One missed day keeps your streak. Two missed days in a row end it.</small></span></label>}
      {!o.whenever && daily && <label className="checkbox habit-option"><input type="checkbox" checked={!!o.unloggedSkip} onChange={e => save({unloggedSkip: e.target.checked}, e.target.checked ? 'A day you do not log now counts as skipped.' : 'A day you do not log counts as missed again.')} aria-describedby={`${id}-skip`} /><span>A day I don&rsquo;t log counts as skipped<small id={`${id}-skip`} className="fine">Instead of missed. Skipped days never break a streak.</small></span></label>}
      {rule.type === 'build' && <label className="field habit-option-difficulty"><span>How hard is it?</span>
        <select value={o.difficulty ?? 'easy'} onChange={e => { const d = e.target.value as Difficulty; save({difficulty: d}, `${DIFFICULTY_WORDS[d].en}: ${DIFFICULTY_XP[d]} XP for a done day.`); }} aria-describedby={`${id}-xp`}>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFFICULTY_WORDS[d].en} · {DIFFICULTY_XP[d]} XP</option>)}
        </select>
        <small id={`${id}-xp`} className="fine">XP counts when the game layer is on (Journey). Today&rsquo;s focus habit earns {FOCUS_BONUS_XP} XP more when it is done.</small>
      </label>}
    </fieldset>
    <p className="fine" role="status" aria-live="polite">{said}</p>
    {error && <p className="fine" role="alert">{error}</p>}
  </details>;
}
