'use client';
import {useMemo} from 'react';
import {habitTrack} from '../../../lib/ai/local-answers/exact/habits';
import type {Habit} from '../../../lib/habits';
import type {AxProps} from '../cards/ax/kit';
import {HabitSource} from './ax/sources';
import {TrackCalendar} from './ax/track-calendar';

/**
 * Session AS (ADR-042 Part 2; the owner's finding of 17 Nov): "Missed days" — one habit's month as a calendar with the
 * days it was not done lit: missed days as lit cells, skipped days as dashed rings (never counted as missed), today
 * ringed and still open. The habit is the one the question named (`ref`), else the first active one; the period is the
 * question's (`period`), else this month. Every day is the Habits page's own outcome.
 */
export default function HabitMissedDays({size, params}: AxProps) {
  return <HabitSource refId={params?.ref}>{(habit, _all, today) => <Days habit={habit} today={today} size={size} params={params}/>}</HabitSource>;
}
function Days({habit, today, size, params}: {habit: Habit; today: string} & AxProps) {
  const track = useMemo(() => habitTrack(habit, today), [habit, today]);
  return <TrackCalendar kind="habit-missed-days" track={track} today={today} params={params} size={size} source="Your habits"/>;
}
