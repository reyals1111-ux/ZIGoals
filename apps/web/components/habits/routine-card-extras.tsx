'use client';
import {useRef} from 'react';
import {habitDay, logHabitValue} from '../../lib/habits';
import {compactToggle, compactToggleWords} from '../../lib/habits-order/compact-toggle';
import type {Routine} from '../../lib/routines/engine';
import {setHabitReminder} from '../../lib/reminders/store';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {formatClock} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import {showUndo} from '../ui/undo-toast';
import {useReminders} from '../reminders/use-reminders';
import type {HabitsStore} from './use-habits';
import './routine-card.css';

/**
 * Session AV lane 2 (habits pillar; LEDGER #182, Fabulous's "complete a habit from the routine card"; #181, its routine
 * reminder): under each routine on Habits, a tick per step for today without starting the player — the same write as
 * the compact list's tap (done fills the step to its target, again takes it back), through the journal's own mutator,
 * with the app's toast and Undo; a quit or limit step, or one not due today, shows its state without a tick. And the
 * routine's reminder: a time on its first habit's reminder (this device, as every habit reminder) whose notification
 * and Today card open the player at the first step still open.
 */
// Session AV lane 2 (CI run 2007): what a card says goes to Routines' one status line (`say`), not a status line per card —
// Routines held one live region per routine plus its own.
export function RoutineCardExtras({routine, store, say}: {routine: Routine; store: Pick<HabitsStore, 'data' | 'today' | 'update'>; say: (text: string) => void}) {
  const reminders = useReminders(), setNote = say, timeField = useRef<HTMLInputElement>(null);
  const head = routine.habits[0]!, time = reminders.data.habits[head.id]?.time ?? '';
  async function tick(habitId: string, done: boolean) {
    const habit = store.data.habits.find(h => h.id === habitId), change = habit && compactToggle(habit, store.today, store.today, done);
    if (!change) return;
    try {
      await store.update(d => logHabitValue(d, habitId, store.today, change.value));
      const words = compactToggleWords(change, 'today');
      showUndo({message: words.message, undone: words.undone, restore: () => store.update(d => logHabitValue(d, habitId, store.today, change.before))});
    } catch (e) { setNote(plainErrorMessage(e, 'This step was not saved.')); }
  }
  function remind(value: string | null) {
    try {
      reminders.update(store.today, c => setHabitReminder(c, head.id, value, new Set(store.data.habits.map(h => h.id))));
      setNote(value ? `${routine.title}: reminder at ${formatClock(value)} on this device; it opens the routine at the first step still open.` : `${routine.title}: reminder off.`);
    } catch (e) { setNote(`Not saved on this device. ${deviceSettingFailureMessage(e)}`); }
  }
  return <div className="routine-card-extras">
    <ul className="routine-card-steps" aria-label={`${routine.title}: today’s steps`}>{routine.habits.map(h => {
      const day = habitDay(h, store.today, store.today), done = day.status === 'complete', can = compactToggle(h, store.today, store.today, !done) !== null;
      return <li key={h.id}>{can
        ? <label className="checkbox routine-card-step"><input type="checkbox" checked={done} onChange={e => void tick(h.id, e.target.checked)}/><span>{h.title}</span></label>
        : <span className="routine-card-step is-still">{h.title} <small>· {day.status === 'complete' ? 'done' : day.status === 'skipped' ? 'skipped' : 'not due today'}</small></span>}</li>;
    })}</ul>
    {reminders.loaded && !reminders.unreadable && <div className="routine-card-remind">
      <label className="field"><span>Remind me to start</span><input ref={timeField} type="time" step={60} value={time} aria-label={`${routine.title}: reminder time`} onChange={e => remind(e.target.value || null)}/></label>
      {time && <button type="button" className="quiet" aria-label={`Turn the ${routine.title} reminder off`} onClick={() => { remind(null); timeField.current?.focus(); /* the Off button goes away: the focus stays on the time */ }}>Off</button>}
    </div>}
  </div>;
}
