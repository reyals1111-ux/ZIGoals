'use client';
import Link from 'next/link';
import {lazy, Suspense} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {HABIT_EXTRAS} from '../../lib/habits-extras/schema';
import {habitDay, type HabitData} from '../../lib/habits';
import {focusOf} from '../../lib/habit-focus';
import {HabitLookMark} from './habit-look-mark';

const TodayYesterday = lazy(() => import('./today-yesterday'));

/**
 * Session AV (owner follow-up 1, F-FOCUS-HABIT; Finch's Goal of the Day): today's focus habit on Today, one line beside
 * "Tasks due today" — "◎ Today's focus: Walk · done" or "· still open" — opening the habit's own page. Nothing when no
 * habit is today's focus. Lazy.
 */
export default function TodayHabitFocus({data, today}: {data: HabitData; today: string}) {
  const extras = useDeviceRecord(HABIT_EXTRAS);
  if (!extras.loaded) return null;
  // Session AV (q4 #19): yesterday's open habits on Today's first open (nothing drawn when there are none).
  const yesterday = <Suspense fallback={null}><TodayYesterday extras={extras.unreadable ? null : extras.data}/></Suspense>;
  if (extras.unreadable) return yesterday;
  const id = focusOf(extras.data, today), habit = id ? data.habits.find(h => h.id === id) : undefined;
  if (!habit) return yesterday;
  const done = habitDay(habit, today, today).status === 'complete';
  // Session AV (q4 #24, #26): its own mark (◎, not the Checklist's star) and the habit's symbol beside its name.
  return <><section className="today-tasks-due today-habit-focus" aria-label="Today's focus habit">
    <p className="today-tasks-due-line"><Link className="text-link" href={`/app/habits?habit=${encodeURIComponent(habit.id)}`}><span>
      <span aria-hidden="true">◎ </span><strong>Today&rsquo;s focus:</strong> <span dir="auto"><HabitLookMark extras={extras.data} habitId={habit.id}/>{habit.title}</span> · {done ? 'done' : 'still open'} →</span></Link></p>
  </section>{yesterday}</>;
}
