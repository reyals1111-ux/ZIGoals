import {habitCalendarDay, habitDay, habitStats, type HabitData} from '../habits';
import type {HealthData} from '../health';
import {dailyData} from '../health-daily';
import {dueReminders} from '../reminders/due';
import type {Reminders} from '../reminders/schema';
import type {GoalSummary} from '../goal-summary';
import {planDay, shiftPlanDay} from '../plan-revisions';
import type {InsightCard} from '../insights/engine';
import type {ReviewState} from '../weekly-review/engine';
import type {Guide} from './schema';
import {EVENING_HOUR, NUDGES, STREAK_MILESTONES, type NudgeCopy, type NudgeKind} from './copy';
import {nudgeHidden} from './store';

/**
 * The Guide's engine (ADR-011, phase 1): a pure function over what Today already loaded. It returns at most one nudge,
 * the first in priority order whose condition holds and that "Not today" has not hidden. It never fetches, never
 * writes, and every number in its words is a value an engine computed from the person's own records.
 */
export type GuideContext = {
  guide: Guide; habits: HabitData; health: HealthData; reminders: Reminders; goals: readonly GoalSummary[]; insights: readonly Pick<InsightCard, 'id'>[];
  review: {isReviewDay: boolean; state: ReviewState}; now: Date; /** The habit journal's day; derived from `now` when absent. */ today?: string;
};
export type Nudge = {id: string; kind: NudgeKind; heading: string; body: string; action: {label: string; href: string} | null};
const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
function nudge(copy: NudgeCopy, id: string, values: Record<string, string> = {}): Nudge {
  return {id, kind: copy.kind, heading: fill(copy.heading, values), body: fill(copy.body, values), action: copy.action ? {label: copy.action.label, href: fill(copy.action.href, values)} : null};
}
const copyOf = (kind: NudgeKind) => NUDGES.find(n => n.kind === kind)!;
/** Every nudge whose condition holds today, in priority order, before dismissals. */
export function guideCandidates(input: GuideContext, today = input.today ?? habitCalendarDay(input.habits, input.now)): Nudge[] {
  const {habits, health, goals, review, now} = input, out: Nudge[] = [];
  const dueIds = new Set(dueReminders({reminders: input.reminders, habits, health, now}).map(r => r.id));
  const reviewReady = review.isReviewDay && (review.state === 'due' || review.state === 'draft');
  const days = habits.habits.map(habit => ({habit, day: habitDay(habit, today, today)}));
  if (reviewReady) out.push(nudge(copyOf('review-ready'), 'review-ready'));
  if (now.getHours() >= EVENING_HOUR) {
    const open = days.filter(({habit, day}) => day.scheduled && (day.status === 'due' || day.status === 'partial') && !dueIds.has(habit.id)).map(({habit}) => habit);
    if (open.length) out.push(nudge(copyOf('habits-open'), 'habits-open', {n: String(open.length), are: open.length === 1 ? 'is' : 'are', titles: open.slice(0, 2).map(h => h.title).join(', ')}));
  }
  for (const {habit} of days) {
    const stats = habitStats(habit, today);
    if (stats.streakUnit === 'days' && (STREAK_MILESTONES as readonly number[]).includes(stats.currentStreak)) { out.push(nudge(copyOf('streak-notice'), `streak-notice:${habit.id}:${stats.currentStreak}`, {title: habit.title, n: String(stats.currentStreak), habitId: habit.id})); break; }
  }
  const planToday = planDay(now.getTime()), planTomorrow = shiftPlanDay(planToday, 1);
  const goal = goals.find(g => g.status === 'active' && (g.nextContributionDate === planToday || g.nextContributionDate === planTomorrow));
  if (goal) out.push(nudge(copyOf('goal-next-date'), `goal-next-date:${goal.key}`, {goal: goal.name, when: goal.nextContributionDate === planToday ? 'today' : 'tomorrow', href: goal.href}));
  const card = input.insights[0];
  if (card) out.push(nudge(copyOf('insight-ready'), `insight-ready:${card.id}`));
  // A rest day presumes a plan: the quiet day needs at least one habit, so a brand-new account hears the first words instead.
  if (habits.habits.length && !days.some(({day}) => day.scheduled) && dueIds.size === 0 && !reviewReady) out.push(nudge(copyOf('quiet-day'), 'quiet-day'));
  const empty = habits.habits.length === 0 && goals.length === 0 && health.diary.length === 0 && health.weights.length === 0 && health.activity.length === 0 && dailyData(health).water.length === 0;
  if (input.guide.enabledOn === today && empty) out.push(nudge(copyOf('first-time'), 'first-time'));
  return out;
}
/** At most one nudge for today, or null when the Guide is off, nothing holds, or everything that holds was hidden. */
export function guideNudge(input: GuideContext): Nudge | null {
  if (!input.guide.enabled) return null;
  const today = input.today ?? habitCalendarDay(input.habits, input.now);
  return guideCandidates(input, today).find(candidate => !nudgeHidden(input.guide, candidate.id, today)) ?? null;
}
