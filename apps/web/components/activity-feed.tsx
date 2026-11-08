"use client";
import {EmptyState} from './ui/empty-state';
import Link from "next/link";
import { useGoals } from "./goal-provider";
import { useHabits } from "./habits/use-habits";
import { useHealth } from "./health/use-health";
import { getHabitActivities } from "../lib/habits";
import { getHealthActivities } from "../lib/health";
import {usePlatform} from "./platform/use-platform";
import {goalTimeline} from "../lib/goal-intelligence";
import { AppIcon } from "./app-icon";
import { activityPresentation, activityDay, activityDayHeading, activityTimeZone } from "../lib/life-intelligence";
import { dailyData, getWaterActivities } from "../lib/health-daily";
import { useShowcase } from "./showcase-controls";
import {formatUnits} from "@zigoals/chain-config";
import {formatExactNumber, formatMoney, formatQuantity, isMoneyCurrency} from "../lib/visual-format";
import {amountWithUnit} from "../lib/asset-unit";
import {formatGoalAmount} from "../lib/goals/goal-amount-text"; // CI13: not the goal summaries and Wealth
import {isUnitWord} from "../lib/goals/goal-units";
import "./activity-product.css";
import { activityTimeLabel } from "../lib/activity-time";
import { activityKeys } from "./activity-keys";
import { useZigiActions } from "./activity/use-zigi-actions";
import { useAverageGoals } from "./goals/use-average-goals";
import { useEffect, useState } from "react";
import { useDeviceRecord } from "./ai/use-device-record";
import { ACCOUNTS } from "../lib/accounts/schema";
import { PRICE_ALERTS } from "../lib/price-alerts/schema";
import { TASKS } from "../lib/tasks/schema";
import { TASK_ACTIVITY_PRESENTATION, getTaskActivities } from "../lib/tasks/activity";
// CI13 (weights): the tasks' day rule (lib/tasks/device.ts `deviceDay`) without loading the Tasks engine with it.
import { checklistZone, zonedDay } from "../lib/checklist/day";
import { isDeletedHabitRef } from "../lib/habit-delete";
import { countText, plural } from "../lib/plural";
import { removeHealthItem } from "../lib/health";
import { removeWater } from "../lib/health-daily";
import { removeWithUndo } from "./ui/remove-with-undo";
import { showStatus, showUndo } from "./ui/undo-toast";
import { entryOn, restoreHabitEntry, type HabitEntry } from "../lib/timeline/actions";
import { storageMessageOr } from "../lib/storage-error-copy";
// Session AL third pass (DV-172, DV-206; GAP-124/122/125): sleep nights, habit state changes and the period report.
import { getSleepActivities } from "../lib/health-sleep-activities";
import { habitLifecycleRows } from "../lib/habit-lifecycle";
import { getCounterActivities } from "../lib/health-counter-activities";
import { ActivityReport } from "./activity/activity-report";
import { useLocalToday } from "./use-local-today";
import {REMOVAL_UNDO_MS} from '../lib/goals/removal-undo'; // CI13: the constant alone
import {SHOWCASE_ROW_SOURCE, isShowcaseRow, showcaseRowIds} from "./activity-showcase";
import {showcaseDay} from "../lib/showcase-storage";
import {emptyFor} from "./activity/empty-for";
const deviceDay = (iso: string) => zonedDay(new Date(iso), checklistZone());
export function ActivityFeed({ limit = 6, category = "ALL", includeGoals = true, onMore, onCounts, report = false }: { limit?: number; category?: string; includeGoals?: boolean; onMore?: () => void; /** Session AH (SE5): how many entries each filter holds. */ onCounts?: (counts: Record<string, number>) => void; /** The Activity page's report card above the list (GAP-124). */ report?: boolean }) {
  const showcase = useShowcase();
  // CI1 (product-visual, React #418): the report's day is the server's in the hydrated HTML, the browser's right after mount.
  const today = useLocalToday();
  // Session AL fourth pass (PR-066, PR-099, N-170, D-227): which rows are the Showcase's own examples, from its records
  // (loaded only while the Showcase is on); a row the person added keeps its own source.
  const [seeded, setSeeded] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    if (!showcase) { setSeeded(null); return; }
    let live = true; const day = showcaseDay();
    if (day) void import('../lib/showcase-data').then(m => { if (live) setSeeded(showcaseRowIds(m.buildShowcase(day).records)); }, () => { /* rows keep their own source */ });
    return () => { live = false; };
  }, [showcase]);
  const platform=usePlatform();
  const averages = useAverageGoals();
  const goals = useGoals(), habits = useHabits(), health = useHealth(), zigi = useZigiActions(), accounts = useDeviceRecord(ACCOUNTS), priceAlerts = useDeviceRecord(PRICE_ALERTS), tasks = useDeviceRecord(TASKS);
  // Session AH (B-199, WE7): balances and debt payments entered in Wealth appear here too, under their own day.
  const midnight = (date: string) => { const d = new Date(`${date}T00:00:00`); return Number.isNaN(d.getTime()) ? `${date}T00:00:00.000Z` : d.toISOString(); };
  const accountEvents = accounts.loaded && !accounts.unreadable ? accounts.data.items.flatMap(a => [
    ...a.payments.map(p => ({id: `account-payment:${p.id}`, category: "WEALTH", title: `Payment on ${a.name}`, detail: formatMoney(formatUnits(p.value, p.decimals), a.currency), at: midnight(p.date), day: p.date, href: "/app/wealth#accounts-title", source: "Payment you entered"})),
    ...a.snapshots.map(s => ({id: `account-balance:${s.id}`, category: "WEALTH", title: `${a.name}: balance updated`, detail: formatMoney(formatUnits(s.value, s.decimals), a.currency), at: midnight(s.date), day: s.date, href: "/app/wealth#accounts-title", source: "Balance you entered"})),
  ]) : [];
  // Session AJ (item 15, D9): each price alert that fired, with what it said (kept on this device, the last 200).
  const alertEvents = priceAlerts.loaded && !priceAlerts.unreadable ? priceAlerts.data.fired.map(f => ({id: `price-alert:${f.alertId}:${f.at}`, category: "WEALTH", title: "Price alert reached", detail: f.text, at: f.at, href: "/app", source: "Your price alert (checked with prices already read)"})) : [];
  // Gate C design review (copy): an amount reads as money where it is money ("US$125.00", as Today writes it elsewhere, not
  // "125 USD"), and a custom asset by its own name ("1 Collectible camera", not "1 CUSTOM").
  // Session AL (DV-054a, D-195, D-156, DV-014): money and a goal's own unit through the goal formatter (a legacy 23-digit amount
  // reads short; "3 books", not "3 BOOKS"); money leaving a goal (a withdrawal or a correction) carries its minus sign.
  const amountOf=(e:{id:string;quantity?:string;asset?:string;decimals?:number},decimals:number)=>{if(!e.quantity)return '';const d=e.decimals??decimals;const record=platform.data.contributions.find(c=>`contribution:${c.id}`===e.id),sign=record?.direction==='OUT'?'−':'';if(e.asset&&(isMoneyCurrency(e.asset)||isUnitWord(e.asset)))return sign+formatGoalAmount(formatUnits(e.quantity,d),e.asset);return sign+amountWithUnit(platform.data,formatQuantity(formatUnits(e.quantity,d)),e.asset??'',record?.positionId);};
  const financial=includeGoals?platform.data.goals.flatMap(g=>goalTimeline(platform.data,g.id).filter(e=>!['valuation','observation'].includes(e.kind)).map(e=>({id:e.id,category:'GOAL',title:e.label,detail:[g.name,g.type==='PROJECT'?(e.quantity?countText(Number(e.quantity),'milestone'):''):amountOf(e,g.decimals)].filter(Boolean).join(' · '),at:e.at,href:`/app/goals/tracked/${g.id}`,source:/* Session AL (DV-046c, P-DV-75) */e.provenance==='REWARD_INCOME'?'Income you recorded':e.provenance==='MANUAL_ATTRIBUTION'?'Added by you':'Your goal’s history'}))):[];
  // Session AL (DV-054c, DV-047c, P-DV-73): average goals are goals too: started, each day logged by hand, finished.
  const averageEvents = includeGoals && averages.loaded && !averages.unreadable ? averages.data.goals.flatMap(g => {
    const href = `/app/goals/average/${encodeURIComponent(g.id)}`, unit = g.unit ? ` ${g.unit}` : '';
    return [
      {id: `average-created:${g.id}`, category: "GOAL", title: "Average goal started", detail: `${g.name} · ${g.direction === 'at-most' ? 'at most' : 'at least'} ${formatExactNumber(String(g.target))}${unit}, over ${g.windowDays} days`, at: g.createdAt, href, source: "Added by you"},
      ...g.entries.map(e => ({id: `average-day:${g.id}:${e.day}`, category: "GOAL", title: `Day logged · ${g.name}`, detail: `${formatExactNumber(String(e.value))}${unit}`, at: midnight(e.day), day: e.day, href, source: "Added by you"})),
      ...(g.status === 'completed' && g.completedAt ? [{id: `average-finished:${g.id}`, category: "GOAL", title: "Average goal finished", detail: g.name, at: g.completedAt, href, source: "Marked by you"}] : []),
    ];
  }) : [];
  // Session AL fourth pass (DV-036b): "Goal created" names the target it was created with (the first recorded reading
  // before any target change), not a later edit; when that is not known, it says the target changed since.
  const createdDetail = (goal: (typeof platform.data.goals)[number]) => {
    const money = (units: string) => formatGoalAmount(formatUnits(units, goal.decimals), goal.asset);
    const changedAt = (goal.lifecycle ?? []).find(e => e.kind === 'target_changed')?.at;
    if (!changedAt) return `${goal.name} · target ${money(goal.target)}`;
    const first = platform.data.goalHistory.find(h => h.goalId === goal.id && h.kind === 'valuation' && h.asset === goal.asset && h.decimals === goal.decimals && h.capturedAt < changedAt);
    return first && first.kind === 'valuation' ? `${goal.name} · target ${money(first.target)}` : `${goal.name} · target since changed, now ${money(goal.target)}`;
  };
  const base = [
    ...financial, ...averageEvents,
    ...(includeGoals ? platform.data.goals.map(goal => ({ id: `created:${goal.id}`, category: "GOAL", title: "Goal created", detail: goal.type === "PROJECT" ? `${goal.name} · ${plural(goal.milestones.length, "1 milestone", `${goal.milestones.length} milestones`)}` : createdDetail(goal), at: goal.createdAt, href: `/app/goals/tracked/${goal.id}`, source: "Added by you" })) : []),
    ...platform.data.assetEvents.map(e=>({id:e.id,category:"WEALTH",title:`${e.name} ${e.kind}`,detail:e.assetClass,assetType:(()=>{const ref=platform.data.positions.find(position=>position.id===e.positionId)?.marketRef;return ref?.kind==='rwa'?ref.assetType:undefined;})(),at:e.at,href:`/app/wealth/asset/${encodeURIComponent(e.positionId)}`,source:"Private asset record"})),
    ...(includeGoals && goals.mode === "local" ? goals.activity.map((event, index) => ({ id: `goal-${event.timestamp}-${index}`, category: "GOAL", title: event.action, detail: goals.metadata?.goals[event.goalId]?.name ?? `Goal #${event.goalId}`, at: event.timestamp, href: `/app/goals/${event.goalId}` })) : []),
    ...accountEvents, ...alertEvents,
    ...getHabitActivities(habits.data), ...getHealthActivities(health.data, (() => { try { return dailyData(health.data).preferences.weightUnit; } catch { return "kg" as const; } })()), ...getWaterActivities(health.data),
    // Session AL (DV-172, for L4 by lane L5): a task added and each time one was finished, under its day in the app's zone.
    ...(tasks.loaded && !tasks.unreadable ? getTaskActivities(tasks.data, deviceDay) : []),
    // Session AL third pass (DV-172, DV-206, P-DV-73): finished nights and naps (Health's own getter, lane L2); a habit archived,
    // paused, restored or deleted for good.
    // Habit rows come from Habits' own lib/habit-lifecycle.ts (lane L3), deleted-for-good shells included (named nowhere).
    ...getSleepActivities(health.data), ...habitLifecycleRows(habits.data.habits, habits.deletedShells),
    // Session AL sweep 3 (DV-047c): each quick-counter day ("Increase Push-ups") under Health.
    ...getCounterActivities(health.data),
  ];
  // Session V Part 7, "Actions by ZIGi": the entries made from ZIGi's cards, plus a line for each confirmed card whose
  // record has no entry of its own here (water, a recipe, a reminder…).
  const shownIds = new Set(base.map(event => event.id));
  // Gate B: a note that names a habit deleted for good is left out (the habit's name went with it).
  // Session AL (DV-115, DV-169, P-DV-74): a habit check-in or skip always has its own row while it exists, so one without
  // a row was removed since; it leaves "Actions by ZIGi" too (it stayed there, counted nowhere). Its line says how once.
  // Session AL fifth pass (LA-029, MO-065): a card confirmed in NOVA says NOVA (`by: 'nova'`); a line saved with Quick add
  // under ZIGi's or NOVA's answer (`via: 'quick-add'`) is noted under its record's own id, so it shows as that record's row
  // and never on its own (no row: it was undone or removed).
  const zigiOnly = zigi.actions.filter(a => !shownIds.has(a.activityId) && !isDeletedHabitRef(a.activityId, habits.deletedIds) && !/^(check-in|skip)$/.test(a.kind) && a.via !== "quick-add").map(a => { const how = a.auto ? "Added by ZIGi (auto-accept)" : a.by === "nova" ? "Confirmed from a NOVA card" : "Confirmed from a ZIGi card"; return {id: `zigi:${a.activityId}`, category: a.category, title: a.title, detail: "", at: a.at, href: a.href, source: how}; });
  // Session X-Local Part 5b after the merge: a record ZIGi added under auto-accept says so on its own event too (before the merge
  // the feed listed such records only as ZIGi's entries; X-Cloud's feed now shows the record itself, marked by ZIGi).
  const autoById = new Map(zigi.actions.filter(a => a.auto).map(a => [a.activityId, true] as const));
  const novaById = new Set(zigi.actions.filter(a => a.by === "nova").map(a => a.activityId));
  // Session AL (DV-046d, DV-169, P-DV-74): one selection for the list and for its chip's count.
  const select = (c: string) => c === "ZIGI" ? [...base.filter(event => zigi.ids.has(event.id)), ...zigiOnly] : base.filter(event => c === "ALL" || event.category === c);
  const allEntries = select(category).map(event => ({...event, dayKey: activityDay(event)})).sort((a, b) => b.dayKey.localeCompare(a.dayKey) || b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
  const entries = allEntries.slice(0, limit), keys = activityKeys(entries);
  // Session AI (SE5): a Health entry can be removed from the log itself, with the app's one Undo; the others keep the undo
  // where they were made (a habit day in its day editor, a goal's contribution on its goal).
  const healthKind = (id: string): "diary" | "weights" | "activity" | "water" | null => health.data.diary.some(e => e.id === id) ? "diary" : health.data.weights.some(w => w.id === id) ? "weights" : health.data.activity.some(a => a.id === id) ? "activity" : (() => { try { return dailyData(health.data).water.some(w => w.id === id) ? "water" as const : null; } catch { return null; } })();
  const remove = (id: string, title: string) => { const kind = healthKind(id); if (!kind) return; void removeWithUndo(health.update, latest => kind === "water" ? removeWater(latest, id) : removeHealthItem(latest, kind, id), `Removed: ${title}.`, `${title} is back.`).catch(() => undefined); };
  // Session AJ (item 18, SE5): a habit day can be removed from the log too, with the app's one Undo, through the habit
  // journal's own functions (as the Day Timeline's Undo); a goal's contribution is reversed on its goal (a recorded
  // reversal, never a deletion), so the log links there; ZIGi's own entries keep their Undo in the chat.
  const habitDay = (id: string) => { const m = /^habit:(.+):(\d{4}-\d{2}-\d{2})$/.exec(id); return m && habits.data.habits.some(h => h.id === m[1]) ? {habitId: m[1]!, date: m[2]!} : null; };
  const removeHabitDay = (id: string, title: string) => {
    const day = habitDay(id); if (!day) return;
    let previous: HabitEntry | undefined, captured = false;
    void Promise.resolve(habits.update(d => { if (!captured) { previous = entryOn(d, day.habitId, day.date); captured = true; } return restoreHabitEntry(d, day.habitId, day.date, undefined); }))
      .then(() => showUndo({timeoutMs: REMOVAL_UNDO_MS, message: `Removed: ${title}, that day.`, restore: () => habits.update(d => restoreHabitEntry(d, day.habitId, day.date, previous)), undone: `${title} is back for that day.`})) /* Session AL (A7): the one Undo */
      .catch(e => showStatus(storageMessageOr(e, 'This day could not be changed on this device.')));
  };
  const contributionGoal = (id: string) => { if (!id.startsWith("contribution:")) return null; const c = platform.data.contributions.find(x => `contribution:${x.id}` === id); return c && !c.reversesId && c.goalScope === "private" && !platform.data.contributions.some(r => r.reversesId === c.id) ? c.goalId : null; };
  const counts = JSON.stringify(Object.fromEntries(["ALL", "GOAL", "WEALTH", "HABIT", "HEALTH", ...(zigi.actions.length ? ["ZIGI"] : [])].map(c => [c, select(c).length])));
  useEffect(() => { onCounts?.(JSON.parse(counts) as Record<string, number>); }, [counts, onCounts]);
  return <div className="unified-activity">
    {report && <ActivityReport rows={base.map(event => ({category: event.category, dayKey: activityDay(event)}))} habits={habits.data.habits} today={today}/>}
    {(habits.error || health.error) && <p className="fine">Some private history needs attention in Settings; stored data has been preserved.</p>}
    {showcase && <p className="activity-history-source">Showcase example history: rows marked “Showcase example” are fictional; what you add here is yours.</p>}
    {entries.length ? <ol>{entries.map((event, index) => {
      const presentation = event.category === "TASK" ? TASK_ACTIVITY_PRESENTATION : activityPresentation(event);
      // Session AH (TR12): grouped under the record's own day, newest day first.
      const heading = activityDayHeading(event.dayKey);
      const startsDay = index === 0 || event.dayKey !== entries[index - 1]!.dayKey;
      return <li className="activity-event-group" key={keys[index]}>
        {startsDay && <h3 className="activity-date-heading">{heading}</h3>}
        <article className="activity-event" data-category={event.category} data-tone={presentation.tone}>
          <span className={`timeline-icon timeline-${presentation.tone}`}><AppIcon name={presentation.icon} size={28} /></span>
          <div className="activity-event-content"><span className="activity-category-label">{presentation.label === event.title ? null : presentation.label}{(zigi.ids.has(event.id) || event.id.startsWith("zigi:")) && <span className="activity-by-zigi">{autoById.get(event.id) ? " · Added by ZIGi (auto-accept)" : novaById.has(event.id.replace(/^zigi:/, "")) ? " · by NOVA" : " · by ZIGi"}</span>}</span><Link href={event.href}>{event.title}</Link>{event.detail && <p>{event.detail}</p>}<small>{/* Session AL (D-227, P-DVR-42): the Showcase is said once above the list, not on every row */showcase && seeded && isShowcaseRow(event.id, seeded) ? SHOWCASE_ROW_SOURCE : 'source' in event ? String(event.source) : event.category === "GOAL" ? "Local simulation · confirmed ledger" : "Private · this browser"}</small></div>
          {(() => { const time = activityTimeLabel(event.at, activityTimeZone()); return time ? <time dateTime={event.at}>{time}</time> : null; })()}
          {!showcase && event.category === "HABIT" && habitDay(event.id) && <button type="button" className="text-link activity-remove" aria-label={`Remove ${event.title}${event.detail ? `, ${event.detail}` : ""}`} onClick={() => removeHabitDay(event.id, event.title)}>Remove</button>}
          {!showcase && (() => { const goal = contributionGoal(event.id); return goal ? <Link className="text-link activity-remove" href={`/app/goals/tracked/${goal}#funding-wealth`} aria-label={`Reverse on its goal: ${event.title}`}>Reverse on its goal →</Link> : null; })()}
          {!showcase && event.category === "HEALTH" && healthKind(event.id) && <button type="button" className="text-link activity-remove" aria-label={`Remove ${event.title}${event.detail ? `, ${event.detail}` : ""}`} onClick={() => remove(event.id, event.title)}>Remove</button>}
        </article>
      </li>;
    })}</ol> : (e => <EmptyState className="timeline-empty" zigi="encouraging" title={e.title} action={e.href ? <Link className="text-link" href={e.href}>{e.link}</Link> : undefined}>{e.body}</EmptyState>)(emptyFor(category))}
    {onMore && allEntries.length > limit && <button className="quiet" onClick={onMore}>Show more activity</button>}
  </div>;
}
