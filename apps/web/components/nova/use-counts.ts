'use client';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {usePlatform} from '../platform/use-platform';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {useLocalToday} from '../use-local-today';
import {useNovaBriefsUnread} from './panels/use-briefs-unread';
import {habitDay} from '../../lib/habits';
import {dailyData, healthDay, waterSummary} from '../../lib/health-daily';
import {BILLS} from '../../lib/bills/schema';
import {upcomingBills} from '../../lib/bills/store';
import {NOTES} from '../../lib/notes/schema';
import {inboxOf} from '../../lib/notes/store';
import {TASKS} from '../../lib/tasks/schema';
import {taskCounts} from '../../lib/tasks/engine';
import {FOCUS_SESSIONS} from '../../lib/focus-sessions/schema';
import {gardenOf} from '../../lib/focus-sessions/engine';

/**
 * Session AK (owner follow-up 3, N12; lane NA): the live counts beside NOVA's pages (left panel) and in "Your pages and
 * tools" (right panel), each from its own store. A count that could not be read, or has no basis (water without a
 * target), is null and shows no number, never a zero.
 */
export type NovaCounts = {
  goals: number | null; habitsLeft: number | null; waterToGoMl: number | null; waterUnit: 'ml' | 'fl-oz-us';
  nextBill: {title: string; due: string; amount: string} | null; billsRead: boolean;
  briefsUnread: number; notesInbox: number | null; tasksDue: number | null; tasksOpen: number | null; focusWeek: number | null;
};
export function useNovaCounts(): NovaCounts {
  const platform = usePlatform(), habits = useHabits(), health = useHealth(), today = useLocalToday();
  const bills = useDeviceRecord(BILLS), notes = useDeviceRecord(NOTES), tasks = useDeviceRecord(TASKS), focus = useDeviceRecord(FOCUS_SESSIONS), briefsUnread = useNovaBriefsUnread();
  return useMemo(() => {
    let waterToGoMl: number | null = null, waterUnit: 'ml' | 'fl-oz-us' = 'ml';
    if (health.loaded && !health.error) try {
      const daily = dailyData(health.data), sum = waterSummary(health.data, healthDay(daily.preferences.timezone));
      waterUnit = daily.preferences.waterUnit;
      if (sum.targetMl) waterToGoMl = Math.max(0, sum.targetMl - sum.millilitres);
    } catch { waterToGoMl = null; }
    const habitsLeft = habits.loaded && !habits.error ? habits.data.habits.filter(h => { const s = habitDay(h, habits.today, habits.today).status; return s === 'due' || s === 'partial'; }).length : null;
    const t = tasks.loaded && !tasks.unreadable ? taskCounts(tasks.data, today) : null;
    return {
      goals: platform.loaded && !platform.error ? platform.data.goals.filter(g => g.status === 'active').length : null,
      habitsLeft, waterToGoMl, waterUnit,
      nextBill: bills.loaded && !bills.unreadable ? upcomingBills(bills.data, today, 60)[0] ?? null : null, billsRead: bills.loaded && !bills.unreadable,
      briefsUnread,
      notesInbox: notes.loaded && !notes.unreadable ? inboxOf(notes.data).length : null,
      tasksDue: t ? t.overdue + t.today : null, tasksOpen: t ? t.open : null,
      focusWeek: focus.loaded && !focus.unreadable ? gardenOf(focus.data, today).weekSessions : null,
    };
  }, [platform.loaded, platform.error, platform.data, habits.loaded, habits.error, habits.data, habits.today, health.loaded, health.error, health.data, bills.loaded, bills.unreadable, bills.data, notes.loaded, notes.unreadable, notes.data, tasks.loaded, tasks.unreadable, tasks.data, focus.loaded, focus.unreadable, focus.data, briefsUnread, today]);
}
