'use client';
import {useMemo} from 'react';
import {allHabitsTrack} from '../../../lib/ai/local-answers/exact/habits';
import type {Habit} from '../../../lib/habits';
import type {AxProps} from '../cards/ax/kit';
import {HabitSource} from './ax/sources';
import {TrackCalendar} from './ax/track-calendar';

/**
 * Session AS (ADR-042 Part 2): "Habits by day" — every habit together as one calendar: a day is lit when a habit was not
 * done on it (missed as a lit cell, a day with only skipped habits as a dashed ring); a day every due habit was done
 * carries its dot. The supporting card beside "Misses per habit": the bars say which habits, the calendar says which days.
 */
export default function HabitsMonth({size, params}: AxProps) {
  return <HabitSource>{(_habit, all, today) => <Days habits={all} today={today} size={size} params={params}/>}</HabitSource>;
}
function Days({habits, today, size, params}: {habits: readonly Habit[]; today: string} & AxProps) {
  const track = useMemo(() => allHabitsTrack(habits, today), [habits, today]);
  return <TrackCalendar kind="habits-month" track={track} today={today} params={params} size={size} source="Your habits"/>;
}
