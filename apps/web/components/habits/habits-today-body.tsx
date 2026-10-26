"use client";
import Link from "next/link";
import {useId, lazy, Suspense} from 'react';
import { visualTone } from "../visual-tone";
import { goalLinkMatches, habitDay, habitRuleOn, habitStats } from "../../lib/habits";
import { useGoals } from "../goal-provider";
import { HabitCompletion } from "./habit-completion";
const TimerChip = lazy(() => import("./habit-timer").then((m) => ({ default: m.TimerChip }))); // Gate A: the timer chunk loads only while a timer runs
import { useHabits } from "./use-habits";
import { HabitSections } from "./habit-sections";
import { groupByTimeOfDay, todayFocus } from "../../lib/habits-extras/sections";
import "./habits.css";
import "./habits-aa.css";
import { SwipeRow } from "../swipe/swipe-row";
import { habitsOnDay } from '../../lib/numbers/counts';

export function HabitsTodayBody() {
  const store = useHabits();
  const goals = useGoals();
  // Today can show this section twice (built-in and widget), so its heading id is per instance (QA-30).
  const titleId = useId();
  const due = store.data.habits.filter((habit) => habitDay(habit, store.today, store.today).scheduled);
  // Session AH (TR6): the shared "X of Y" (lib/numbers/counts.ts): a skipped (rest) day is listed but not due.
  const counted = habitsOnDay(store.data.habits, store.today, store.today), complete = counted.done;
  // ADR-022 B49: at most five due habits, the clock's part of the day first; the rest are one tap away on Habits.
  const focus = todayFocus(groupByTimeOfDay(due, store.today), new Date().getHours());
  return <section className="panel habits-today" aria-labelledby={titleId}><div className="habit-section-heading"><div><p className="eyebrow">Your daily cadence</p><h2 id={titleId}>Small steps, steady rhythm.</h2></div><span className="habit-spark" aria-hidden="true">✦</span></div>
    {!store.loaded ? <p role="status">Loading habits…</p> : store.error ? <p role="alert">{store.error}</p> : due.length ? <><p className="fine">{complete} of {counted.due} complete today</p><HabitSections compact sections={focus.sections} extras={null} hour={new Date().getHours()} render={(section) => <ul className="habit-today-list">{section.habits.map((habit) => {
      const streak = habitStats(habit, store.today).currentStreak;
      const linked = habit.goalLink && goalLinkMatches(habit.goalLink, { chainId: goals.chain, owner: goals.owner, goalId: habit.goalLink.goalId }) ? goals.metadata?.goals[habit.goalLink.goalId]?.name : undefined;
      const day = habitDay(habit, store.today, store.today), rule = habitRuleOn(habit, store.today);
      return <SwipeRow as="li" key={habit.id} attrs={{"data-tone": visualTone(habit.id)}} label={habit.title} completeLabel="Complete" onComplete={rule?.type === "build" && day.status !== "complete" ? () => void store.smartDone(habit.id, store.today) : undefined} actions={day.status !== "complete" && day.status !== "skipped" ? [{label: "Skip", run: () => void store.markDay(habit.id, store.today, "skipped", "Skipped · swipe")}] : []}><div><strong>{habit.title}</strong><small>{streak} day streak · {linked ?? habit.category}</small>{habit.timer && <Suspense fallback={null}><TimerChip habit={habit} store={store} /></Suspense>}</div><HabitCompletion habit={habit} store={store} compact /></SwipeRow>;
    })}</ul>} /></> : <p>A small daily action can support a bigger goal. Create your first habit, or make space for today.</p>}
    <Link className="text-link" href="/app/habits">{due.length ? focus.hidden ? `${focus.hidden} more today · all habits →` : "View all habits →" : "Build your rhythm →"}</Link>
  </section>;
}
