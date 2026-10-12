'use client';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {useWeeklyReview} from '../weekly-review/use-weekly-review';
import {usePagesView} from '../pages/use-pages-view';
import {GAME} from '../../lib/game/schema';
import {xpSummary} from '../../lib/game/xp';
import {dailyQuests} from '../../lib/game/quests';
import {weeklyChallenges} from '../../lib/game/challenges';
import {badges, journeyPath} from '../../lib/game/badges';
import {freezesAvailable, repairableDays} from '../../lib/game/freeze';
import {CELEBRATIONS} from '../../lib/celebrations';

/** Everything the Journey page and the cards show, derived from the journals on every render (nothing stored but the switch and what was seen). */
export function useGame() {
  const game = useDeviceRecord(GAME), celebrations = useDeviceRecord(CELEBRATIONS);
  const habits = useHabits(), health = useHealth(), platform = usePlatform(), weekly = useWeeklyReview(), view = usePagesView();
  const enabled = game.loaded && !game.unreadable && game.data.enabled;
  const loaded = habits.loaded && health.loaded && game.loaded;
  const today = habits.today;
  const stores = useMemo(() => ({habits: habits.data, health: health.data, platform: platform.data, weekly: weekly.data}), [habits.data, health.data, platform.data, weekly.data]);
  const pages = useMemo(() => ['habits', 'health', 'goals', 'wealth', 'today'].filter(p => !view.hidden.includes(p as never)), [view.hidden]);
  const derived = useMemo(() => {
    if (!loaded) return null;
    const xp = xpSummary(stores, today);
    return {xp, quests: dailyQuests(stores, today, pages), challenges: weeklyChallenges(stores, today), badges: badges(stores, today), path: journeyPath(stores, today, xp.level.level, xp.total), freezes: freezesAvailable(stores.habits, today), repairable: repairableDays(stores.habits, today)};
  }, [loaded, stores, today, pages]);
  return {game, celebrations, enabled, loaded, today, stores, pages, derived, habits};
}
export type GameState = ReturnType<typeof useGame>;
