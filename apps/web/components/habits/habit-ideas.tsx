'use client';
import {useState} from 'react';
import {scheduleLabel, type HabitData, type HabitInput} from '../../lib/habits';
import {addLocalDays} from '../../lib/local-date';
import {HABIT_GROUP_LABEL, HABIT_TEMPLATE_GROUPS, HABIT_TEMPLATES, habitTemplateInputOf, hasHabitLike, type HabitTemplateGroup} from '../../lib/templates/habits';
import {CHALLENGE_DAYS} from '../../lib/habits-v2/challenge';

/**
 * Habit ideas (Session W Part 10): the starter library from the welcome (Part 3), on the Habits page. One tap adds a
 * complete habit the person can change afterwards, or the same habit as a 30-day challenge (it ends by itself after 30
 * days). Amounts are common starting points, not advice; an idea already in the list says so instead of adding twice.
 */
export function HabitIdeas({data, today, onAdd, onClose}: {data: HabitData; today: string; onAdd: (input: HabitInput, words: string) => Promise<void>; onClose: () => void}) {
  const [group, setGroup] = useState<HabitTemplateGroup>('health'), [busy, setBusy] = useState(false);
  const titles = data.habits.map(h => h.title);
  async function add(input: HabitInput, words: string) { setBusy(true); try { await onAdd(input, words); } finally { setBusy(false); } }
  return <section className="panel habit-ideas" aria-labelledby="habit-ideas-title">
    <div className="habit-ideas-head"><h2 id="habit-ideas-title">Habit ideas</h2><button type="button" className="quiet" onClick={onClose}>Close</button></div>
    <p className="fine">Small, common starting points. Add one, then change anything about it. Nothing here compares you with anyone.</p>
    <div className="habit-filter-bar" role="group" aria-label="Kinds of habit ideas">{HABIT_TEMPLATE_GROUPS.map(g => <button type="button" className="quiet" key={g} aria-pressed={group === g} onClick={() => setGroup(g)}>{HABIT_GROUP_LABEL[g]}</button>)}</div>
    <ul className="habit-ideas-list">{HABIT_TEMPLATES.filter(t => t.group === group).map(t => {
      const added = hasHabitLike(titles, t), input = habitTemplateInputOf(t);
      return <li key={t.id}><div><strong>{t.title}</strong><small>{t.note} · {scheduleLabel(t.schedule)}</small></div>
        {added ? <span className="fine habit-idea-added">Already in your habits</span> : <div className="actions">
          <button type="button" className="secondary" disabled={busy} aria-label={`Add ${t.title}`} onClick={() => void add(input, `${t.title} added.`)}>Add</button>
          <button type="button" className="quiet" disabled={busy} aria-label={`Add ${t.title} as a ${CHALLENGE_DAYS.usual}-day challenge`} onClick={() => void add({...input, endCondition: {kind: 'date', date: addLocalDays(today, CHALLENGE_DAYS.usual - 1)}}, `${t.title} added as a ${CHALLENGE_DAYS.usual}-day challenge, ending ${addLocalDays(today, CHALLENGE_DAYS.usual - 1)}.`)}>As a {CHALLENGE_DAYS.usual}-day challenge</button>
        </div>}
      </li>;
    })}</ul>
  </section>;
}
