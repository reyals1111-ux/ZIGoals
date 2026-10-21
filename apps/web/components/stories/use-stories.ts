'use client';
import {useCallback, useMemo} from 'react';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {useAverageGoals} from '../goals/use-average-goals';
import {useDeviceRecord} from '../ai/use-device-record';
import {lifeReview, reviewPeriod, type EnginePeriod} from '../../lib/life-review/engine';
import {emptyGoalExtras} from '../../lib/goal-extras/store';
import {buildStory, type Story} from '../../lib/stories/build';
import {STORIES, markOpened} from '../../lib/stories/store';
import {formatDate} from '../../lib/visual-format';

/**
 * Stories in a component (Session AF, L5b; P9.3): the person's records through each page's own hook, the Life review's
 * engine for the week, the month and the year, and the story built on each. Reading writes nothing; `opened` (the
 * person's own Open) is the one write, to `zigoals:stories:v1`.
 */
export const STORY_PERIODS: readonly EnginePeriod[] = ['week', 'month', 'year'];
/** Gate C design review (copy): one date style on every cover — the year once, at the end ("10 Oct – 16 Oct 2026",
 *  "1 Jan – 16 Oct 2026"), and on the start too only when a window crosses New Year. */
export const rangeLabel = (start: string, end: string) => `${formatDate(start, {year: start.slice(0, 4) === end.slice(0, 4) ? false : undefined})} – ${formatDate(end)}`;
export function useStories() {
  const habits = useHabits(), health = useHealth(), platform = usePlatform(), averages = useAverageGoals(), record = useDeviceRecord(STORIES);
  const loaded = habits.loaded && health.loaded && platform.loaded && averages.loaded && record.loaded;
  const failed = !!(habits.error || health.error || platform.error);
  const stories = useMemo<Record<EnginePeriod, Story & {start: string; end: string}> | null>(() => {
    if (!loaded || failed) return null;
    const today = habits.today, goals = platform.data.goals.map(g => ({key: `private:${g.id}`, id: g.id, name: g.name, href: `/app/goals/tracked/${encodeURIComponent(g.id)}`, status: g.status}));
    const records = {habits: habits.data, health: health.data, platform: platform.data, today};
    const one = (period: EnginePeriod) => {
      const window = reviewPeriod(period, today);
      const review = lifeReview({window, habits: habits.data, health: health.data, platform: platform.data, goals, averages: averages.unreadable ? [] : averages.data.goals, extras: emptyGoalExtras(), history: [], today});
      return {...buildStory({review, records, platform: platform.data, rangeLabel: rangeLabel(window.start, window.end)}), start: window.start, end: window.end};
    };
    return {week: one('week'), month: one('month'), year: one('year')};
  }, [loaded, failed, habits.today, habits.data, health.data, platform.data, averages.unreadable, averages.data]);
  const update = record.update;
  const opened = useCallback((key: string) => update(r => markOpened(r, key, habits.today)), [update, habits.today]);
  return {loaded, failed, stories, seen: record.unreadable ? {} : record.data.seen, opened, today: habits.today};
}
