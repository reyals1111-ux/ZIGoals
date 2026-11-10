'use client';
import {createContext, useContext, useMemo} from 'react';
import {exerciseData, type ExerciseCounter} from '../../lib/health-counters';
import type {HealthData} from '../../lib/health';
import {dailyData} from '../../lib/health-daily';
import {useSharedHealth} from '../use-shared-health';

/** What a habit card needs from the Health journal to word an automatic check-in: the counter names and the water unit. */
/** `health` (Session AL fourth pass, N-056): the journal itself, so an automatic tick's note reads today's value as Health does. */
export type HealthLinkContextValue = {counters: readonly ExerciseCounter[]; waterUnit: 'ml' | 'fl-oz-us'; health?: HealthData};
export const HealthLinkContext = createContext<HealthLinkContextValue | null>(null);
/**
 * Session AL release review (RR-1, PR-002): a habit card shown outside Today and Habits (NOVA's quick-actions sheet) had no
 * provider, so a linked habit read only its own entries ("Drink water 1 / 2 liters" beside 1,250 mL logged). Without a
 * provider the card reads the shared Health snapshot itself (components/use-shared-health.ts, one parse for every reader),
 * so every page counts a linked habit from the same journal. A provider, where there is one, still wins.
 */
export function useHealthLinkContext(): HealthLinkContextValue | null {
  const provided = useContext(HealthLinkContext), shared = useSharedHealth();
  const ready = shared.loaded && !shared.error, data = shared.data;
  const fallback = useMemo<HealthLinkContextValue | null>(() => ready ? {counters: exerciseData(data).counters, waterUnit: dailyData(data).preferences.waterUnit, health: data} : null, [ready, data]);
  return provided ?? fallback;
}
