'use client';
import type {ReactNode} from 'react';
import {latestHabitRule, type Habit} from '../../../../lib/habits';
import type {HealthData} from '../../../../lib/health';
import {FOCUS_SESSIONS, type FocusSessions} from '../../../../lib/focus-sessions/schema';
import {JOURNAL, type Journal} from '../../../../lib/journal/schema';
import {localDate} from '../../../../lib/local-date';
import type {Workouts} from '../../../../lib/workouts/schema';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {useHabits} from '../../../habits/use-habits';
import {useHealth} from '../../../health/use-health';
import {useWorkouts} from '../../../health/workouts/use-workouts';
import {CardNotice} from '../../cards/kit';
import {HoloHidden, HoloReading, HoloUnread} from '../../holo/parts';
import {usePillarShown} from '../../holo/use-hud-data';
import {WidgetLocked} from '../../stage/stage-parts';
import {useHealthDay, useHealthGate} from '../use-health-gate';

/**
 * Session AS (ADR-042 Part 2): where an answer widget gets its records — the pages' own stores, through the hooks the
 * other widgets use, each behind the same switches. A source handles every state that has no figure (the pillar switched
 * off, a closed Health gate, reading, unreadable, nothing kept yet) and hands the live records to its child, so a widget
 * kind is only its instrument. Health's records are read only once the Health switches are open (the inner component
 * mounts then, as components/nova/widgets/meditation.tsx does).
 */
export function HabitSource({refId, children}: {refId?: string; children: (habit: Habit, habits: readonly Habit[], today: string) => ReactNode}) {
  const shown = usePillarShown('habits'), habits = useHabits();
  if (!shown) return <HoloHidden pillar="Habits"/>;
  if (!habits.loaded) return <HoloReading/>;
  if (habits.error) return <HoloUnread what="Your habits"/>;
  const live = habits.data.habits.filter(h => latestHabitRule(h).state !== 'archived');
  if (!live.length) return <CardNotice kind="empty" ghost="lattice" title="No habits yet" href="/app/habits?add=habit" action="Add a habit">Your habits’ days light up here once you keep one.</CardNotice>;
  return <>{children(live.find(h => h.id === refId) ?? live[0]!, live, habits.today)}</>;
}
export function HealthSource({id, children}: {id: string; children: (health: HealthData, day: string) => ReactNode}) {
  const shown = usePillarShown('health'), gate = useHealthGate();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (gate === 'locked') return <WidgetLocked id={id}/>;
  if (gate === 'reading') return <HoloReading/>;
  return <HealthLive>{children}</HealthLive>;
}
function HealthLive({children}: {children: (health: HealthData, day: string) => ReactNode}) {
  const health = useHealth(), day = useHealthDay();
  if (!health.loaded) return <HoloReading/>;
  if (health.error) return <HoloUnread what="Your Health records"/>;
  return <>{children(health.data, day)}</>;
}
/** The workout log sits behind the Health switches too. */
export function WorkoutsSource({id, children}: {id: string; children: (workouts: Workouts, day: string) => ReactNode}) {
  return <HealthSource id={id}>{(_health, day) => <WorkoutsLive day={day}>{children}</WorkoutsLive>}</HealthSource>;
}
function WorkoutsLive({day, children}: {day: string; children: (workouts: Workouts, day: string) => ReactNode}) {
  const workouts = useWorkouts();
  if (!workouts.loaded) return <HoloReading/>;
  if (workouts.unreadable) return <HoloUnread what="Your workout log"/>;
  return <>{children(workouts.data, day)}</>;
}
export function JournalSource({children}: {children: (journal: Journal, today: string) => ReactNode}) {
  const journal = useDeviceRecord(JOURNAL);
  if (!journal.loaded) return <HoloReading/>;
  if (journal.unreadable) return <HoloUnread what="Your journal"/>;
  if (!journal.data.entries.length) return <CardNotice kind="empty" ghost="lattice" title="No entries yet" href="/app/journal" action="Write today’s entry">The days you write light up here.</CardNotice>;
  return <>{children(journal.data, localDate())}</>;
}
export function FocusSource({children}: {children: (focus: FocusSessions, today: string) => ReactNode}) {
  const focus = useDeviceRecord(FOCUS_SESSIONS);
  if (!focus.loaded) return <HoloReading/>;
  if (focus.unreadable) return <HoloUnread what="Your focus sessions"/>;
  if (!focus.data.sessions.length) return <CardNotice kind="empty" ghost="columns" title="No focus session yet" href="/app/journey?focus=pomodoro#focus" action="Start a focus session">Your focused minutes show here, day by day.</CardNotice>;
  return <>{children(focus.data, localDate())}</>;
}
