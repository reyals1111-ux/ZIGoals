'use client';
import {useMemo} from 'react';
import {habitTrack} from '../../../lib/ai/local-answers/exact/habits';
import type {Habit} from '../../../lib/habits';
import type {AxProps} from '../cards/ax/kit';
import {HabitSource} from './ax/sources';
import {TrackCalendar} from './ax/track-calendar';

/** Session AS (ADR-042 Part 2): "Days done" — one habit's month as a calendar with the days it was done lit (the same days the Habits page counts). */
export default function HabitDoneDays({size, params}: AxProps) {
  return <HabitSource refId={params?.ref}>{(habit, _all, today) => <Days habit={habit} today={today} size={size} params={params}/>}</HabitSource>;
}
function Days({habit, today, size, params}: {habit: Habit; today: string} & AxProps) {
  const track = useMemo(() => habitTrack(habit, today), [habit, today]);
  return <TrackCalendar kind="habit-done-days" track={track} today={today} params={params} size={size} lit="done" source="Your habits"/>;
}
