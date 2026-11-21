'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../ai/use-device-record';
import {HABIT_EXTRAS} from '../../lib/habits-extras/schema';
import {habitDay, type HabitData} from '../../lib/habits';
import {focusOf} from '../../lib/habit-focus';

/**
 * Session AV (owner follow-up 1, F-FOCUS-HABIT; Finch's Goal of the Day): today's focus habit on Today, one line beside
 * "Tasks due today" — "★ Today's focus: Walk · done" or "· still open" — opening the habit's own page. Nothing when no
 * habit is today's focus. Lazy.
 */
export default function TodayHabitFocus({data, today}: {data: HabitData; today: string}) {
  const extras = useDeviceRecord(HABIT_EXTRAS);
  if (!extras.loaded || extras.unreadable) return null;
  const id = focusOf(extras.data, today), habit = id ? data.habits.find(h => h.id === id) : undefined;
  if (!habit) return null;
  const done = habitDay(habit, today, today).status === 'complete';
  return <section className="today-tasks-due today-habit-focus" aria-label="Today's focus habit">
    <p className="today-tasks-due-line"><Link className="text-link" href={`/app/habits?habit=${encodeURIComponent(habit.id)}`}><span>
      <span aria-hidden="true">★ </span><strong>Today&rsquo;s focus:</strong> <span dir="auto">{habit.title}</span> · {done ? 'done' : 'still open'} →</span></Link></p>
  </section>;
}
