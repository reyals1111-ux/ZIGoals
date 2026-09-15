"use client";
import Link from "next/link";
import { goalLinkMatches, latestHabitRule, type HabitGoalLink } from "../../lib/habits";
import { useHabits } from "./use-habits";

export function HabitGoalLinks(scope: HabitGoalLink) {
  const store = useHabits();
  const habits = store.data.habits.filter((habit) => goalLinkMatches(habit.goalLink, scope) && latestHabitRule(habit).state !== "archived");
  if (!store.loaded || store.error || !habits.length) return null;
  return <section className="panel habit-support" aria-labelledby="supporting-habits-title"><p className="eyebrow">A little more often</p><h2 id="supporting-habits-title">Habits supporting this Goal</h2><ul>{habits.map((habit) => <li key={habit.id}>{habit.title}{latestHabitRule(habit).state === "paused" ? " · paused" : ""}</li>)}</ul><p className="fine">Private intentions linked to this Goal. Habit check-ins never move funds.</p><Link href="/app/habits" className="text-link">Manage supporting habits →</Link></section>;
}
