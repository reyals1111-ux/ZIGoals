"use client";
import { HabitRhythmSection } from "../bottom-sections";
import { useJournalZone } from "../use-journal-zone";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readConfirmDelete } from "../../lib/confirm-delete";
import { useRouter, useSearchParams } from "next/navigation";
import { hashId } from "../../lib/hash-id";
import { holdInView } from "../settings/keep-jump";
import { useGoals } from "../goal-provider";
import { usePlatform } from "../platform/use-platform";
import { useHabits } from "./use-habits";
// Gate C (ADR-022 B49): its own chunk, for the Habits page budget; the wrapper below carries the layout attributes.
// Session AB-Design Phase 2 (ADR-024): the chunk is fetched as soon as this page's code runs, and the section renders in
// the page's own pass once it is there (through React.lazy it showed ~0.3 s after everything else, inside the first
// screen); a chunk that fails to load shows nothing, as the quiet boundary did.
// Gate C: Habit stacks and Routines, the two sections then above the filter bar, load the same way. Through React.lazy the
// Routines list arrived ~0.5 s late under load and pushed the filter bar off the screen while a keyboard user was on it
// (a11y-wcag-x, "All" not on screen when focused; Phase 1's "Afternoon"/"Evening" intermittent was the same shift).
// Session AE (Part 4, ADR-027): they are their own block after the groups now, so they can no longer push the filters.
function withPage<P extends object>(load: () => Promise<React.ComponentType<P>>) {
  let ready: React.ComponentType<P> | null = null;
  const loading = typeof window === "undefined" ? null : load().then((view) => (ready = view)).catch(() => null);
  return function PageSection(props: P) {
    const [View, setView] = useState<React.ComponentType<P> | null>(() => ready);
    useEffect(() => {
      if (View || !loading) return;
      let live = true;
      void loading.then((view) => { if (live && view) setView(() => view); });
      return () => { live = false; };
    }, [View]);
    return View ? <View {...props} /> : null;
  };
}
const HabitConsistency = withPage(() => import("./habit-consistency").then((m) => m.HabitConsistency));
import { HabitEditor } from "./habit-editor"; // static on purpose: creating or editing a habit must work offline on a device that never opened the editor (CI's L78 offline step hit a chunk load, ADR-022 B48)
import { HabitCard, type HabitStackNext } from "./habit-card";
import { habitStackSuggestions } from "../../lib/habit-linked-policy";
import type { Habit, HabitData } from "../../lib/habits";
import type { DeletedHabit } from "../../lib/habit-delete";
import { GlassBar } from "../progress/glass-progress";
import { LayoutLockButton, LayoutPage, LayoutRegion, PageTools} from "../layout-edit";
import { entityLayoutId } from "../../lib/page-layout";
import { habitDay, habitRuleOn,saveHabitTimezone } from "../../lib/habits";
import { NebulaFlow } from "../nebula-flow";
import { PillarHero } from "../pillar-hero";
import {EmptyState} from '../ui/empty-state';
import { LoadBoundary } from "../load-boundary";
import { usePhoneActive } from "../phone/use-phone-layout";
import { phoneOrder } from "../phone/phone-order";
import { PhoneFormSheet } from "../phone/phone-form-sheet";
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
const HabitStacks = withPage(() => import("./habit-stacks").then((m) => m.HabitStacks)); // Gate C (ADR-022 B49): its own chunk, for the Habits page budget; with the page (above)
import { useHabitExtras } from "./use-habit-extras";
import { HabitExtrasContext } from "./habit-extras-context";
import { HabitSections } from "./habit-sections";
import { groupByTimeOfDay } from "../../lib/habits-extras/sections";
import { habitArea } from "../../lib/habits-extras/store";
import "./habits-aa.css";
import { ProgressSlot } from "../game/slot-local";
import {Skeleton} from '../ui/skeleton';
// Session AA-Local Part 1: the routine player and the year view load when they are opened.
const RoutinePlayer = lazy(() => import("./routine-player").then((m) => ({ default: m.RoutinePlayer })));
const YearView = lazy(() => import("./year-view").then((m) => ({ default: m.YearView })));
const RoutinesPanel = withPage(() => import("./routines-panel").then((m) => m.RoutinesPanel)); // Gate A (B41): the routines list and its templates in their own chunk; with the page (above)
// Session Z-Cloud Part 4 (weights, ADR-019 C39): the vacation and ideas panels load when they are opened.
const VacationPanel = lazy(() => import("./vacation-panel").then((m) => ({ default: m.VacationPanel })));
const HabitIdeas = lazy(() => import("./habit-ideas").then((m) => ({ default: m.HabitIdeas })));

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
/** On a phone, today's check-ins come first: Today's rhythm, your habits, your routines, then the charts. */
const PHONE_ORDER = ["habits:overview", "habits:list", "habits:routines", "habits:consistency", "habits:rhythm"]; // ADR-022 B49: the game card and the year view are not layout items
/** The filters whose habits are shown in the four time-of-day sections (H1); the others are flat lists. */
const SECTIONED: readonly Filter[] = ["Today", "All", "Completed", "Goal linked"];
/**
 * Phase 2 closing pass (item 5): the full-screen routine player in a native modal dialog — focus stays inside it, Escape
 * pauses and closes it, and focus goes back to the control that opened it.
 */
