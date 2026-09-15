"use client";
import Link from "next/link";
import { visualTone } from "../visual-tone";
import { goalLinkMatches, habitDay, habitStats } from "../../lib/habits";
import { useGoals } from "../goal-provider";
import { HabitCompletion } from "./habit-card";
import { useHabits } from "./use-habits";
import "./habits.css";

export function HabitsToday() {
  const store = useHabits();
  const goals = useGoals();
  const due = store.data.habits.filter((habit) => habitDay(habit, store.today, store.today).scheduled);
  const complete = due.filter((habit) => habitDay(habit, store.today, store.today).status === "complete").length;
  return <section className="panel habits-today" aria-labelledby="today-habits-title"><div className="habit-section-heading"><div><p className="eyebrow">Your daily cadence</p><h2 id="today-habits-title">Small steps, steady rhythm.</h2></div><span className="habit-spark" aria-hidden="true">✦</span></div>
    {!store.loaded ? <p role="status">Loading habits…</p> : store.error ? <p role="alert">{store.error}</p> : due.length ? <><p className="fine">{complete} of {due.length} complete today</p><ul className="habit-today-list">{due.slice(0, 3).map((habit) => {
      const streak = habitStats(habit, store.today).currentStreak;
      const linked = habit.goalLink && goalLinkMatches(habit.goalLink, { chainId: goals.chain, owner: goals.owner, goalId: habit.goalLink.goalId }) ? goals.metadata?.goals[habit.goalLink.goalId]?.name : undefined;
      return <li key={habit.id} data-tone={visualTone(habit.id)}><div><strong>{habit.title}</strong><small>{streak} day streak · {linked ?? habit.category}</small></div><HabitCompletion habit={habit} store={store} compact /></li>;
    })}</ul></> : <p>A small daily action can support a bigger goal. Create your first habit, or make space for today.</p>}
    <Link className="text-link" href="/app/habits">{due.length ? "View all habits →" : "Build your rhythm →"}</Link>
  </section>;
}
