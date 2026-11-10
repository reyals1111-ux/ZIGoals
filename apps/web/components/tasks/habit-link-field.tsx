'use client';
import {useHabits} from '../habits/use-habits';
import {latestHabitRule} from '../../lib/habits';

/** Session AL (Part 8): the editor's "Habit" link, loaded only when an editor opens (the habits store stays off the Tasks page's first load). */
export default function HabitLinkField({value, onChange}: {value: string; onChange: (id: string) => void}) {
  const habits = useHabits();
  const list = habits.loaded && !habits.error ? habits.data.habits.filter(h => latestHabitRule(h).state === 'active' || h.id === value) : [];
  return <label className="field"><span>Habit</span><select value={value} disabled={!habits.loaded} onChange={e => onChange(e.target.value)}>
    <option value="">No habit</option>
    {value && habits.loaded && !list.some(h => h.id === value) && <option value={value}>A habit no longer here</option>}
    {list.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
  </select></label>;
}
