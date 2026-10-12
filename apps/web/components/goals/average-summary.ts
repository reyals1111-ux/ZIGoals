import type {GoalSummary} from '../../lib/goal-summary';
import type {HealthData} from '../../lib/health';
import type {AverageGoal} from '../../lib/average-goals/store';
import {averageProgress} from '../../lib/average-goals/progress';

/** An average goal as the board, the tree and a goal's sub-goals show it (G8): its share of the target, never an invented amount. */
export function averageSummary(g: AverageGoal, health: HealthData | undefined, today: string): GoalSummary {
  const p = averageProgress(g, health, today);
  return {key: `average:${g.id}`, id: g.id, href: `/app/goals/average/${g.id}`, name: g.name, type: 'AVERAGE', source: 'Kept on this device', status: g.status, scene: 'aurora', current: String(p.average ?? 0), currency: g.unit, progressPct: String((p.share ?? 0) * 100), ...(p.share === null ? {progressBound: 'unavailable' as const} : {}), fundingHealth: '', requiresReview: false, metadata: []} as GoalSummary;
}
