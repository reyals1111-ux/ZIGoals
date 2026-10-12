"use client";
import {Suspense, lazy, type ComponentProps} from 'react';
export {HabitCompletion} from './habit-completion';
export type {HabitStackNext} from './habit-card-full';
/**
 * Session AA-Local Gate A (ADR-022 B41): the full habit card is its own chunk, loaded with the first card on the page;
 * the check-in control lives in habit-completion.tsx, so Today and the tracked goal import only that. Same props, same DOM.
 */
const Full = lazy(() => import('./habit-card-full').then(m => ({default: m.HabitCard})));
export function HabitCard(props: ComponentProps<typeof Full>) {
  return <Suspense fallback={<article className="panel habit-card habit-card-loading" aria-busy="true" aria-label={props.habit.title} />}><Full {...props} /></Suspense>;
}
