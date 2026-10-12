"use client";
import Link from "next/link";
import { useId } from "react";
import { visualTone } from "../visual-tone";
import { goalLinkMatches, habitDay, habitRuleOn, habitStats } from "../../lib/habits";
import { useGoals } from "../goal-provider";
import { HabitCompletion } from "./habit-card";
import { TimerChip } from "./habit-timer";
import { useHabits } from "./use-habits";
import { HabitSections } from "./habit-sections";
import { groupByTimeOfDay } from "../../lib/habits-extras/sections";
import "./habits.css";
import "./habits-aa.css";
import { SwipeRow } from "../swipe/swipe-row";

export function HabitsToday() {
  const store = useHabits();
  const goals = useGoals();
  // Today can show this section twice (built-in and widget), so its heading id is per instance (QA-30).
  const titleId = useId();
  const due = store.data.habits.filter((habit) => habitDay(habit, store.today, store.today).scheduled);
  const complete = due.filter((habit) => habitDay(habit, store.today, store.today).status === "complete").length;
  return <section className="panel habits-today" aria-labelledby={titleId}><div className="habit-section-heading"><div><p className="eyebrow">Your daily cadence</p><h2 id={titleId}>Small steps, steady rhythm.</h2></div><span className="habit-spark" aria-hidden="true">✦</span></div>
    {!store.loaded ? <p role="status">Loading habits…</p> : store.error ? <p role="alert">{store.error}</p> : due.length ? <><p className="fine">{complete} of {due.length} complete today</p><HabitSections compact sections={groupByTimeOfDay(due, store.today).filter((s) => s.habits.length > 0)} extras={null} hour={new Date().getHours()} render={(section) => <ul className="habit-today-list">{section.habits.map((habit) => {
      const streak = habitStats(habit, store.today).currentStreak;
      const linked = habit.goalLink && goalLinkMatches(habit.goalLink, { chainId: goals.chain, owner: goals.owner, goalId: habit.goalLink.goalId }) ? goals.metadata?.goals[habit.goalLink.goalId]?.name : undefined;
      const day = habitDay(habit, store.today, store.today), rule = habitRuleOn(habit, store.today);
      return <SwipeRow as="li" key={habit.id} attrs={{"data-tone": visualTone(habit.id)}} label={habit.title} completeLabel="Complete" onComplete={rule?.type === "build" && day.status !== "complete" ? () => void store.smartDone(habit.id, store.today) : undefined} actions={day.status !== "complete" && day.status !== "skipped" ? [{label: "Skip", run: () => void store.markDay(habit.id, store.today, "skipped", "Skipped · swipe")}] : []}><div><strong>{habit.title}</strong><small>{streak} day streak · {linked ?? habit.category}</small>{habit.timer && <TimerChip habit={habit} store={store} />}</div><HabitCompletion habit={habit} store={store} compact /></SwipeRow>;
    })}</ul>} /></> : <p>A small daily action can support a bigger goal. Create your first habit, or make space for today.</p>}
    <Link className="text-link" href="/app/habits">{due.length ? "View all habits →" : "Build your rhythm →"}</Link>
  </section>;
}
