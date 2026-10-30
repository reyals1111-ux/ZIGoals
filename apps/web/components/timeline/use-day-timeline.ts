'use client';
import {useCallback, useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {useSleep} from '../health/sleep/use-sleep';
import {useMeditation} from '../health/meditation/use-meditation';
import {useFasting} from '../health/use-fasting';
import {usePlatform} from '../platform/use-platform';
import {useReminders} from '../reminders/use-reminders';
import {useWeeklyReview} from '../weekly-review/use-weekly-review';
import {HABIT_EXTRAS} from '../../lib/habits-extras/schema';
import {useDeviceRecord} from '../ai/use-device-record';
import {W_REMINDERS} from '../../lib/reminders/w-schema';
import {REMINDERS_PLAN} from '../../lib/reminders-plan/schema';
import {dailyData, healthDay} from '../../lib/health-daily';
import {buildDayTimeline, type DayTimeline} from '../../lib/timeline/build';
import {DAY_TIMELINE} from '../../lib/timeline/store';
import {loadTimelineSources, runTimelineSources, subscribeTimelineSources, timelineSourcesVersion, type TimelineSource} from '../../lib/timeline/sources';

/**
 * The Day Timeline in a component (Session AF, L5b; P9.2): every record through its own page's hook, the moved times
 * (`zigoals:day-timeline:v1`), the sources other features registered (loaded the first time the timeline is shown), and
 * a clock that moves the now line once a minute while the page is visible. Reading writes nothing.
 */
const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
export function useDayTimeline({sources: wantSources = true}: {sources?: boolean} = {}) {
  const habits = useHabits(), health = useHealth(), sleep = useSleep(), meditation = useMeditation(), fasting = useFasting(), platform = usePlatform();
  const reminders = useReminders(), weekly = useWeeklyReview(), wReminders = useDeviceRecord(W_REMINDERS), plan = useDeviceRecord(REMINDERS_PLAN), record = useDeviceRecord(DAY_TIMELINE), extras = useDeviceRecord(HABIT_EXTRAS);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') setNow(new Date()); };
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick); window.addEventListener('focus', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
  }, []);
  const version = useSyncExternalStore(subscribeTimelineSources, timelineSourcesVersion, () => 0);
  const [loadedSources, setLoadedSources] = useState<{id: string; source: TimelineSource}[] | null>(wantSources ? null : []);
  useEffect(() => {
    if (!wantSources) return;
    let active = true;
    void loadTimelineSources().then(list => { if (active) setLoadedSources(list); });
    return () => { active = false; };
  }, [wantSources, version]);
  const loaded = habits.loaded && health.loaded && sleep.loaded && meditation.loaded && fasting.loaded && platform.loaded && reminders.loaded && wReminders.loaded && plan.loaded && record.loaded && loadedSources !== null;
  const hDay = useMemo(() => health.loaded ? healthDay(dailyData(health.data).preferences.timezone, now) : '', [health.loaded, health.data, now]);
  const zone = deviceZone();
  const day = useMemo<DayTimeline | null>(() => {
    if (!loaded) return null;
    const stores = {habits: habits.data, habitsDay: habits.today, health: health.data, healthDay: hDay, sleep: sleep.sleep, meditation: meditation.meditation, meditationRun: meditation.run.data, fasting: fasting.data, platform: platform.data, zone: sleep.zone};
    const extra = runTimelineSources(loadedSources ?? [], {date: habits.today, now, stores});
    return buildDayTimeline({
      date: habits.today, healthDay: hDay, now, zone, habits: habits.error ? {...habits.data, habits: []} : habits.data, health: health.error ? null : health.data,
      reminders: reminders.unreadable ? null : reminders.data, wReminders: wReminders.unreadable ? null : wReminders.data, plan: plan.unreadable ? null : plan.data,
      reviewWeekday: weekly.loaded ? weekly.data.weekday : undefined, times: record.unreadable ? {} : record.data.times, habitTimes: extras.loaded && !extras.unreadable ? extras.data.times ?? {} : {},
      fasting: fasting.unreadable ? null : fasting.data, meditationRun: meditation.runUnreadable ? null : meditation.run.data, sleep: sleep.error ? null : sleep.sleep, extra,
    });
  }, [extras.loaded, extras.unreadable, extras.data, loaded, habits.data, habits.today, habits.error, health.data, health.error, hDay, sleep.sleep, sleep.zone, sleep.error, meditation.meditation, meditation.run.data, meditation.runUnreadable, fasting.data, fasting.unreadable, platform.data, reminders.data, reminders.unreadable, wReminders.data, wReminders.unreadable, plan.data, plan.unreadable, weekly.loaded, weekly.data, record.data, record.unreadable, loadedSources, now, zone]);
  const refresh = useCallback(() => setNow(new Date()), []);
  return {loaded, day, now, refresh, habits, health, record, extras, failed: !!(habits.error || health.error)};
}
export type DayTimelineState = ReturnType<typeof useDayTimeline>;
