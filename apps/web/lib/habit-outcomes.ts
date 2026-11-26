import {addLocalDays, localDate} from './local-date';
import {aggregatePeriod, endAllows, habitDay, habitRuleOn, rawAggregateOutcomes, type Habit} from './habits';

// Session AW Part 2 (speed, attempt 2): out of lib/habits.ts, which every page loads (components/push/push-sync.tsx), so
// only the year report that reads it (lib/life-review/year.ts) carries it.
/**
 * Session AW (X4, LEDGER #446; Strides' year report): the scheduled outcomes habitStats counts — a day, or a week, month
 * or year for a habit counted per period — whose start falls from `from` to `to`, oldest first. Derived; nothing stored.
 */
export function habitOutcomesBetween(habit: Habit, from: string, to: string, today = localDate()): { start: string; unit: "days" | "weeks" | "months" | "years"; status: "complete" | "failed" | "skipped" | "open" }[] {
  const out: { start: string; unit: "days" | "weeks" | "months" | "years"; status: "complete" | "failed" | "skipped" | "open" }[] = [];
  const last = to < today ? to : today;
  for (let date = habit.startDate > from ? habit.startDate : from; date <= last; date = addLocalDays(date, 1)) {
    const rule = habitRuleOn(habit, date); if (!rule || rule.state !== "active" || !endAllows(habit, rule, date) || aggregatePeriod(rule)) continue;
    const day = habitDay(habit, date, today); if (!day.scheduled || day.status === "not-scheduled") continue;
    out.push({ start: date, unit: "days", status: day.status === "complete" ? "complete" : day.status === "failed" ? "failed" : day.status === "skipped" ? "skipped" : "open" });
  }
  for (const result of rawAggregateOutcomes(habit, today)) {
    if (result.start < from || result.start > to) continue;
    if (!result.scheduledDates.some((date) => { const rule = habitRuleOn(habit, date); return !!rule && endAllows(habit, rule, date); })) continue;
    out.push({ start: result.start, unit: result.unit, status: result.status });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}
