"use client";
import Link from "next/link";
import { habitDay } from "../../lib/habits";
import { HabitCompletion } from "./habit-card";
import { useHabits } from "./use-habits";
import "./habits.css";

export function HabitsToday() {
  const store = useHabits();
  const due = store.data.habits.filter((habit) => habitDay(habit, store.today, store.today).scheduled);
  const complete = due.filter((habit) => habitDay(habit, store.today, store.today).status === "complete").length;
  return <section className="panel habits-today" aria-labelledby="today-habits-title"><div className="habit-section-heading"><div><p className="eyebrow">Your daily cadence</p><h2 id="today-habits-title">Small steps, steady rhythm.</h2></div><span className="habit-spark" aria-hidden="true">✦</span></div>
    {!store.loaded ? <p role="status">Loading habits…</p> : store.error ? <p role="alert">{store.error}</p> : due.length ? <><p className="fine">{complete} of {due.length} complete today</p><ul className="habit-today-list">{due.slice(0, 3).map((habit) => <li key={habit.id}><div><strong>{habit.title}</strong><small>{habit.category}</small></div><HabitCompletion habit={habit} store={store} compact /></li>)}</ul></> : <p>A small daily action can support a bigger goal. Create your first habit, or make space for today.</p>}
    <Link className="text-link" href="/app/habits">{due.length ? "View all habits →" : "Build your rhythm →"}</Link>
  </section>;
}
