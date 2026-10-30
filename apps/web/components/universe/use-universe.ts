'use client';
import {useCallback, useMemo} from 'react';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {useFasting} from '../health/use-fasting';
import {useAverageGoals} from '../goals/use-average-goals';
import {useDeviceRecord} from '../ai/use-device-record';
import {isShowcase} from '../../lib/showcase-storage';
import {UNIVERSE, celebratedIds, markCelebrated} from '../../lib/universe/store';
import {pendingCelebrations, universeOf, type UniverseInput} from '../../lib/universe/model';

/**
 * My Universe in a component (Session AF, L5b; ADR-028 H77): the person's own records through each page's own hook, the
 * universe derived from them on every read, and the milestones still to celebrate. Reading writes nothing; `celebrate`
 * (the person's "Lovely") is the one write, to `zigoals:universe:v1`. The Showcase celebrates nothing (its records are a
 * demo, and a celebration would cover the page it is meant to show), and unreadable celebration bytes celebrate nothing
 * either, so they are never rewritten.
 */
export function useUniverse() {
  const habits = useHabits(), health = useHealth(), platform = usePlatform(), fasting = useFasting(), averages = useAverageGoals(), record = useDeviceRecord(UNIVERSE);
  const loaded = habits.loaded && health.loaded && platform.loaded && fasting.loaded && averages.loaded && record.loaded;
  const failed = !!(habits.error || health.error || platform.error);
  const input = useMemo<UniverseInput | null>(() => !loaded ? null : {
    habits: habits.error ? {...habits.data, habits: []} : habits.data, health: health.data, platform: platform.data,
    fasting: fasting.unreadable ? null : fasting.data, averages: averages.unreadable ? [] : averages.data.goals, today: habits.today,
  }, [loaded, habits.error, habits.data, habits.today, health.data, platform.data, fasting.unreadable, fasting.data, averages.unreadable, averages.data]);
  const celebrated = useMemo(() => record.unreadable ? [] : celebratedIds(record.data), [record.unreadable, record.data]);
  const universe = useMemo(() => input ? universeOf(input, input.today, celebrated) : null, [input, celebrated]);
  const pending = useMemo(() => input && !record.unreadable && !isShowcase() ? pendingCelebrations(input, celebrated) : [], [input, record.unreadable, celebrated]);
  const update = record.update;
  const celebrate = useCallback((id: string) => update(r => markCelebrated(r, id, habits.today)), [update, habits.today]);
  return {loaded, failed, unreadable: record.unreadable, universe, pending, celebrate, today: habits.today, habits: habits.data, health: health.data, input};
}
export type UniverseState = ReturnType<typeof useUniverse>;
