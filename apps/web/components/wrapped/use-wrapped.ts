'use client';
import {useMemo} from 'react';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {useAverageGoals} from '../goals/use-average-goals';
import {useDeviceRecord} from '../ai/use-device-record';
import {lifeReview} from '../../lib/life-review/engine';
import {emptyGoalExtras} from '../../lib/goal-extras/store';
import {FOCUS_SESSIONS} from '../../lib/focus-sessions/schema';
import {isShowcase} from '../../lib/showcase';
import {buildWrapped, wrappedReviewWindow, type Wrapped} from '../../lib/wrapped/build';
import {wrappedYear} from '../../lib/wrapped/door';

/**
 * ZIGoals Wrapped in a component (Session AK, F5d), loaded only with the story itself: the records through each page's
 * own hook, the focus sessions, the Life review's engine for the year, and the story built on them. Reading writes
 * nothing; the Showcase's story is labelled Example.
 */
export function useWrapped() {
  const habits = useHabits(), health = useHealth(), platform = usePlatform(), averages = useAverageGoals(), focus = useDeviceRecord(FOCUS_SESSIONS);
  const loaded = habits.loaded && health.loaded && platform.loaded && averages.loaded && focus.loaded;
  const failed = !!(habits.error || health.error || platform.error);
  const wrapped = useMemo<Wrapped | null>(() => {
    if (!loaded || failed) return null;
    const today = habits.today, year = wrappedYear(today);
    const goals = platform.data.goals.map(g => ({key: `private:${g.id}`, id: g.id, name: g.name, href: `/app/goals/tracked/${encodeURIComponent(g.id)}`, status: g.status}));
    const review = lifeReview({window: wrappedReviewWindow(year, today), habits: habits.data, health: health.data, platform: platform.data, goals, averages: averages.unreadable ? [] : averages.data.goals, extras: emptyGoalExtras(), history: [], today});
    return buildWrapped({year, today, records: {habits: habits.data, health: health.data, platform: platform.data, today}, review, focus: focus.unreadable ? null : focus.data, example: isShowcase()});
  }, [loaded, failed, habits.today, habits.data, health.data, platform.data, averages.unreadable, averages.data, focus.unreadable, focus.data]);
  return {loaded, failed, wrapped, today: habits.today};
}
