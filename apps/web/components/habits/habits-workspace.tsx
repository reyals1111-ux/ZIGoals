"use client";
import { HabitRhythmSection } from "../bottom-sections";
import { useJournalZone } from "../use-journal-zone";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { hashId } from "../../lib/hash-id";
import { useGoals } from "../goal-provider";
import { usePlatform } from "../platform/use-platform";
import { useHabits } from "./use-habits";
import { HabitConsistency } from "./habit-consistency";
import { HabitCard, type HabitStackNext } from "./habit-card";
import { habitStackSuggestions } from "../../lib/habit-linked-policy";
import type { HabitData } from "../../lib/habits";
import { GlassBar } from "../progress/glass-progress";
import { LayoutLockButton, LayoutPage, LayoutRegion } from "../layout-edit";
import { entityLayoutId } from "../../lib/page-layout";
import { HabitEditor } from "./habit-editor";
import { habitDay, habitRuleOn,saveHabitTimezone } from "../../lib/habits";
import { NebulaFlow } from "../nebula-flow";
import { usePhoneActive } from "../phone/use-phone-layout";
import { phoneOrder } from "../phone/phone-order";
import { PhoneFormSheet } from "../phone/phone-form-sheet";
import { VacationPanel } from "./vacation-panel";
import { useReminders } from "../reminders/use-reminders";
import { reminderTime } from "../../lib/reminders/schema";
import { setHabitReminder } from "../../lib/reminders/store";
import { deviceSettingFailureMessage } from "../../lib/storage-error-copy";
import { useHealth } from "../health/use-health";
import { useAutoCheckIns } from "./use-auto-checkins";
import { HealthLinkContext } from "./health-link-context";
import { setHabitHealthLink } from "../../lib/habit-health-links/store";
import { exerciseData } from "../../lib/health-counters";
import { dailyData } from "../../lib/health-daily";
import { HabitIdeas } from "./habit-ideas";
import { HabitStacks } from "./habit-stacks";

