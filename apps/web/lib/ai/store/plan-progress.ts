import {habitDay, latestHabitRule, type HabitData} from '../../habits';
import {addLocalDays} from '../../local-date';
import type {ZigiPlan} from './plans';

/**
 * Session AI (feature 8, linked goal plans): how a ZIGi plan is going, across the modules its steps landed in — each habit
 * the plan added (the last 7 days: scheduled days done, skips left out) and each goal it added (its progress, as Goals
 * shows it). Read on this device from the person's own records, matched by the name the step created; a step whose
 * record was renamed or removed says so instead of guessing. Nothing is stored.
 */
export type PlanProgressLine = {label: string; text: string; href: string | null};
/** Goals' progress is a number string ("45.00"); shown as a whole percent. */
const percent = (value: string) => { const n = Number(value.replace('%', '')); return Number.isFinite(n) ? `${Math.round(n)}%` : value; };
const HABIT = /^Create the habit "(.+)"$/, GOAL = /^Create the goal "(.+)"$/;
export function planProgress(plan: ZigiPlan, {habits, goals, today}: {habits: HabitData; goals: readonly {name: string; progressPct: string; href: string; status: string}[]; today: string}): PlanProgressLine[] {
  const out: PlanProgressLine[] = [];
  for (const item of plan.items) {
    if (item.outcome !== 'added') continue;
    const habitName = HABIT.exec(item.label)?.[1], goalName = GOAL.exec(item.label)?.[1];
    if (habitName) {
      const habit = habits.habits.find(h => h.title.trim().toLowerCase() === habitName.trim().toLowerCase() && latestHabitRule(h).state !== 'archived');
      if (!habit) { out.push({label: habitName, text: 'Not found under this name any more (renamed or removed).', href: null}); continue; }
      let scheduled = 0, done = 0;
      for (let i = 0; i < 7; i++) { const day = habitDay(habit, addLocalDays(today, -i), today); if (!day.scheduled || day.status === 'skipped') continue; scheduled++; if (day.status === 'complete') done++; }
      out.push({label: habit.title, text: scheduled ? `Last 7 days: ${done} of ${scheduled} scheduled ${scheduled === 1 ? 'day' : 'days'} done.` : 'Nothing scheduled in the last 7 days yet.', href: '/app/habits'});
    } else if (goalName) {
      const goal = goals.find(g => g.name.trim().toLowerCase() === goalName.trim().toLowerCase());
      out.push(goal ? {label: goal.name, text: goal.status === 'completed' ? 'Completed.' : `${percent(goal.progressPct)} of the target so far.`, href: goal.href} : {label: goalName, text: 'Not found under this name any more (renamed or removed).', href: null});
    }
  }
  return out;
}