function RoutineSheet({onClose, children}: {onClose: () => void; children: React.ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current, back = document.activeElement as HTMLElement | null; dialog?.showModal(); return () => { dialog?.close(); back?.focus?.(); }; }, []);
  return <dialog ref={ref} className="routine-sheet" aria-label="Routine" onCancel={e => { e.preventDefault(); onClose(); }}>{children}</dialog>;
}
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
  // Session AA-Local Part 1: areas (H6), the routine player (H5) and the year view (H8).
  const extras = useHabitExtras();
  const [area, setArea] = useState<string>("all");
  const [routine, setRoutine] = useState<string | null>(null);
  const [yearOpen, setYearOpen] = useState(false);
  useEffect(() => {
    const follow = () => { const match = /#routine=([^&]+)/.exec(window.location.hash); if (match) { setRoutine(decodeURIComponent(match[1]!)); history.replaceState(null, "", window.location.pathname + window.location.search); } if (window.location.hash === "#year") { setYearOpen(true); requestAnimationFrame(() => document.getElementById("habit-year-title")?.scrollIntoView({block: "start"})); } if (window.location.hash === "#routines") requestAnimationFrame(() => document.getElementById("habit-routines-title")?.scrollIntoView({block: "start"})); };
    follow(); window.addEventListener("hashchange", follow); return () => window.removeEventListener("hashchange", follow);
  }, []);
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
      // Session Z-Cloud Gate B: a ZIGi card's #confirm-delete=habit:<id> shows that habit too (its card opens the confirmation).
      const asked = readConfirmDelete(window.location.hash), id = asked?.what === "habit" ? `habit-${asked.id}` : hashId(window.location.hash);
      if (!id?.startsWith("habit-") || id === followed.current) return;
      const habit = store.data.habits.find((h) => `habit-${h.id}` === id);
      if (!habit) return;
      followed.current = id;
      setFilter(habitRuleOn(habit, store.today)?.state === "archived" ? "Archived" : "All");
      requestAnimationFrame(() => requestAnimationFrame(() => { const el = document.getElementById(id); if (el) { el.scrollIntoView({ block: "center" }); holdInView(el); } }));
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
    if (area !== "all" && extras.loaded && habitArea(extras.data, habit.id) !== area) return false;
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
  // Session Z-Cloud Part 4.6: "Delete for good" from an archived habit, with Undo for ten seconds.
  const [deletedHabit, setDeletedHabit] = useState<{ deleted: DeletedHabit; title: string; until: number } | null>(null), [clock, setClock] = useState(() => Date.now());
  useEffect(() => { if (!deletedHabit) return; const timer = window.setInterval(() => { const now = Date.now(); setClock(now); if (now >= deletedHabit.until) setDeletedHabit(null); }, 500); return () => window.clearInterval(timer); }, [deletedHabit]);
  const deleteForGoodAction = store.deleteForGood;
  const deleteForGood = useCallback(async (habit: Habit) => { const deleted = await deleteForGoodAction(habit.id); setMessage(""); setClock(Date.now()); setDeletedHabit({ deleted, title: habit.title, until: Date.now() + 10_000 }); }, [deleteForGoodAction]);
  async function undoDeleteForGood() {
    if (!deletedHabit) return;
    const { deleted, title } = deletedHabit; setDeletedHabit(null);
    try { await store.undoDelete(deleted); setMessage(`“${title}” is back in Archived.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Undo was not applied."); }
  }
  const cardEntry = (habit: Habit) => {
        const privateGoal = habit.goalLink?.chainId === "private" && habit.goalLink.owner === "local" ? platform.data.goals.find((goal) => goal.id === habit.goalLink!.goalId) : undefined;
        const contractGoalName = habit.goalLink && !privateGoal && goals.goals.some((goal) => goal.id === habit.goalLink!.goalId) ? goals.metadata?.goals[habit.goalLink.goalId]?.name ?? `Goal #${habit.goalLink.goalId}` : undefined;
        const scope = privateGoal ? PRIVATE_SCOPE : contractScope;
        return {id: entityLayoutId(habit.id), label: habit.title, node: <HabitCard key={habit.id} habit={habit} store={store.card} scope={scope} privateGoal={privateGoal} stackNext={stacks.get(habit.id)} onViewStack={viewStack} goalName={privateGoal?.name ?? contractGoalName} goalHref={privateGoal ? `/app/goals/tracked/${encodeURIComponent(privateGoal.id)}` : habit.goalLink ? `/app/goals/${encodeURIComponent(habit.goalLink.goalId)}` : undefined} stackName={store.data.habits.find((candidate) => candidate.id === habit.stackAfterId)?.title} onEdit={editHabit} onDeleteForGood={deleteForGood} />};
  };
  const usedAreas = extras.loaded ? extras.areas.filter((a) => store.data.habits.some((h) => habitArea(extras.data, h.id) === a.id)) : [];
  const sectioned = SECTIONED.includes(filter);
  const habitEditor = editor ? <HabitEditor onIdeas={editor === "new" ? () => { setIdeas(true); setMessage(""); } : undefined} today={store.today} key={`${editor}-${goals.chain}-${goals.owner}-${reminders.loaded}`} habit={editingHabit} goals={goalOptions} habits={store.data.habits} reminder={editingHabit ? reminders.data.habits[editingHabit.id]?.time ?? "" : ""} healthLink={editingHabit ? links.data.links[editingHabit.id] ?? null : null} counters={healthLinkContext.counters} waterUnit={healthLinkContext.waterUnit} healthLinksUnreadable={links.unreadable} onStartOverHealthLinks={() => { links.startOver().then(() => setMessage("Your Health links on this device start over. The old bytes were kept as a recovery copy."), error => setMessage(`Your Health links could not be replaced. ${deviceSettingFailureMessage(error)}`)); }} onCancel={() => { setFocusTarget(editingHabit ? `habit-${editingHabit.id}` : "new-habit"); setEditor(null); }} onSave={async (input,from,expected,reminder="",healthLink) => { const id = editingHabit?.id ?? crypto.randomUUID(); if (editingHabit) await store.edit(id, input,from,expected); else await store.create(input, id); let saved = editingHabit ? "Habit saved." : "Habit created.";
            // The reminder time is this device's own (lib/reminders), written only when it changed. The habit is already saved.
            const time = reminderTime(reminder);
            if ((reminders.data.habits[id]?.time ?? null) !== time) { try { reminders.update(store.today, current => setHabitReminder(current, id, time, new Set([...store.data.habits.map(habit => habit.id), id]))); } catch (error) { saved += ` The reminder time was not saved on this device. ${deviceSettingFailureMessage(error)}`; } }
            // The Health link is this device's own too (lib/habit-health-links), written only when its rule changed; `undefined` means the editor had none to say (unreadable links, or a quit or limit habit keeps none).
            const linkFields = (link: typeof healthLink) => JSON.stringify(link ? { ...link, updatedAt: undefined } : null);
            if (healthLink !== undefined && !links.unreadable && linkFields(links.data.links[id] ?? null) !== linkFields(healthLink)) { try { await links.update(current => setHabitHealthLink(current, id, healthLink, new Set([...store.data.habits.map(habit => habit.id), id]))); } catch (error) { saved += ` The Health link was not saved on this device. ${deviceSettingFailureMessage(error)}`; } }
            setMessage(saved); setFocusTarget(`habit-${id}`); setEditor(null); setFilter("All"); }} /> : null;
  return <HealthLinkContext.Provider value={healthLinkContext}><HabitExtrasContext.Provider value={extras}><LayoutPage page="habits"><div className="habits-workspace">
    {routine && <RoutineSheet onClose={() => setRoutine(null)}><Suspense fallback={null}><RoutinePlayer headId={routine} store={store} extras={extras} onClose={() => setRoutine(null)} /></Suspense></RoutineSheet>}
    {/* Session AB-Design Phase 2 (ADR-024 P5): the shared pillar header, cut from this page's own. Habit ideas opens from the new-habit editor as "Start from an idea"; Vacation is a small button beside the lock (PageTools). */}
    <PillarHero pillar="habits" titleId="habits-title" className="habit-hero" actionsClass="habit-hero-actions" eyebrow="Small steps. Your own rhythm." title="Find your daily cadence." lede="Make room for what matters. Every small return adds to the pattern." about="habits"
      buttons={<button ref={newHabitButton} className="primary" disabled={!store.loaded || !!store.error} onClick={() => { setEditor("new"); setMessage(""); }}>+ New habit</button>}
      art={<div className="habit-constellation"><i /><i /><i /><i /><i /><span>✦</span></div>}>
      {!phone && <PageTools><button className="quiet habit-vacation-button page-tool" disabled={!store.loaded || !!store.error} aria-expanded={vacation} onClick={() => { setVacation((open) => !open); setMessage(""); }}>Vacation</button></PageTools>}<LayoutLockButton/>
    </PillarHero>
    {store.error && <div className="panel"><p role="alert">{store.error}</p><button className="secondary" onClick={store.refresh}>Retry loading habits</button></div>}
    {message && <p role="status">{message}</p>}
    {deletedHabit && <p role="status" className="habit-deleted">“{deletedHabit.title}” was deleted for good. <button type="button" className="secondary" onClick={() => void undoDeleteForGood()}>Undo · {Math.max(0, Math.ceil((deletedHabit.until - clock) / 1000))} s</button></p>}
    {!store.loaded ? <p role="status">Loading your private habits…</p> : <>
      <LayoutRegion region="body" items={phoneOrder(phone, [
        {id: "habits:overview", label: "Today’s rhythm", node: <section className="habit-overview" aria-label="Today’s habit progress"><div><span className="eyebrow">Today’s rhythm</span><strong>{completed.length}<span> / {due.length}</span></strong><small>scheduled habits complete</small></div><GlassBar identity="habit-overview" className="habit-overview-track" role="progressbar" aria-label="Habits completed today" aria-valuenow={completed.length} aria-valuemin={0} aria-valuemax={Math.max(1, due.length)} value={due.length ? completed.length / due.length : 0} /><p>{due.length === 0 ? "A little space for a new ritual." : completed.length === due.length ? "Today’s pattern is complete. Enjoy the space you made." : "There’s still time for a small step today."}</p>{phone && <div className="actions habit-overview-actions"><button className="quiet habit-vacation-button" disabled={!store.loaded || !!store.error} aria-expanded={vacation} onClick={() => { setVacation((open) => !open); setMessage(""); }}>Vacation</button></div>}</section>},
        store.data.habits.length > 0 && {id: "habits:consistency", label: "Habit consistency", node: <div className="habit-consistency-slot"><LoadBoundary quiet><Suspense fallback={null}><HabitConsistency habits={store.data.habits} today={store.today} /></Suspense></LoadBoundary></div>},
        {id: "habits:list", label: "Your habits", node: <div className="habit-list-block">
          {editor && (phone
            // On a phone the editor is a bottom sheet (Session I, Part 9); elsewhere it stays in the page.
            ? <PhoneFormSheet title={editingHabit ? "Edit habit" : "Create a habit"} onClose={() => { setFocusTarget(editingHabit ? `habit-${editingHabit.id}` : "new-habit"); setEditor(null); }}>{habitEditor}</PhoneFormSheet>
            : habitEditor)}
          {vacation && (() => { const panel = <LoadBoundary quiet><Suspense fallback={null}><VacationPanel data={store.data} today={store.today} onMark={(range) => store.setVacation(range)} onClear={(range) => store.clearVacation(range)} onClose={() => setVacation(false)} /></Suspense></LoadBoundary>; return phone ? <PhoneFormSheet title="Vacation days" onClose={() => setVacation(false)}>{panel}</PhoneFormSheet> : panel; })()}
          {ideas && (() => { const panel = <LoadBoundary quiet><Suspense fallback={null}><HabitIdeas data={store.data} today={store.today} onClose={() => setIdeas(false)} onAdd={async (input, words) => { const id = crypto.randomUUID(); try { await store.create(input, id); setMessage(words); setFilter("All"); } catch (error) { setMessage(error instanceof Error && error.message ? error.message : "The habit was not added."); } }} /></Suspense></LoadBoundary>; return phone ? <PhoneFormSheet title="Habit ideas" onClose={() => setIdeas(false)}>{panel}</PhoneFormSheet> : panel; })()}
          {phone && <div className="habit-phone-ideas"><button className="quiet habit-ideas-button" disabled={!store.loaded || !!store.error} aria-expanded={ideas} onClick={() => { setIdeas((open) => !open); setMessage(""); }}>Habit ideas</button></div>}
          <div className="habit-filter-bar" role="group" aria-label="Filter habits">{(["Today", "All", "Completed", "Morning", "Afternoon", "Evening", "Goal linked", "Archived"] as const).map((item) => <button className="quiet" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
          {usedAreas.length > 0 && <div className="habit-area-bar" role="group" aria-label="Filter by area"><span className="eyebrow">Area</span><button className="quiet" aria-pressed={area === "all"} onClick={() => setArea("all")}>All areas</button>{usedAreas.map((a) => <button className="quiet" key={a.id} aria-pressed={area === a.id} onClick={() => setArea(a.id)}>{a.label}</button>)}</div>}
          {visible.length && sectioned ? <section className="habit-grid-sections" aria-label={`${filter} habits`}><HabitSections sections={groupByTimeOfDay(visible, store.today)} extras={extras} hour={new Date().getHours()} onNew={() => { setEditor("new"); setMessage(""); }} render={(section) => <section className="habit-grid" aria-label={`${section.label} habits`}><LayoutRegion region={`cards:${section.id}`} grid allIds={section.habits.map((h) => entityLayoutId(h.id))} items={section.habits.map(cardEntry)} /></section>} /></section>
          : visible.length ? <section className="habit-grid" aria-label={`${filter} habits`}><LayoutRegion region="cards" grid allIds={store.data.habits.map(h => entityLayoutId(h.id))} items={visible.map(cardEntry)}/></section> : <EmptyState as="section" level={2} className="panel habit-empty" zigi="encouraging" title={store.data.habits.length === 0 ? "Every rhythm begins with one step." : filter === "Completed" ? "Your next check-in is waiting." : filter === "Archived" ? "No archived habits." : "A little breathing room."} action={filter === "Today" && store.data.habits.length > 0 ? <button className="secondary" onClick={() => setFilter("All")}>View all habits</button> : <button className="primary" disabled={!!store.error} onClick={() => setEditor("new")}>Create a habit</button>}>{store.data.habits.length === 0 ? "Choose a small action you want to return to. Keep it simple, make it yours." : filter === "Today" ? "Nothing is scheduled today. View all habits to review your routine or resume a paused habit." : filter === "Completed" ? "Completed habits for today will appear here." : "Your habits stay available for history and future returns."}</EmptyState>}
          {store.data.habits.length > 0 && <LoadBoundary quiet>{yearOpen ? <Suspense fallback={<section className="panel habit-year"><Skeleton label="Opening the year view…" block/></section>}><YearView habits={store.data.habits} today={store.today} /></Suspense> : <section className="panel habit-year habit-year-closed" aria-labelledby="habit-year-title"><div className="habit-section-heading"><div><p className="eyebrow">The long view</p><h2 id="habit-year-title"><NebulaFlow identity="habit-year-title">Year view</NebulaFlow></h2><p className="fine">A full year per habit, and every habit at once.</p></div><button type="button" className="secondary" onClick={() => setYearOpen(true)}>Open the year view</button></div></section>}</LoadBoundary>}
        </div>},
        // Session AE (Part 4, ADR-027): the owner's S4. Routines and your stacks (the same chains, played or listed) are their own
        // movable block, by default right after the groups; the filters, the groups and the year view stay one block.
        {id: "habits:routines", label: "Routines", node: <div className="habit-routines-block">
          <LoadBoundary quiet><Suspense fallback={null}><HabitStacks data={store.data} today={store.today} onView={viewStack} /></Suspense></LoadBoundary>
          <LoadBoundary quiet><Suspense fallback={null}><RoutinesPanel store={store} onPlay={(id) => { setRoutine(id); setMessage(""); }} onView={viewStack} /></Suspense></LoadBoundary>
        </div>},
        {id: "habits:rhythm", label: "Consistency by weekday", node: <HabitRhythmSection habits={store.data} today={store.today} />},
      ], PHONE_ORDER)}/>
      {/* ADR-022 B49: the game card follows the page's own sections (not a layout item, so the pinned orders and the first headings keep their places). */}
      <div className="habit-progress-slot page-game-slot"><ProgressSlot page="habits" /></div>
      <p className="fine habit-semantics">Streaks count scheduled successful days or completed target periods. Non-scheduled and paused dates do not count against consistency. Skips and failures remain distinct. Saved timers retain timestamps across reloads and require review before logging; browser-closed reminders are not promised.</p>
    </>}
    <section className="habit-journal-settings" aria-label="Habit journal settings">
      <p className="fine habit-privacy">Private Habit records · No wallet required · Days use {store.data.timeZone??(journalZone?`${journalZone}, your time zone`:"this device’s timezone until you save your time zone in Settings")}.</p>
      {store.loaded&&!store.error&&<details className="panel habit-timezone"><summary>Habit journal timezone</summary><form onSubmit={async e=>{e.preventDefault();const zone=String(new FormData(e.currentTarget).get('timezone'));try{await store.update(data=>saveHabitTimezone(data,zone));setZoneMessage('Habit timezone saved. Existing date-only entries and saved timer timestamps remain unchanged.');}catch{setZoneMessage('Choose a valid IANA timezone, such as Europe/Brussels.');}}}><label className="field">Habit timezone<input name="timezone" required maxLength={100} defaultValue={store.data.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone}/></label><button className="secondary" type="submit">Save Habit timezone</button><p className="fine">This journal setting travels with your private data. Old dates stay as recorded. A timer started under another timezone requires explicit review.</p>{zoneMessage&&<p role="status">{zoneMessage}</p>}</form></details>}
    </section>
  </div></LayoutPage></HabitExtrasContext.Provider></HealthLinkContext.Provider>;
}
