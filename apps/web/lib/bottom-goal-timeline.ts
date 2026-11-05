import type {GoalSummary} from './goal-summary';

/** Goals: active Goals with a saved target date, soonest first; how many have none. Its own module (CI13, weights) so the
 *  Goals page's timeline loads nothing else of lib/bottom-insights.ts, which re-exports it. */
export function goalTimeline(goals: readonly GoalSummary[], today: string) {
  const active = goals.filter(g => g.status === 'active');
  const dated = active.filter(g => g.targetDate).sort((a, b) => a.targetDate!.localeCompare(b.targetDate!) || a.name.localeCompare(b.name));
  return {dated: dated.map(g => ({key: g.key, name: g.name, href: g.href, targetDate: g.targetDate!, progressPct: g.progressPct, past: g.targetDate! < today})), undated: active.length - dated.length};
}
