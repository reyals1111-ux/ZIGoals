'use client';
import {useMemo} from 'react';
import {workoutsTrack} from '../../../lib/ai/local-answers/exact/health';
import type {Workouts} from '../../../lib/workouts/schema';
import {HealthDays} from '../cards/ax/health-kit';
import type {AxProps} from '../cards/ax/kit';
import {WorkoutsSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family 1): "Workout days" — the days with a finished workout as a month calendar, lit;
 * today ringed. The period is the question's (`period`), else this month. Every day is the exact layer's own track
 * (lib/ai/local-answers/exact/health.ts `workoutsTrack`), so the calendar and the sentence count one thing. The workout
 * log sits behind the Health switches (`WorkoutsSource`). Read only.
 */
export default function WorkoutDays({size, params}: AxProps) {
  return <WorkoutsSource id="workout-days">{(workouts, day) => <Days workouts={workouts} day={day} size={size} params={params}/>}</WorkoutsSource>;
}
function Days({workouts, day, size, params}: {workouts: Workouts; day: string} & AxProps) {
  const track = useMemo(() => workoutsTrack(workouts, day), [workouts, day]);
  return <HealthDays kind="workout-days" track={track} today={day} size={size} params={params} title="No workouts logged yet" href="/app/health?view=workouts" action="Log a workout">Finish a workout on Health and the days you trained show here.</HealthDays>;
}
