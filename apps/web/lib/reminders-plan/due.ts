import {PLAN_LABELS, quietHours, type PlanKind, type RemindersPlan} from './schema';
import {inQuietHours} from '../habits-extras/bell';

/**
 * Which plan reminders are due now, on this device: the time has passed today, the kind is on, it was not dismissed
 * today, and the quiet hours do not cover now (a reminder that falls in the quiet hours waits until they end). The weekly
 * review and the goal check-in take a weekday; a fast's end needs a running fast past its target.
 */
export type PlanDue = {id: string; kind: PlanKind; title: string; line: string; href: string};
export function planDue(plan: RemindersPlan, now: Date, today: string, context: {weekday: number; reviewWeekday: number; fastDone: boolean}): PlanDue[] {
  const q = quietHours(plan); if (inQuietHours(now, q.from, q.to)) return [];
  const minutes = now.getHours() * 60 + now.getMinutes();
  const out: PlanDue[] = [];
  for (const kind of Object.keys(plan.items ?? {}) as PlanKind[]) {
    const item = plan.items![kind]!; if (!item.on || plan.dismissed?.[kind] === today) continue;
    const [h, m] = (item.time ?? PLAN_LABELS[kind].defaultTime).split(':').map(Number); if (minutes < h! * 60 + m!) continue;
    if (kind === 'review' && (item.weekday ?? context.reviewWeekday) !== context.weekday) continue;
    if (kind === 'goal-checkin' && (item.weekday ?? 0) !== context.weekday) continue;
    if (kind === 'fasting-end' && !context.fastDone) continue;
    const line = kind === 'bedtime' ? 'Time to wind down.' : kind === 'review' ? 'Your weekly review is open.' : kind === 'fasting-end' ? 'Your fast has reached its target hours.' : 'A moment for your goals.';
    out.push({id: kind, kind, title: PLAN_LABELS[kind].title, line, href: kind === 'bedtime' ? '/app/health?view=sleep' : kind === 'review' ? '/app' : kind === 'fasting-end' ? '/app/health' : '/app/goals'});
  }
  return out;
}
