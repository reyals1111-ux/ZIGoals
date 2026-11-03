/// <reference types="react/canary" />
'use client';
import {ViewTransition, type ReactElement} from 'react';
import {goalMorphClass, goalMorphName} from '../../lib/motion/goal-morph';

/**
 * Session AK M1: one goal's title on both ends of the morph (the goal card on /app/goals and the heading of
 * /app/goals/tracked/[id]). `child` must be one element of its own box (a fit-content heading), so the morph scales the
 * words, not empty space. `default="none"` keeps it still in every other transition; the explicit `share` is required
 * with it (the Next guide: without it the pair silently stops morphing). Full motion only (lib/motion/goal-morph.ts).
 */
export function GoalTitleMorph({id, children}: {id: string; children: ReactElement}) {
  return <ViewTransition name={goalMorphName(id)} share={goalMorphClass()} default="none">{children}</ViewTransition>;
}