/** Stack suggestions per habit, reusing the previous array while its content is the same (stable card props). */
function useStackSuggestions(data: HabitData, today: string) {
  const previous = useRef(new Map<string, readonly HabitStackNext[]>());
  return useMemo(() => {
    const next = new Map<string, readonly HabitStackNext[]>();
    for (const habit of data.habits) {
      const list = habitStackSuggestions(data, habit.id, today).map((item) => ({ id: item.id, title: item.title }));
      const old = previous.current.get(habit.id);
      next.set(habit.id, old && old.length === list.length && old.every((item, i) => item.id === list[i]!.id && item.title === list[i]!.title) ? old : list);
    }
    previous.current = next;
    return next;
  }, [data, today]);
}
const PRIVATE_SCOPE = { chainId: "private", owner: "local" };
type Filter = "Today" | "All" | "Completed" | "Morning" | "Afternoon" | "Evening" | "Goal linked" | "Archived";
/** On a phone, today's check-ins come first: Today's rhythm, your habits, then the charts. */
const PHONE_ORDER = ["habits:overview", "habits:list", "habits:consistency", "habits:rhythm"];
export function HabitsWorkspace() {
  const store = useHabits();
  // Session W Part 17: with no Habits zone, days follow the journal zone (Settings → Your time zone).
  const journalZone = useJournalZone().zone;
  // H7: the Health journal for the link choices, and the automatic check-ins applied on this page (the hook returns this device's links).
  const health = useHealth();
  const links = useAutoCheckIns({ habits: store, health });
  const healthLinkContext = useMemo(() => ({ counters: exerciseData(health.data).counters, waterUnit: dailyData(health.data).preferences.waterUnit }), [health.data]);
  const phone = usePhoneActive();
  const goals = useGoals();
  const platform = usePlatform();
  const reminders = useReminders();
  const [filter, setFilter] = useState<Filter>("Today");
  const [editor, setEditor] = useState<string | null>(null);
  const [vacation, setVacation] = useState(false);
  const [ideas, setIdeas] = useState(false);
  // Where keyboard focus goes once the editor closes (QA-20): the new or edited habit's card, or back to "+ New habit".
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const newHabitButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focusTarget || editor) return;
    const target = focusTarget === "new-habit" ? newHabitButton.current : document.getElementById(focusTarget);
    if (target) { target.focus(); setFocusTarget(null); }
  }, [focusTarget, editor, store.data]);
  // Session X P2.6: a link to one habit (#habit-<id>, the Guide's "Open habit") shows it even when today's filter would
  // hide it, and scrolls to it once the habits have loaded; once per link, so the person's own filter then stays.
  const followed = useRef<string | null>(null);
  useEffect(() => {
    if (!store.loaded) return;
    const follow = () => {
      const id = hashId(window.location.hash);
      if (!id?.startsWith("habit-") || id === followed.current) return;
      const habit = store.data.habits.find((h) => `habit-${h.id}` === id);
      if (!habit) return;
      followed.current = id;
      setFilter(habitRuleOn(habit, store.today)?.state === "archived" ? "Archived" : "All");
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center" })));
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, [store.loaded, store.data.habits, store.today]);
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
  // Card props keep their identity between check-ins (Session G, Part 2), so React.memo skips unchanged cards.
  const contractScope = useMemo(() => ({ chainId: goals.chain, owner: goals.owner }), [goals.chain, goals.owner]);
  const stacks = useStackSuggestions(store.data, store.today);
  const viewStack = useCallback((id: string) => { setFilter("All"); requestAnimationFrame(() => { const card = document.getElementById(`habit-${id}`); card?.scrollIntoView({ block: "center" }); card?.focus(); }); }, []);
  // On a phone the editor opens as a sheet over the page, so the page keeps its place.
  const editHabit = useCallback((id: string) => { setEditor(id); setMessage(""); if (!phone) window.scrollTo({ top: 0, behavior: "instant" }); }, [phone]);
  const habitEditor = editor ? <HabitEditor today={store.today} key={`${editor}-${goals.chain}-${goals.owner}-${reminders.loaded}`} habit={editingHabit} goals={goalOptions} habits={store.data.habits} reminder={editingHabit ? reminders.data.habits[editingHabit.id]?.time ?? "" : ""} healthLink={editingHabit ? links.data.links[editingHabit.id] ?? null : null} counters={healthLinkContext.counters} waterUnit={healthLinkContext.waterUnit} healthLinksUnreadable={links.unreadable} onStartOverHealthLinks={() => { links.startOver().then(() => setMessage("Your Health links on this device start over. The old bytes were kept as a recovery copy."), error => setMessage(`Your Health links could not be replaced. ${deviceSettingFailureMessage(error)}`)); }} onCancel={() => { setFocusTarget(editingHabit ? `habit-${editingHabit.id}` : "new-habit"); setEditor(null); }} onSave={async (input,from,expected,reminder="",healthLink) => { const id = editingHabit?.id ?? crypto.randomUUID(); if (editingHabit) await store.edit(id, input,from,expected); else await store.create(input, id); let saved = editingHabit ? "Habit saved." : "Habit created.";
            // The reminder time is this device's own (lib/reminders), written only when it changed. The habit is already saved.
            const time = reminderTime(reminder);
            if ((reminders.data.habits[id]?.time ?? null) !== time) { try { reminders.update(store.today, current => setHabitReminder(current, id, time, new Set([...store.data.habits.map(habit => habit.id), id]))); } catch (error) { saved += ` The reminder time was not saved on this device. ${deviceSettingFailureMessage(error)}`; } }
            // The Health link is this device's own too (lib/habit-health-links), written only when its rule changed; `undefined` means the editor had none to say (unreadable links, or a quit or limit habit keeps none).
            const linkFields = (link: typeof healthLink) => JSON.stringify(link ? { ...link, updatedAt: undefined } : null);
            if (healthLink !== undefined && !links.unreadable && linkFields(links.data.links[id] ?? null) !== linkFields(healthLink)) { try { await links.update(current => setHabitHealthLink(current, id, healthLink, new Set([...store.data.habits.map(habit => habit.id), id]))); } catch (error) { saved += ` The Health link was not saved on this device. ${deviceSettingFailureMessage(error)}`; } }
            setMessage(saved); setFocusTarget(`habit-${id}`); setEditor(null); setFilter("All"); }} /> : null;
  return <HealthLinkContext.Provider value={healthLinkContext}><LayoutPage page="habits"><div className="habits-workspace">
    <section className="habit-hero" aria-labelledby="habits-title"><div className="habit-hero-copy"><p className="eyebrow page-eyebrow habit-eyebrow"><NebulaFlow identity="habits-eyebrow">Small steps. Your own rhythm.</NebulaFlow></p><h1 id="habits-title"><NebulaFlow identity="habits-title">Find your daily cadence.</NebulaFlow></h1><p className="page-lede">Make room for what matters. Every small return adds to the pattern.</p></div><div className="actions habit-hero-actions"><button ref={newHabitButton} className="primary" disabled={!store.loaded || !!store.error} onClick={() => { setEditor("new"); setMessage(""); }}>+ New habit</button>{!phone && <button className="quiet habit-ideas-button" disabled={!store.loaded || !!store.error} aria-expanded={ideas} onClick={() => { setIdeas((open) => !open); setMessage(""); }}>Habit ideas</button>}{!phone && <button className="quiet habit-vacation-button" disabled={!store.loaded || !!store.error} aria-expanded={vacation} onClick={() => { setVacation((open) => !open); setMessage(""); }}>Vacation</button>}<Link className="text-link" href="/app/settings">Back up private data ↗</Link></div><div className="habit-constellation" aria-hidden="true"><i /><i /><i /><i /><i /><span>✦</span></div><LayoutLockButton/></section>
    {store.error && <div className="panel"><p role="alert">{store.error}</p><button className="secondary" onClick={store.refresh}>Retry loading habits</button></div>}
    {message && <p role="status">{message}</p>}
    {!store.loaded ? <p role="status">Loading your private habits…</p> : <>
      <LayoutRegion region="body" items={phoneOrder(phone, [
        {id: "habits:overview", label: "Today’s rhythm", node: <section className="habit-overview" aria-label="Today’s habit progress"><div><span className="eyebrow">Today’s rhythm</span><strong>{completed.length}<span> / {due.length}</span></strong><small>scheduled habits complete</small></div><GlassBar identity="habit-overview" className="habit-overview-track" role="progressbar" aria-label="Habits completed today" aria-valuenow={completed.length} aria-valuemin={0} aria-valuemax={Math.max(1, due.length)} value={due.length ? completed.length / due.length : 0} /><p>{due.length === 0 ? "A little space for a new ritual." : completed.length === due.length ? "Today’s pattern is complete. Enjoy the space you made." : "There’s still time for a small step today."}</p>{phone && <div className="actions habit-overview-actions"><button className="quiet habit-vacation-button" disabled={!store.loaded || !!store.error} aria-expanded={vacation} onClick={() => { setVacation((open) => !open); setMessage(""); }}>Vacation</button></div>}</section>},
        store.data.habits.length > 0 && {id: "habits:consistency", label: "Habit consistency", node: <HabitConsistency habits={store.data.habits} today={store.today} />},
        {id: "habits:list", label: "Your habits", node: <div className="habit-list-block">
          {editor && (phone
            // On a phone the editor is a bottom sheet (Session I, Part 9); elsewhere it stays in the page.
            ? <PhoneFormSheet title={editingHabit ? "Edit habit" : "Create a habit"} onClose={() => { setFocusTarget(editingHabit ? `habit-${editingHabit.id}` : "new-habit"); setEditor(null); }}>{habitEditor}</PhoneFormSheet>
            : habitEditor)}
          {vacation && (() => { const panel = <VacationPanel data={store.data} today={store.today} onMark={(range) => store.setVacation(range)} onClear={(range) => store.clearVacation(range)} onClose={() => setVacation(false)} />; return phone ? <PhoneFormSheet title="Vacation days" onClose={() => setVacation(false)}>{panel}</PhoneFormSheet> : panel; })()}
          {ideas && (() => { const panel = <HabitIdeas data={store.data} today={store.today} onClose={() => setIdeas(false)} onAdd={async (input, words) => { const id = crypto.randomUUID(); try { await store.create(input, id); setMessage(words); setFilter("All"); } catch (error) { setMessage(error instanceof Error && error.message ? error.message : "The habit was not added."); } }} />; return phone ? <PhoneFormSheet title="Habit ideas" onClose={() => setIdeas(false)}>{panel}</PhoneFormSheet> : panel; })()}
          {phone && <div className="habit-phone-ideas"><button className="quiet habit-ideas-button" disabled={!store.loaded || !!store.error} aria-expanded={ideas} onClick={() => { setIdeas((open) => !open); setMessage(""); }}>Habit ideas</button></div>}
          <HabitStacks data={store.data} today={store.today} onView={viewStack} />
          <div className="habit-filter-bar" role="group" aria-label="Filter habits">{(["Today", "All", "Completed", "Morning", "Afternoon", "Evening", "Goal linked", "Archived"] as const).map((item) => <button className="quiet" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
          {visible.length ? <section className="habit-grid" aria-label={`${filter} habits`}><LayoutRegion region="cards" grid allIds={store.data.habits.map(h => entityLayoutId(h.id))} items={visible.map((habit) => {
        const privateGoal = habit.goalLink?.chainId === "private" && habit.goalLink.owner === "local" ? platform.data.goals.find((goal) => goal.id === habit.goalLink!.goalId) : undefined;
        const contractGoalName = habit.goalLink && !privateGoal && goals.goals.some((goal) => goal.id === habit.goalLink!.goalId) ? goals.metadata?.goals[habit.goalLink.goalId]?.name ?? `Goal #${habit.goalLink.goalId}` : undefined;
        const scope = privateGoal ? PRIVATE_SCOPE : contractScope;
        return {id: entityLayoutId(habit.id), label: habit.title, node: <HabitCard key={habit.id} habit={habit} store={store.card} scope={scope} privateGoal={privateGoal} stackNext={stacks.get(habit.id)} onViewStack={viewStack} goalName={privateGoal?.name ?? contractGoalName} goalHref={privateGoal ? `/app/goals/tracked/${encodeURIComponent(privateGoal.id)}` : habit.goalLink ? `/app/goals/${encodeURIComponent(habit.goalLink.goalId)}` : undefined} stackName={store.data.habits.find((candidate) => candidate.id === habit.stackAfterId)?.title} onEdit={editHabit} />};
      })}/></section> : <section className="panel habit-empty"><span aria-hidden="true">✧</span><h2>{store.data.habits.length === 0 ? "Every rhythm begins with one step." : filter === "Completed" ? "Your next check-in is waiting." : filter === "Archived" ? "No archived habits." : "A little breathing room."}</h2><p>{store.data.habits.length === 0 ? "Choose a small action you want to return to. Keep it simple, make it yours." : filter === "Today" ? "Nothing is scheduled today. View all habits to review your routine or resume a paused habit." : filter === "Completed" ? "Completed habits for today will appear here." : "Your habits stay available for history and future returns."}</p>{filter === "Today" && store.data.habits.length > 0 ? <button className="secondary" onClick={() => setFilter("All")}>View all habits</button> : <button className="primary" disabled={!!store.error} onClick={() => setEditor("new")}>Create a habit</button>}</section>}
        </div>},
        {id: "habits:rhythm", label: "Consistency by weekday", node: <HabitRhythmSection habits={store.data} today={store.today} />},
      ], PHONE_ORDER)}/>
      <p className="fine habit-semantics">Streaks count scheduled successful days or completed target periods. Non-scheduled and paused dates do not count against consistency. Skips and failures remain distinct. Saved timers retain timestamps across reloads and require review before logging; browser-closed reminders are not promised.</p>
    </>}
    <section className="habit-journal-settings" aria-label="Habit journal settings">
      <p className="fine habit-privacy">Private Habit records · No wallet required · Days use {store.data.timeZone??(journalZone?`${journalZone}, your time zone`:"this device’s timezone until you save your time zone in Settings")}.</p>
      {store.loaded&&!store.error&&<details className="panel habit-timezone"><summary>Habit journal timezone</summary><form onSubmit={async e=>{e.preventDefault();const zone=String(new FormData(e.currentTarget).get('timezone'));try{await store.update(data=>saveHabitTimezone(data,zone));setZoneMessage('Habit timezone saved. Existing date-only entries and saved timer timestamps remain unchanged.');}catch{setZoneMessage('Choose a valid IANA timezone, such as Europe/Brussels.');}}}><label className="field">Habit timezone<input name="timezone" required maxLength={100} defaultValue={store.data.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone}/></label><button className="secondary" type="submit">Save Habit timezone</button><p className="fine">This journal setting travels with your private data. Old dates stay as recorded. A timer started under another timezone requires explicit review.</p>{zoneMessage&&<p role="status">{zoneMessage}</p>}</form></details>}
    </section>
  </div></LayoutPage></HealthLinkContext.Provider>;
}
