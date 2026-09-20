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
export function ActivityFeed({ limit = 6, category = "ALL", includeGoals = true, onMore }: { limit?: number; category?: string; includeGoals?: boolean; onMore?: () => void }) {
  const platform=usePlatform();
  const goals = useGoals(), habits = useHabits(), health = useHealth();
  const financial=includeGoals?platform.data.goals.flatMap(g=>goalTimeline(platform.data,g.id).filter(e=>!['valuation','observation'].includes(e.kind)).map(e=>({id:e.id,category:'GOAL',title:e.label,detail:g.name,at:e.at,href:`/app/goals/tracked/${g.id}`,source:e.provenance==='REWARD_INCOME'?'Recorded income':e.provenance==='MANUAL_ATTRIBUTION'?'Explicit manual attribution':'Private Goal history'}))):[];
  const allEntries = [
    ...financial,
    ...(includeGoals && goals.mode === "local" ? goals.activity.map((event, index) => ({ id: `goal-${event.timestamp}-${index}`, category: "GOAL", title: event.action, detail: goals.metadata?.goals[event.goalId]?.name ?? `Goal #${event.goalId}`, at: event.timestamp, href: `/app/goals/${event.goalId}` })) : []),
    ...getHabitActivities(habits.data), ...getHealthActivities(health.data),
  ].filter(event => category === "ALL" || event.category === category).sort((a, b) => b.at.localeCompare(a.at));
  const entries = allEntries.slice(0, limit);
  return <div className="unified-activity">
    {(habits.error || health.error) && <p className="fine">Some private history needs attention in Settings; stored data has been preserved.</p>}
    {entries.length ? <ol>{entries.map(event => <li key={`${event.category}-${event.id}`}>
      <span className={`timeline-icon timeline-${event.category.toLowerCase()}`}><AppIcon name={event.category === "GOAL" ? "plus" : event.category === "HABIT" ? "habits" : "health"}/></span>
      <div><Link href={event.href}>{event.title}</Link><p>{event.detail}</p><small>{'source' in event ? String(event.source) : event.category === "GOAL" ? "Local simulation · confirmed ledger" : "Private · this browser"}</small></div>
      <time dateTime={event.at}>{new Date(event.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
    </li>)}</ol> : <div className="timeline-empty"><AppIcon name="activity" size={28}/><p>Your next step belongs here.</p><small>Goal actions, habit check-ins and health logs will build your story.</small></div>}
    {onMore && allEntries.length > limit && <button className="quiet" onClick={onMore}>Show more activity</button>}
  </div>;
}
