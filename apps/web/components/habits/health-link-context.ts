'use client';
import {createContext, useContext} from 'react';
import type {ExerciseCounter} from '../../lib/health-counters';

/** What a habit card needs from the Health journal to word an automatic check-in: the counter names and the water unit. */
export type HealthLinkContextValue = {counters: readonly ExerciseCounter[]; waterUnit: 'ml' | 'fl-oz-us'};
export const HealthLinkContext = createContext<HealthLinkContextValue | null>(null);
export const useHealthLinkContext = () => useContext(HealthLinkContext);
