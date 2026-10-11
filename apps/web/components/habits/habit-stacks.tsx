'use client';
import {useState} from 'react';
import {habitDay, type HabitData} from '../../lib/habits';
import {setChained, stacksOf} from '../../lib/habits-v2/stacks';
import {W_REMINDERS} from '../../lib/reminders/w-schema';
import {useDeviceRecord} from '../ai/use-device-record';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';

/**
 * Your stacks (Session W Part 10): habits set to follow another ("Stack after" in the editor), shown together in their
 * order with today's state. A follower can remind you once the habit before it is done today (on this device: a card on
 * Today and ZIGi's knock while ZIGoals is open). Nothing is checked in for you.
 */
const STATE: Record<string, string> = {complete: 'done today', partial: 'started', due: 'still to do', skipped: 'resting today', 'planned-skip': 'resting today', 'not-scheduled': 'not today', paused: 'paused'};
export function HabitStacks({data, today, onView}: {data: HabitData; today: string; onView: (id: string) => void}) {
  const stacks = stacksOf(data), w = useDeviceRecord(W_REMINDERS), [error, setError] = useState('');
  if (!stacks.length) return null;
  return <section className="panel habit-stacks" aria-labelledby="habit-stacks-title">
    <h2 id="habit-stacks-title">Your stacks</h2>
    {stacks.map(chain => <ol className="habit-stack-chain" key={chain[0]!.id} aria-label={`Stack starting with ${chain[0]!.title}`}>{chain.map((habit, i) => {
      const day = habitDay(habit, today, today), before = chain.find(h => h.id === habit.stackAfterId);
      return <li key={habit.id}><div><button type="button" className="quiet habit-stack-name" aria-label={`View ${habit.title}`} onClick={() => onView(habit.id)}>{i > 0 && <span aria-hidden="true">→ </span>}{habit.title}</button><small>{STATE[day.status] ?? day.status}</small></div>
        {before && w.loaded && !w.unreadable && <label className="checkbox"><input type="checkbox" checked={!!w.data.chained[habit.id]} onChange={e => { try { w.update(r => setChained(r, habit.id, e.target.checked)); setError(''); } catch (cause) { setError(`Not saved on this device. ${deviceSettingFailureMessage(cause)}`); } }} />Remind me after {before.title}</label>}
      </li>;
    })}</ol>)}
    <p className="fine">A reminder shows on Today, and ZIGi may knock, once the habit before is done today; on this device only.</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
