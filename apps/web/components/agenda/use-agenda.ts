'use client';
import {useMemo, useState} from 'react';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {useReminders} from '../reminders/use-reminders';
import {useWeeklyReview} from '../weekly-review/use-weekly-review';
import {useDeviceRecord} from '../ai/use-device-record';
import {HABIT_EXTRAS} from '../../lib/habits-extras/schema';
import {REMINDERS_PLAN} from '../../lib/reminders-plan/schema';
import {BILLS} from '../../lib/bills/schema';
import {WORKOUTS} from '../../lib/workouts/schema';
import {isShowcase} from '../../lib/showcase';
import {AGENDA} from '../../lib/agenda/store';
import type {AgendaInput} from '../../lib/agenda/build';
import {agendaExtras} from './agenda-extras';

/**
 * The agenda in a component (Session AK, F5d): every record through its own page's hook, the agenda's own small record
 * (the view and the hidden sources, `zigoals:agenda:v1`) and the inputs passed in (agenda-extras.ts). Reading writes
 * nothing. `input` holds everything but the hidden sources, so the filter can count what it hides.
 */
const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
export function useAgenda() {
  const habits = useHabits(), health = useHealth(), platform = usePlatform(), reminders = useReminders(), weekly = useWeeklyReview();
  const extras = useDeviceRecord(HABIT_EXTRAS), plan = useDeviceRecord(REMINDERS_PLAN), bills = useDeviceRecord(BILLS), workouts = useDeviceRecord(WORKOUTS), record = useDeviceRecord(AGENDA);
  const [now] = useState(() => Date.now());
  const loaded = habits.loaded && health.loaded && platform.loaded && reminders.loaded && weekly.loaded && extras.loaded && plan.loaded && bills.loaded && workouts.loaded && record.loaded;
  const showcase = loaded && isShowcase();
  const input = useMemo<AgendaInput | null>(() => {
    if (!loaded) return null;
    const p = platform.error ? null : platform.data, more = agendaExtras({platform: p, showcase, day: habits.today});
    return {
      today: habits.today, now, zone: deviceZone(),
      habits: habits.error ? null : habits.data, habitTimes: extras.unreadable ? {} : extras.data.times ?? {}, habitReminders: reminders.unreadable ? {} : reminders.data.habits,
      platform: p, bills: bills.unreadable ? null : bills.data, workouts: workouts.unreadable ? null : workouts.data, health: health.error ? null : health.data,
      plan: plan.unreadable ? null : plan.data, weeklyReview: weekly.unreadable ? null : weekly.data, ...more,
    };
  }, [loaded, showcase, now, habits.today, habits.error, habits.data, extras.unreadable, extras.data, reminders.unreadable, reminders.data, platform.error, platform.data, bills.unreadable, bills.data, workouts.unreadable, workouts.data, health.error, health.data, plan.unreadable, plan.data, weekly.unreadable, weekly.data]);
  const unreadable = [habits.error && 'Habits', health.error && 'Health', platform.error && 'Goals', bills.unreadable && 'Bills', workouts.unreadable && 'Workouts'].filter((x): x is string => !!x);
  return {loaded, input, today: habits.today, showcase, record, unreadable};
}
