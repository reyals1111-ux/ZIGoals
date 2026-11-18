'use client';
import type {ReactNode} from 'react';
import {CHECKLIST_DAYS} from '../../../../lib/checklist/schema';
import {FOCUS_SESSIONS, type FocusSessions} from '../../../../lib/focus-sessions/schema';
import type {Habit} from '../../../../lib/habits';
import type {LifeInput} from '../../../../lib/nova/cards/ax/day-life';
import type {ClockInput} from '../../../../lib/nova/holo/agenda';
import {scopesOf} from '../../../../lib/nova/scopes';
import {NOVA_SETUP} from '../../../../lib/nova/setup';
import {NOTES, type Notes} from '../../../../lib/notes/schema';
import type {OrbitSummary} from '../../../../lib/orbit-card/summary';
import {TASKS, type Tasks} from '../../../../lib/tasks/schema';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {useHabits} from '../../../habits/use-habits';
import {useTaskClock} from '../../../tasks/use-task-list';
import {CardNotice} from '../../cards/kit';
import {HoloReading, HoloUnread} from '../../holo/parts';
import {useAgendaToday} from '../../holo/use-agenda-today';
import {usePillarShown} from '../../holo/use-hud-data';
import {useOrbitDay} from '../use-orbit-day';
import {HabitSource} from './sources';

/**
 * Session AS (ADR-042 Part 2): where the answer widgets of the day's own records get them — the pages' own stores,
 * through the hooks the other widgets use (the Tasks page's record and clock, the Notes record, the Agenda page's day,
 * the Checklist's orbit), as ./sources.tsx does for habits, the journal and focus. A source handles every state that has
 * no figure (reading, unreadable, nothing kept yet) and hands the live records to its child.
 */
/** Every habit kept (archived ones too: a habit archived last week was still due the week before), behind the same states as `HabitSource`. */
export function HabitsSource({children}: {children: (all: readonly Habit[], live: readonly Habit[], today: string) => ReactNode}) {
  return <HabitSource>{(_habit, live, today) => <AllHabits live={live} today={today}>{children}</AllHabits>}</HabitSource>;
}
function AllHabits({live, today, children}: {live: readonly Habit[]; today: string; children: (all: readonly Habit[], live: readonly Habit[], today: string) => ReactNode}) {
  const habits = useHabits();
  return <>{children(habits.loaded && !habits.error ? habits.data.habits : live, live, today)}</>;
}
/** The Tasks page's record with the app's day and wall clock (kept current), so a timed task turns late after its time here too. */
export function TasksSource({children}: {children: (tasks: Tasks, today: string, clock: string) => ReactNode}) {
  const tasks = useDeviceRecord(TASKS), {today, clock} = useTaskClock();
  if (!tasks.loaded) return <HoloReading/>;
  if (tasks.unreadable) return <HoloUnread what="Your tasks"/>;
  if (!tasks.data.tasks.length) return <CardNotice kind="empty" ghost="rows" title="No tasks yet" href="/app/tasks" action="Add a task">Your tasks show here by their day once you add one.</CardNotice>;
  return <>{children(tasks.data, today, clock)}</>;
}
/** The Notes record. Only its counts and days are read by the widgets here; a note's text stays on its page. */
export function NotesSource({children}: {children: (notes: Notes) => ReactNode}) {
  const notes = useDeviceRecord(NOTES);
  if (!notes.loaded) return <HoloReading/>;
  if (notes.unreadable) return <HoloUnread what="Your notes"/>;
  if (!notes.data.notes.length) return <CardNotice kind="empty" ghost="sky" title="No notes yet" href="/app/notes" action="Write a note">Each note you keep lights a star here, grouped by its kind.</CardNotice>;
  return <>{children(notes.data)}</>;
}
/** Today's agenda as the Agenda page's day view builds it, with the wall clock. */
export function AgendaSource({children}: {children: (items: readonly ClockInput[], now: string) => ReactNode}) {
  const {items, now} = useAgendaToday();
  if (!items) return <HoloReading/>;
  if (!items.length) return <CardNotice kind="empty" ghost="columns" title="Nothing on today yet" href="/app/habits?add=habit" action="Add a habit">A habit with a time, a task, a bill or a plan shows here at its hour.</CardNotice>;
  return <>{children(items, now)}</>;
}
/** Today's orbit: the Checklist's planets, or today's due habits where no Checklist is kept (lib/orbit-card/summary.ts). */
export function OrbitSource({children}: {children: (orbit: OrbitSummary) => ReactNode}) {
  const {summary, error} = useOrbitDay();
  if (error) return <HoloUnread what="Your Checklist"/>;
  if (!summary) return <HoloReading/>;
  if (summary.source === 'none' || !summary.total) return <CardNotice kind="empty" ghost="ring" title="Nothing on today’s orbit yet" href="/app/checklist" action="Open the Checklist">A dot lights here for each thing you tick today: star something for the Checklist, or add a habit.</CardNotice>;
  return <>{children(summary)}</>;
}

/**
 * The records the life radar and the day scan read, each under its own switch: Habits only while its page is shown and
 * NOVA's Habits permission is on (else that part is left out, never shown as zero); tasks and focus are the day's own.
 * A record that cannot be read is left out too. `ready` is false until every one has been read.
 */
export function useDayRecords(): {ready: boolean; today: string; clock: string; habits: readonly Habit[] | null; tasks: Tasks | null; focus: FocusSessions['sessions'] | null} {
  const shown = usePillarShown('habits'), setup = useDeviceRecord(NOVA_SETUP), habits = useHabits(), tasks = useDeviceRecord(TASKS), focus = useDeviceRecord(FOCUS_SESSIONS), {today, clock} = useTaskClock();
  const allowed = shown && scopesOf(setup.loaded && !setup.unreadable ? setup.data : {version: 1}).habits;
  return {
    ready: setup.loaded && habits.loaded && tasks.loaded && focus.loaded, today: habits.loaded ? habits.today : today, clock,
    habits: allowed && habits.loaded && !habits.error ? habits.data.habits : null,
    tasks: tasks.loaded && !tasks.unreadable ? tasks.data : null,
    focus: focus.loaded && !focus.unreadable ? focus.data.sessions : null,
  };
}
/** The Checklist's kept days as counts, with today's live count where a Checklist is kept; null when there is none to read. */
export function useChecklistCounts(today: string): {ready: boolean; checklist: LifeInput['checklist']} {
  const days = useDeviceRecord(CHECKLIST_DAYS), {summary} = useOrbitDay();
  if (!days.loaded || !summary) return {ready: false, checklist: null};
  const live = summary.source === 'checklist' ? {date: today, done: summary.done, total: summary.total} : null;
  if (days.unreadable || (!live && !Object.keys(days.data.days).length)) return {ready: true, checklist: null};
  return {ready: true, checklist: {days: days.data.days, today: live}};
}
