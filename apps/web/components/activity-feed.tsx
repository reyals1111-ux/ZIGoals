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
import {formatMoney, formatQuantity, isMoneyCurrency} from "../lib/visual-format";
import {amountWithUnit} from "../lib/asset-unit";
import "./activity-product.css";
import { activityTimeLabel } from "../lib/activity-time";
import { activityKeys } from "./activity-keys";
import { useZigiActions } from "./activity/use-zigi-actions";
import { isDeletedHabitRef } from "../lib/habit-delete";
import { plural } from "../lib/plural";
export function ActivityFeed({ limit = 6, category = "ALL", includeGoals = true, onMore }: { limit?: number; category?: string; includeGoals?: boolean; onMore?: () => void }) {
  const showcase = useShowcase();
  const platform=usePlatform();
  const goals = useGoals(), habits = useHabits(), health = useHealth(), zigi = useZigiActions();
  // Gate C design review (copy): an amount reads as money where it is money ("US$125.00", as Today writes it elsewhere, not
  // "125 USD"), and a custom asset by its own name ("1 Collectible camera", not "1 CUSTOM").
  const amountOf=(e:{id:string;quantity?:string;asset?:string;decimals?:number},decimals:number)=>{if(!e.quantity)return '';const d=e.decimals??decimals;if(e.asset&&isMoneyCurrency(e.asset))return formatMoney(formatUnits(e.quantity,d),e.asset);return amountWithUnit(platform.data,formatQuantity(formatUnits(e.quantity,d)),e.asset??'',platform.data.contributions.find(c=>`contribution:${c.id}`===e.id)?.positionId);};
  const financial=includeGoals?platform.data.goals.flatMap(g=>goalTimeline(platform.data,g.id).filter(e=>!['valuation','observation'].includes(e.kind)).map(e=>({id:e.id,category:'GOAL',title:e.label,detail:[g.name,g.type==='PROJECT'?(e.quantity?plural(Number(e.quantity),'milestone'):''):amountOf(e,g.decimals)].filter(Boolean).join(' · '),at:e.at,href:`/app/goals/tracked/${g.id}`,source:e.provenance==='REWARD_INCOME'?'Recorded income':e.provenance==='MANUAL_ATTRIBUTION'?'Explicit manual attribution':'Private Goal history'}))):[];
  const base = [
    ...financial,
    ...(includeGoals ? platform.data.goals.map(goal => ({ id: `created:${goal.id}`, category: "GOAL", title: "Goal created", detail: goal.name, at: goal.createdAt, href: `/app/goals/tracked/${goal.id}`, source: "Saved Goal creation date" })) : []),
    ...platform.data.assetEvents.map(e=>({id:e.id,category:"WEALTH",title:`${e.name} ${e.kind}`,detail:e.assetClass,assetType:(()=>{const ref=platform.data.positions.find(position=>position.id===e.positionId)?.marketRef;return ref?.kind==='rwa'?ref.assetType:undefined;})(),at:e.at,href:`/app/wealth/asset/${encodeURIComponent(e.positionId)}`,source:"Private asset record"})),
    ...(includeGoals && goals.mode === "local" ? goals.activity.map((event, index) => ({ id: `goal-${event.timestamp}-${index}`, category: "GOAL", title: event.action, detail: goals.metadata?.goals[event.goalId]?.name ?? `Goal #${event.goalId}`, at: event.timestamp, href: `/app/goals/${event.goalId}` })) : []),
    ...getHabitActivities(habits.data), ...getHealthActivities(health.data, (() => { try { return dailyData(health.data).preferences.weightUnit; } catch { return "kg" as const; } })()), ...getWaterActivities(health.data),
  ];
  // Session V Part 7, "Actions by ZIGi": the entries made from ZIGi's cards, plus a line for each confirmed card whose
  // record has no entry of its own here (water, a recipe, a reminder…).
  const shownIds = new Set(base.map(event => event.id));
  // Gate B: a note that names a habit deleted for good is left out (the habit's name went with it).
  const zigiOnly = zigi.actions.filter(a => !shownIds.has(a.activityId) && !isDeletedHabitRef(a.activityId, habits.deletedIds)).map(a => { const how = a.auto ? "Added by ZIGi (auto-accept)" : "Confirmed from a ZIGi card"; return {id: `zigi:${a.activityId}`, category: a.category, title: a.title, detail: how, at: a.at, href: a.href, source: how}; });
  // Session X-Local Part 5b after the merge: a record ZIGi added under auto-accept says so on its own event too (before the merge
  // the feed listed such records only as ZIGi's entries; X-Cloud's feed now shows the record itself, marked by ZIGi).
  const autoById = new Map(zigi.actions.filter(a => a.auto).map(a => [a.activityId, true] as const));
  const allEntries = (category === "ZIGI" ? [...base.filter(event => zigi.ids.has(event.id)), ...zigiOnly] : base.filter(event => category === "ALL" || event.category === category)).map(event => ({...event, dayKey: activityDay(event)})).sort((a, b) => b.dayKey.localeCompare(a.dayKey) || b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
  const entries = allEntries.slice(0, limit), keys = activityKeys(entries);
  return <div className="unified-activity">
    {(habits.error || health.error) && <p className="fine">Some private history needs attention in Settings; stored data has been preserved.</p>}
    {showcase && <p className="activity-history-source">Showcase example history · fictional records</p>}
    {entries.length ? <ol>{entries.map((event, index) => {
      const presentation = activityPresentation(event);
      // Session AH (TR12): grouped under the record's own day, newest day first.
      const heading = activityDayHeading(event.dayKey);
      const startsDay = index === 0 || event.dayKey !== entries[index - 1]!.dayKey;
      return <li className="activity-event-group" key={keys[index]}>
        {startsDay && <h3 className="activity-date-heading">{heading}</h3>}
        <article className="activity-event" data-category={event.category} data-tone={presentation.tone}>
          <span className={`timeline-icon timeline-${presentation.tone}`}><AppIcon name={presentation.icon} size={28} /></span>
          <div className="activity-event-content"><span className="activity-category-label">{presentation.label === event.title ? null : presentation.label}{(zigi.ids.has(event.id) || event.id.startsWith("zigi:")) && <span className="activity-by-zigi">{autoById.get(event.id) ? " · Added by ZIGi (auto-accept)" : " · by ZIGi"}</span>}</span><Link href={event.href}>{event.title}</Link><p>{event.detail}</p><small>{showcase ? "Showcase example" : 'source' in event ? String(event.source) : event.category === "GOAL" ? "Local simulation · confirmed ledger" : "Private · this browser"}</small></div>
          {(() => { const time = activityTimeLabel(event.at, activityTimeZone()); return time ? <time dateTime={event.at}>{time}</time> : null; })()}
        </article>
      </li>;
    })}</ol> : <EmptyState className="timeline-empty" zigi="encouraging" title="Your next step belongs here.">Goal actions, habit check-ins and health logs will build your story.</EmptyState>}
    {onMore && allEntries.length > limit && <button className="quiet" onClick={onMore}>Show more activity</button>}
  </div>;
}
