"use client";
import {HabitCard as Full} from './habit-card-full';
export {HabitCompletion} from './habit-completion';
export type {HabitStackNext} from './habit-card-full';
/**
 * Session AA-Local Gate A (ADR-022 B41) made the full card a lazy chunk; Gate C (B49) makes it static again: a lazy
 * component suspends on its first render even when its chunk is cached, so a newly created card appeared as a fallback
 * for a frame and focus (`focus-return.spec.ts`) and the Guide's "Open habit" scroll landed on nothing. Today and the
 * tracked goal import only `habit-completion.tsx`, so the shell is unchanged. Same props, same DOM.
 */
export const HabitCard = Full;
