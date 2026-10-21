import {habitDay, type HabitData} from '../habits';
import type {HealthData} from '../health';
import {dailyData} from '../health-daily';
import type {Platform} from '../positions';
import {addLocalDays} from '../local-date';

/**
 * The days a story is made of (Session AF, L5b; P9.3, ADR-028 H78): a "logged day" is a day with anything the person
 * recorded — a habit check-in, a Health log (water, a meal, a walk, a weight, a night, a meditation), a contribution to a
 * goal, a goal step. A story needs at least three of them in its window; below that it is one honest card. Kept apart
 * from the Life review's engine so Today's Stories door can count days without loading it.
 */
export const STORY_MIN_DAYS = 3;
export type StoryPillar = 'habits' | 'health' | 'goals' | 'wealth';
export type HealthKind = 'water' | 'meals' | 'activity' | 'weight' | 'sleep' | 'meditation';
export type DayFacts = {habitsDone: number; health: Set<HealthKind>; contributions: number; goalSteps: number};
export type StoryRecords = {habits: HabitData; health: HealthData; platform: Platform; today: string};
const dayOf = (iso: string) => iso.slice(0, 10);

/** What each day in the window holds, by day. */
export function factsByDay({habits, health, platform, today}: StoryRecords, start: string, end: string): Map<string, DayFacts> {
  const map = new Map<string, DayFacts>(), inWindow = (d: string) => d >= start && d <= end && d <= today;
  const get = (d: string) => { let f = map.get(d); if (!f) { f = {habitsDone: 0, health: new Set(), contributions: 0, goalSteps: 0}; map.set(d, f); } return f; };
  for (const h of habits.habits) for (const e of h.entries) {
    if (!inWindow(e.date) || e.disposition !== 'logged' || e.count <= 0) continue;
    // Any check-in with something in it makes the day a logged day; a completed one also counts as a habit done.
    const facts = get(e.date), day = habitDay(h, e.date, today);
    if (day.scheduled && day.status === 'complete') facts.habitsDone++;
  }
  const health_ = (kind: HealthKind, d: string) => { if (inWindow(d)) get(d).health.add(kind); };
  for (const w of dailyData(health).water) health_('water', w.date);
  for (const e of health.diary) health_('meals', e.date);
  for (const a of health.activity) health_('activity', a.date);
  for (const w of health.weights) health_('weight', w.date);
  for (const n of health.sleep?.nights ?? []) if (n.end && n.kind === 'night') health_('sleep', dayOf(n.end));
  for (const s of health.meditation?.sessions ?? []) health_('meditation', dayOf(s.startedAt));
  for (const c of platform.contributions) { const d = dayOf(c.occurredAt); if (c.direction === 'IN' && !c.reversesId && inWindow(d)) get(d).contributions++; }
  for (const g of platform.goalHistory) { const d = dayOf(g.capturedAt); if ((g.kind === 'milestone' || g.kind === 'status') && inWindow(d)) get(d).goalSteps++; }
  return map;
}
/** The number of logged days in a window. */
export const loggedDays = (records: StoryRecords, start: string, end: string) => factsByDay(records, start, end).size;
/** The days each pillar was active on: habits (a check-in done), health (a log), goals (a step), wealth (a contribution). */
export function pillarDays(facts: Map<string, DayFacts>): Record<StoryPillar, number> {
  const out: Record<StoryPillar, number> = {habits: 0, health: 0, goals: 0, wealth: 0};
  for (const f of facts.values()) { if (f.habitsDone) out.habits++; if (f.health.size) out.health++; if (f.goalSteps) out.goals++; if (f.contributions) out.wealth++; }
  return out;
}
/** The day with the most done (habit check-ins, kinds of Health log, contributions); the latest wins a tie. */
export function bestDay(facts: Map<string, DayFacts>): {day: string; facts: DayFacts; score: number} | null {
  let best: {day: string; facts: DayFacts; score: number} | null = null;
  for (const [day, f] of facts) { const score = f.habitsDone + f.health.size + f.contributions + f.goalSteps; if (score > 0 && (!best || score > best.score || (score === best.score && day > best.day))) best = {day, facts: f, score}; }
  return best;
}
/** The last seven days (the week story's window), for Today's door. */
export const weekStart = (today: string) => addLocalDays(today, -6);
