'use client';
import {createContext, useContext} from 'react';
import type {ExerciseCounter} from '../../lib/health-counters';
import type {HealthData} from '../../lib/health';

/** What a habit card needs from the Health journal to word an automatic check-in: the counter names and the water unit. */
/** `health` (Session AL fourth pass, N-056): the journal itself, so an automatic tick's note reads today's value as Health does. */
export type HealthLinkContextValue = {counters: readonly ExerciseCounter[]; waterUnit: 'ml' | 'fl-oz-us'; health?: HealthData};
export const HealthLinkContext = createContext<HealthLinkContextValue | null>(null);
export const useHealthLinkContext = () => useContext(HealthLinkContext);
