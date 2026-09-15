"use client";
import { useState } from "react";
import Link from "next/link";
import { useGoals } from "../goal-provider";
import { useHabits } from "./use-habits";
import { HabitCard } from "./habit-card";
import { HabitEditor } from "./habit-editor";
import { habitDay, latestHabitRule } from "../../lib/habits";

type Filter = "Today" | "All" | "Completed" | "Archived";
export function HabitsWorkspace() {
  const store = useHabits();
  const goals = useGoals();
  const [filter, setFilter] = useState<Filter>("Today");
  const [editor, setEditor] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const goalOptions = goals.goals.filter((goal) => goal.status === "active").map((goal) => ({ label: goals.metadata?.goals[goal.id]?.name ?? `Goal #${goal.id}`, link: { chainId: goals.chain, owner: goals.owner, goalId: goal.id } }));
  const due = store.data.habits.filter((habit) => habitDay(habit, store.today, store.today).scheduled);
  const completed = due.filter((habit) => habitDay(habit, store.today, store.today).status === "complete");
  const visible = store.data.habits.filter((habit) => {
    const day = habitDay(habit, store.today, store.today); const archived = latestHabitRule(habit).state === "archived";
    return filter === "Archived" ? archived : filter === "All" ? !archived : filter === "Completed" ? !archived && day.status === "complete" : !archived && day.scheduled;
  });
  const editingHabit = editor && editor !== "new" ? store.data.habits.find((habit) => habit.id === editor) : undefined;
  return <div className="habits-workspace">
    <section className="habit-hero" aria-labelledby="habits-title"><div><p className="eyebrow">Small steps. Your own rhythm.</p><h1 id="habits-title">Find your <span className="nebula-text">daily cadence.</span></h1><p>Make room for what matters. Every small return adds to the pattern.</p><div className="actions"><button className="primary" disabled={!store.loaded || !!store.error} onClick={() => { setEditor("new"); setMessage(""); }}>+ New habit</button><Link className="text-link" href="/app/settings">Back up private data ↗</Link></div></div><div className="habit-constellation" aria-hidden="true"><i /><i /><i /><i /><i /><span>✦</span></div></section>
    <p className="fine habit-privacy">Private to this browser · No wallet required · Counts use your local calendar date.</p>
    {store.error && <div className="panel"><p role="alert">{store.error}</p><button className="secondary" onClick={store.refresh}>Retry loading habits</button></div>}
    {message && <p role="status">{message}</p>}
    {!store.loaded ? <p role="status">Loading your private habits…</p> : <>
      <section className="habit-overview" aria-label="Today’s habit progress"><div><span className="eyebrow">Today’s rhythm</span><strong>{completed.length}<span> / {due.length}</span></strong><small>scheduled habits complete</small></div><div className="habit-overview-track" role="progressbar" aria-label="Habits completed today" aria-valuenow={completed.length} aria-valuemin={0} aria-valuemax={Math.max(1, due.length)}><span style={{ width: `${due.length ? completed.length / due.length * 100 : 0}%` }} /></div><p>{due.length === 0 ? "A little space for a new ritual." : completed.length === due.length ? "Today’s pattern is complete. Enjoy the space you made." : "There’s still time for a small step today."}</p></section>
      {editor && <HabitEditor key={`${editor}-${goals.chain}-${goals.owner}`} habit={editingHabit} goals={goalOptions} onCancel={() => setEditor(null)} onSave={async (input) => { if (editingHabit) await store.edit(editingHabit.id, input); else await store.create(input); setMessage(editingHabit ? "Habit saved." : "Habit created."); setEditor(null); setFilter("All"); }} />}
      <div className="habit-filter-bar" role="group" aria-label="Filter habits">{(["Today", "All", "Completed", "Archived"] as const).map((item) => <button className="quiet" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      {visible.length ? <section className="habit-grid" aria-label={`${filter} habits`}>{visible.map((habit) => <HabitCard key={habit.id} habit={habit} store={store} scope={{ chainId: goals.chain, owner: goals.owner }} goalName={habit.goalLink ? goals.goals.some((goal) => goal.id === habit.goalLink!.goalId) ? goals.metadata?.goals[habit.goalLink.goalId]?.name ?? `Goal #${habit.goalLink.goalId}` : undefined : undefined} onEdit={() => { setEditor(habit.id); setMessage(""); window.scrollTo({ top: 0, behavior: "instant" }); }} />)}</section> : <section className="panel habit-empty"><span aria-hidden="true">✧</span><h2>{store.data.habits.length === 0 ? "Every rhythm begins with one step." : filter === "Completed" ? "Your next check-in is waiting." : filter === "Archived" ? "No archived habits." : "A little breathing room."}</h2><p>{store.data.habits.length === 0 ? "Choose a small action you want to return to. Keep it simple, make it yours." : filter === "Today" ? "Nothing is scheduled today. View all habits to review your routine or resume a paused habit." : filter === "Completed" ? "Completed habits for today will appear here." : "Your habits stay available for history and future returns."}</p>{filter === "Today" && store.data.habits.length > 0 ? <button className="secondary" onClick={() => setFilter("All")}>View all habits</button> : <button className="primary" disabled={!!store.error} onClick={() => setEditor("new")}>Create a habit</button>}</section>}
      <p className="fine habit-semantics">Streaks count scheduled completed days. Rest days and pauses do not break a streak; an unfinished day breaks it after local midnight. This week means Monday through today.</p>
    </>}
  </div>;
}
