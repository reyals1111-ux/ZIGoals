'use client';
import {useEffect} from 'react';
import {registerTimelineSource} from '../../lib/timeline/sources';

/**
 * Session AV lane 2 (r3-plan, LEDGER #258): puts planned workouts on the Day Timeline of their day (lib/timeline/workout-source.ts).
 * Renders nothing; the source's code loads only when the timeline reads it.
 */
export function PlannedWorkoutsSource() {
  useEffect(() => registerTimelineSource('workouts', () => import('../../lib/timeline/workout-source').then(m => m.plannedWorkoutsSource)), []);
  return null;
}
export default PlannedWorkoutsSource;
