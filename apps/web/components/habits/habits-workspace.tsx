"use client";
import { HabitRhythmSection } from "../bottom-sections";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoals } from "../goal-provider";
import { usePlatform } from "../platform/use-platform";
import { useHabits } from "./use-habits";
import { HabitConsistency } from "./habit-consistency";
import { HabitCard } from "./habit-card";
import { MotionTrack } from "../motion-track";
import { LayoutLockButton, LayoutPage, LayoutRegion } from "../layout-edit";
import { entityLayoutId } from "../../lib/page-layout";
import { HabitEditor } from "./habit-editor";
import { habitDay, habitRuleOn,saveHabitTimezone } from "../../lib/habits";

type Filter = "Today" | "All" | "Completed" | "Morning" | "Afternoon" | "Evening" | "Goal linked" | "Archived";
export function HabitsWorkspace() {
  const store = useHabits();
  const goals = useGoals();
  const platform = usePlatform();
  const [filter, setFilter] = useState<Filter>("Today");
  const [editor, setEditor] = useState<string | null>(null);
  const router = useRouter();
  const addIntent = useSearchParams().get("add") === "habit";
  const [handledIntent, setHandledIntent] = useState(false);
  // Adjust local form state when the URL intent changes, before children render.
  if (addIntent !== handledIntent) {
    setHandledIntent(addIntent);
    if (addIntent) setEditor("new");
  }
  useEffect(() => {
    if (addIntent && store.loaded) router.replace("/app/habits", { scroll: false });
  }, [addIntent, store.loaded, router]);
  const [message, setMessage] = useState("");
  // The timezone form sits at the bottom of the page, so its confirmation is shown beside it.
  const [zoneMessage, setZoneMessage] = useState("");
  const goalOptions = [
    ...platform.data.goals.filter((goal) => goal.status === "active").map((goal) => ({ label: `${goal.name} · Private`, link: { chainId: "private", owner: "local", goalId: goal.id } })),
    ...goals.goals.filter((goal) => goal.status === "active").map((goal) => ({ label: goals.metadata?.goals[goal.id]?.name ?? `Goal #${goal.id}`, link: { chainId: goals.chain, owner: goals.owner, goalId: goal.id } })),
  ];
  const due = store.data.habits.filter((habit) => habitDay(habit, store.today, store.today).scheduled);
  const completed = due.filter((habit) => habitDay(habit, store.today, store.today).status === "complete");
  const visible = store.data.habits.filter((habit) => {
    const day = habitDay(habit, store.today, store.today); const archived = habitRuleOn(habit,store.today)?.state === "archived";
    if (filter === "Archived") return archived;
    if (archived) return false;
    if (filter === "All") return true;
    if (filter === "Completed") return day.status === "complete";
    if (filter === "Goal linked") return !!habit.goalLink;
    if (["Morning", "Afternoon", "Evening"].includes(filter)) return habit.timeOfDay === filter.toLowerCase();
    return day.scheduled;
  });
  const editingHabit = editor && editor !== "new" ? store.data.habits.find((habit) => habit.id === editor) : undefined;
  return <LayoutPage page="habits"><div className="habits-workspace">
    <section className="habit-hero" aria-labelledby="habits-title"><div className="habit-hero-copy"><p className="eyebrow page-eyebrow habit-eyebrow">Small steps. Your own rhythm.</p><h1 id="habits-title">Find your <span className="nebula-text">daily cadence.</span></h1><p className="page-lede">Make room for what matters. Every small return adds to the pattern.</p></div><div className="actions habit-hero-actions"><button className="primary" disabled={!store.loaded || !!store.error} onClick={() => { setEditor("new"); setMessage(""); }}>+ New habit</button><Link className="text-link" href="/app/settings">Back up private data ↗</Link></div><div className="habit-constellation" aria-hidden="true"><i /><i /><i /><i /><i /><span>✦</span></div><LayoutLockButton/></section>
    {store.error && <div className="panel"><p role="alert">{store.error}</p><button className="secondary" onClick={store.refresh}>Retry loading habits</button></div>}
    {message && <p role="status">{message}</p>}
    {!store.loaded ? <p role="status">Loading your private habits…</p> : <>
      <LayoutRegion region="body" items={[
        {id: "habits:overview", label: "Today’s rhythm", node: <section className="habit-overview" aria-label="Today’s habit progress"><div><span className="eyebrow">Today’s rhythm</span><strong>{completed.length}<span> / {due.length}</span></strong><small>scheduled habits complete</small></div><MotionTrack identity="habit-overview" className="habit-overview-track" role="progressbar" aria-label="Habits completed today" aria-valuenow={completed.length} aria-valuemin={0} aria-valuemax={Math.max(1, due.length)}><span style={{ width: `${due.length ? completed.length / due.length * 100 : 0}%` }} /></MotionTrack><p>{due.length === 0 ? "A little space for a new ritual." : completed.length === due.length ? "Today’s pattern is complete. Enjoy the space you made." : "There’s still time for a small step today."}</p></section>},
        store.data.habits.length > 0 && {id: "habits:consistency", label: "Habit consistency", node: <HabitConsistency habits={store.data.habits} today={store.today} />},
        {id: "habits:list", label: "Your habits", node: <div className="habit-list-block">
          {editor && <HabitEditor today={store.today} key={`${editor}-${goals.chain}-${goals.owner}`} habit={editingHabit} goals={goalOptions} habits={store.data.habits} onCancel={() => setEditor(null)} onSave={async (input,from,expected) => { if (editingHabit) await store.edit(editingHabit.id, input,from,expected); else await store.create(input); setMessage(editingHabit ? "Habit saved." : "Habit created."); setEditor(null); setFilter("All"); }} />}
          <div className="habit-filter-bar" role="group" aria-label="Filter habits">{(["Today", "All", "Completed", "Morning", "Afternoon", "Evening", "Goal linked", "Archived"] as const).map((item) => <button className="quiet" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
          {visible.length ? <section className="habit-grid" aria-label={`${filter} habits`}><LayoutRegion region="cards" grid allIds={store.data.habits.map(h => entityLayoutId(h.id))} items={visible.map((habit) => {
        const privateGoal = habit.goalLink?.chainId === "private" && habit.goalLink.owner === "local" ? platform.data.goals.find((goal) => goal.id === habit.goalLink!.goalId) : undefined;
        const contractGoalName = habit.goalLink && !privateGoal && goals.goals.some((goal) => goal.id === habit.goalLink!.goalId) ? goals.metadata?.goals[habit.goalLink.goalId]?.name ?? `Goal #${habit.goalLink.goalId}` : undefined;
        const scope = privateGoal ? { chainId: "private", owner: "local" } : { chainId: goals.chain, owner: goals.owner };
        return {id: entityLayoutId(habit.id), label: habit.title, node: <HabitCard key={habit.id} habit={habit} store={store} scope={scope} privateGoal={privateGoal} onViewStack={id=>{setFilter("All");requestAnimationFrame(()=>{const card=document.getElementById(`habit-${id}`);card?.scrollIntoView({block:"center"});card?.focus();});}} goalName={privateGoal?.name ?? contractGoalName} goalHref={privateGoal ? `/app/goals/tracked/${encodeURIComponent(privateGoal.id)}` : habit.goalLink ? `/app/goals/${encodeURIComponent(habit.goalLink.goalId)}` : undefined} stackName={store.data.habits.find((candidate) => candidate.id === habit.stackAfterId)?.title} onEdit={() => { setEditor(habit.id); setMessage(""); window.scrollTo({ top: 0, behavior: "instant" }); }} />};
      })}/></section> : <section className="panel habit-empty"><span aria-hidden="true">✧</span><h2>{store.data.habits.length === 0 ? "Every rhythm begins with one step." : filter === "Completed" ? "Your next check-in is waiting." : filter === "Archived" ? "No archived habits." : "A little breathing room."}</h2><p>{store.data.habits.length === 0 ? "Choose a small action you want to return to. Keep it simple, make it yours." : filter === "Today" ? "Nothing is scheduled today. View all habits to review your routine or resume a paused habit." : filter === "Completed" ? "Completed habits for today will appear here." : "Your habits stay available for history and future returns."}</p>{filter === "Today" && store.data.habits.length > 0 ? <button className="secondary" onClick={() => setFilter("All")}>View all habits</button> : <button className="primary" disabled={!!store.error} onClick={() => setEditor("new")}>Create a habit</button>}</section>}
        </div>},
        {id: "habits:rhythm", label: "Consistency by weekday", node: <HabitRhythmSection habits={store.data} today={store.today} />},
      ]}/>
      <p className="fine habit-semantics">Streaks count scheduled successful days or completed target periods. Non-scheduled and paused dates do not count against consistency. Skips and failures remain distinct. Saved timers retain timestamps across reloads and require review before logging; browser-closed reminders are not promised.</p>
    </>}
    <section className="habit-journal-settings" aria-label="Habit journal settings">
      <p className="fine habit-privacy">Private Habit records · No wallet required · Days use {store.data.timeZone??"this device’s timezone until you save a shared journal timezone"}.</p>
      {store.loaded&&!store.error&&<details className="panel habit-timezone"><summary>Habit journal timezone</summary><form onSubmit={async e=>{e.preventDefault();const zone=String(new FormData(e.currentTarget).get('timezone'));try{await store.update(data=>saveHabitTimezone(data,zone));setZoneMessage('Habit timezone saved. Existing date-only entries and saved timer timestamps remain unchanged.');}catch{setZoneMessage('Choose a valid IANA timezone, such as Europe/Brussels.');}}}><label className="field">Habit timezone<input name="timezone" required maxLength={100} defaultValue={store.data.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone}/></label><button className="secondary" type="submit">Save Habit timezone</button><p className="fine">This journal setting travels with your private data. Old dates stay as recorded. A timer started under another timezone requires explicit review.</p>{zoneMessage&&<p role="status">{zoneMessage}</p>}</form></details>}
    </section>
  </div></LayoutPage>;
}
