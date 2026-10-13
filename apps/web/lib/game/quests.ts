import {habitDay, habitRuleOn, type HabitData} from '../habits';
import type {GameStores} from './xp';

/**
 * Daily quests: three a day, picked deterministically from the day and the pages the person shows, each provable from
 * the person's own records (a quest whose proof the app does not keep is never offered). Never a punishment: an unmet
 * quest simply rests at its count. Pages are AA-Cloud's "Your pages & buttons" ids ('habits', 'health', 'goals', …).
 */
export type QuestDef = {id: string; page: 'habits' | 'health' | 'goals' | 'wealth' | 'today'; title: string; target: number; unit: string; progress: (s: GameStores, today: string) => number};
const dueHabits = (h: HabitData, today: string) => h.habits.filter(x => habitRuleOn(x, today)?.state === 'active' && habitDay(x, today, today).scheduled);
const doneHabits = (h: HabitData, today: string) => dueHabits(h, today).filter(x => habitDay(x, today, today).status === 'complete');
export const QUESTS: readonly QuestDef[] = [
  {id: 'habits-two', page: 'habits', title: 'Complete two habits', target: 2, unit: 'habits', progress: (s, t) => Math.min(2, doneHabits(s.habits, t).length)},
  {id: 'habits-all', page: 'habits', title: 'Complete every habit due today', target: 1, unit: 'day', progress: (s, t) => { const due = dueHabits(s.habits, t); return due.length && doneHabits(s.habits, t).length === due.length ? 1 : 0; }},
  {id: 'habits-morning', page: 'habits', title: 'Finish your morning habits', target: 1, unit: 'morning', progress: (s, t) => { const m = dueHabits(s.habits, t).filter(x => x.timeOfDay === 'morning'); return m.length && m.every(x => habitDay(x, t, t).status === 'complete') ? 1 : 0; }},
  {id: 'habits-note', page: 'habits', title: 'Leave a note or mood on a check-in', target: 1, unit: 'note', progress: (s, t) => s.habits.habits.some(x => x.entries.some(e => e.date === t && (e.note || e.mood))) ? 1 : 0},
  {id: 'water-three', page: 'health', title: 'Log water three times', target: 3, unit: 'times', progress: (s, t) => Math.min(3, (s.health.daily?.water ?? []).filter(w => w.date === t).length)},
  {id: 'meal-log', page: 'health', title: 'Log a meal', target: 1, unit: 'meal', progress: (s, t) => s.health.diary.some(d => d.date === t) ? 1 : 0},
  {id: 'weight-log', page: 'health', title: 'Log your weight', target: 1, unit: 'reading', progress: (s, t) => s.health.weights.some(w => w.date === t) ? 1 : 0},
  {id: 'sleep-log', page: 'health', title: 'Log last night', target: 1, unit: 'night', progress: (s, t) => (s.health.sleep?.nights ?? []).some(n => n.end?.slice(0, 10) === t) ? 1 : 0},
  {id: 'meditate', page: 'health', title: 'Take a mindful minute', target: 1, unit: 'session', progress: (s, t) => (s.health.meditation?.sessions ?? []).some(x => x.startedAt.slice(0, 10) === t) ? 1 : 0},
  {id: 'move', page: 'health', title: 'Log some movement', target: 1, unit: 'entry', progress: (s, t) => s.health.activity.some(a => a.date === t) ? 1 : 0},
  {id: 'goal-step', page: 'goals', title: 'Take a step on a goal', target: 1, unit: 'step', progress: (s, t) => (s.platform?.goalHistory ?? []).some(g => g.capturedAt.slice(0, 10) === t && (g.kind === 'milestone' || g.kind === 'status')) || (s.platform?.contributions ?? []).some(c => c.occurredAt.slice(0, 10) === t && c.direction === 'IN') ? 1 : 0},
  {id: 'review', page: 'today', title: 'Complete your weekly review', target: 1, unit: 'review', progress: (s, t) => (s.weekly?.reviews ?? []).some(r => r.completedAt?.slice(0, 10) === t) ? 1 : 0},
];
/** A small deterministic hash so the same day always picks the same quests on every device. */
export function dayHash(day: string, salt = 0): number { let h = 2166136261 ^ salt; for (const ch of day) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export type Quest = QuestDef & {done: number; complete: boolean};
/** The day's three quests from the pages shown (every page when nothing is hidden), rotating by the day; a quest with nothing to prove today is skipped. */
export function dailyQuests(stores: GameStores, today: string, pages: readonly string[] = ['habits', 'health', 'goals', 'wealth', 'today'], count = 3): Quest[] {
  const pool = QUESTS.filter(q => pages.includes(q.page) && (q.page !== 'habits' || dueHabits(stores.habits, today).length > 0) && (q.id !== 'habits-morning' || dueHabits(stores.habits, today).some(x => x.timeOfDay === 'morning')));
  const picked: QuestDef[] = [], seen = new Set<string>();
  let i = 0;
  while (picked.length < Math.min(count, pool.length) && i < 50) { const q = pool[dayHash(today, i) % pool.length]!; i++; if (seen.has(q.id)) continue; seen.add(q.id); picked.push(q); }
  return picked.map(q => { const done = q.progress(stores, today); return {...q, done, complete: done >= q.target}; });
}
