"use client";
import Link from "next/link";
import { useGoals } from "./goal-provider";
import { useHabits } from "./habits/use-habits";
import { useHealth } from "./health/use-health";
import { getHabitActivities } from "../lib/habits";
import { getHealthActivities } from "../lib/health";
import {usePlatform} from "./platform/use-platform";
import {goalTimeline} from "../lib/goal-intelligence";
import { AppIcon } from "./app-icon";
import { activityPresentation, activityDateHeading, activityTimeZone } from "../lib/life-intelligence";
import { getWaterActivities } from "../lib/health-daily";
import { useShowcase } from "./showcase-controls";
import {shownAmount} from "./platform/common";
import "./activity-product.css";
import { formatTime } from "../lib/visual-format";
import { activityKeys } from "./activity-keys";
import { useZigiActions } from "./activity/use-zigi-actions";
export function ActivityFeed({ limit = 6, category = "ALL", includeGoals = true, onMore }: { limit?: number; category?: string; includeGoals?: boolean; onMore?: () => void }) {
  const showcase = useShowcase();
  const platform=usePlatform();
  const goals = useGoals(), habits = useHabits(), health = useHealth(), zigi = useZigiActions();
  const financial=includeGoals?platform.data.goals.flatMap(g=>goalTimeline(platform.data,g.id).filter(e=>!['valuation','observation'].includes(e.kind)).map(e=>({id:e.id,category:'GOAL',title:e.label,detail:[g.name,e.quantity?`${shownAmount(e.quantity,e.decimals??g.decimals)} ${e.asset}`:''].filter(Boolean).join(' · '),at:e.at,href:`/app/goals/tracked/${g.id}`,source:e.provenance==='REWARD_INCOME'?'Recorded income':e.provenance==='MANUAL_ATTRIBUTION'?'Explicit manual attribution':'Private Goal history'}))):[];
  const base = [
    ...financial,
    ...(includeGoals ? platform.data.goals.map(goal => ({ id: `created:${goal.id}`, category: "GOAL", title: "Goal created", detail: goal.name, at: goal.createdAt, href: `/app/goals/tracked/${goal.id}`, source: "Saved Goal creation date" })) : []),
    ...platform.data.assetEvents.map(e=>({id:e.id,category:"WEALTH",title:`${e.name} ${e.kind}`,detail:e.assetClass,assetType:(()=>{const ref=platform.data.positions.find(position=>position.id===e.positionId)?.marketRef;return ref?.kind==='rwa'?ref.assetType:undefined;})(),at:e.at,href:`/app/wealth/asset/${encodeURIComponent(e.positionId)}`,source:"Private asset record"})),
    ...(includeGoals && goals.mode === "local" ? goals.activity.map((event, index) => ({ id: `goal-${event.timestamp}-${index}`, category: "GOAL", title: event.action, detail: goals.metadata?.goals[event.goalId]?.name ?? `Goal #${event.goalId}`, at: event.timestamp, href: `/app/goals/${event.goalId}` })) : []),
    ...getHabitActivities(habits.data), ...getHealthActivities(health.data), ...getWaterActivities(health.data),
  ];
  // Session V Part 7, "Actions by ZIGi": the entries made from ZIGi's cards, plus a line for each confirmed card whose
  // record has no entry of its own here (water, a recipe, a reminder…).
  const shownIds = new Set(base.map(event => event.id));
  const zigiOnly = zigi.actions.filter(a => !shownIds.has(a.activityId)).map(a => ({id: `zigi:${a.activityId}`, category: a.category, title: a.title, detail: "Confirmed from a ZIGi card", at: a.at, href: a.href, source: "Confirmed from a ZIGi card"}));
  const allEntries = (category === "ZIGI" ? [...base.filter(event => zigi.ids.has(event.id)), ...zigiOnly] : base.filter(event => category === "ALL" || event.category === category)).sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
  const entries = allEntries.slice(0, limit), keys = activityKeys(entries);
  return <div className="unified-activity">
    {(habits.error || health.error) && <p className="fine">Some private history needs attention in Settings; stored data has been preserved.</p>}
    {showcase && <p className="activity-history-source">Showcase example history · fictional records</p>}
    {entries.length ? <ol>{entries.map((event, index) => {
      const presentation = activityPresentation(event);
      const heading = activityDateHeading(event.at);
      const startsDay = index === 0 || heading !== activityDateHeading(entries[index - 1]!.at);
      return <li className="activity-event-group" key={keys[index]}>
        {startsDay && <h3 className="activity-date-heading">{heading}</h3>}
        <article className="activity-event" data-category={event.category} data-tone={presentation.tone}>
          <span className={`timeline-icon timeline-${presentation.tone}`}><AppIcon name={presentation.icon} size={28} /></span>
          <div className="activity-event-content"><span className="activity-category-label">{presentation.label}{(zigi.ids.has(event.id) || event.id.startsWith("zigi:")) && <span className="activity-by-zigi"> · by ZIGi</span>}</span><Link href={event.href}>{event.title}</Link><p>{event.detail}</p><small>{showcase ? "Showcase example" : 'source' in event ? String(event.source) : event.category === "GOAL" ? "Local simulation · confirmed ledger" : "Private · this browser"}</small></div>
          <time dateTime={event.at}>{formatTime(event.at, { hour: "2-digit", minute: "2-digit", timeZone: activityTimeZone() })}</time>
        </article>
      </li>;
    })}</ol> : <div className="timeline-empty"><AppIcon name="activity" size={28}/><p>Your next step belongs here.</p><small>Goal actions, habit check-ins and health logs will build your story.</small></div>}
    {onMore && allEntries.length > limit && <button className="quiet" onClick={onMore}>Show more activity</button>}
  </div>;
}
