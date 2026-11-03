import {habitDay, type HabitData} from '../habits';
import type {HealthData} from '../health';
import type {Workouts} from '../workouts/schema';
import type {MoneyLog} from '../money-log/schema';
import type {Platform} from '../positions';
import {localDate} from '../local-date';
import {habitHref} from './links';

/**
 * Session AK (B2): the "This day" strip of a daily note — what the person's own records hold for that day, as links to
 * where each thing lives, never copied into the note. Habits done (or partly done, or skipped as a rest day), meals,
 * water, weight and activity logged in Health, workouts finished, money entries (counts only, never amounts: Hide
 * amounts would not reach a note), contributions to goals, and journal entries. Pure. A source that could not be read is
 * named in `unread` ("unknown is not zero"), never shown as nothing; a source read with nothing that day is just absent.
 */
export type DayPillar = 'habits' | 'health' | 'wealth' | 'goals' | 'journal';
export type DayItem = {id: string; pillar: DayPillar; title: string; detail?: string; href: string};
export type DaySources = {
  day: string; today: string;
  /** null: not read (or could not be); undefined: not asked for. */
  habits?: HabitData | null; health?: HealthData | null; workouts?: Workouts | null; money?: MoneyLog | null; platform?: Platform | null;
  journal?: {entries: readonly {id: string; date: string}[]} | null;
  /** For a contribution's local day (instants are stored); defaults to this device's clock. */
  dayOf?: (instant: string) => string;
};
export const PILLAR_LABEL: Record<DayPillar, string> = {habits: 'Habits', health: 'Health', wealth: 'Money', goals: 'Goals', journal: 'Journal'};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const STATUS_WORD: Partial<Record<string, string>> = {complete: 'Done', partial: 'Partly done', skipped: 'Rest day', 'planned-skip': 'Planned rest day'};

export function thisDay(src: DaySources): {items: DayItem[]; unread: DayPillar[]} {
  const {day} = src, items: DayItem[] = [], unread: DayPillar[] = [];
  const dayOf = src.dayOf ?? ((at: string) => localDate(new Date(at)));
  const read = (pillar: DayPillar, value: unknown, fn: () => void) => { if (value === undefined) return; if (value === null) { if (!unread.includes(pillar)) unread.push(pillar); return; } try { fn(); } catch { if (!unread.includes(pillar)) unread.push(pillar); } };
  read('habits', src.habits, () => {
    for (const h of src.habits!.habits) {
      if (day < h.startDate) continue;
      let status: string; try { status = habitDay(h, day, src.today).status; } catch { continue; }
      const word = STATUS_WORD[status];
      if (word) items.push({id: `habit:${h.id}`, pillar: 'habits', title: h.title, detail: word, href: habitHref(h.id)});
    }
  });
  read('health', src.health, () => {
    const h = src.health!, href = `/app/health?date=${day}`;
    const meals = h.diary.filter(e => e.date === day).length;
    if (meals) items.push({id: 'health:food', pillar: 'health', title: 'Food diary', detail: `${plural(meals, 'item')} logged`, href});
    const water = (h.daily?.water ?? []).filter(w => w.date === day).length;
    if (water) items.push({id: 'health:water', pillar: 'health', title: 'Water', detail: `${plural(water, 'drink')} logged`, href});
    if (h.weights.some(w => w.date === day)) items.push({id: 'health:weight', pillar: 'health', title: 'Weight', detail: 'Logged', href});
    const activity = h.activity.filter(a => a.date === day).length;
    if (activity) items.push({id: 'health:activity', pillar: 'health', title: 'Activity', detail: `${plural(activity, 'entry', 'entries')}`, href});
  });
  read('health', src.workouts, () => {
    for (const w of src.workouts!.workouts) if (w.date === day && w.endedAt) items.push({id: `workout:${w.id}`, pillar: 'health', title: w.name, detail: 'Workout', href: '/app/health?view=workouts'});
  });
  read('wealth', src.money, () => {
    const on = src.money!.entries.filter(e => e.date === day), spent = on.filter(e => e.kind === 'expense').length, got = on.length - spent;
    if (on.length) items.push({id: 'money:log', pillar: 'wealth', title: 'Money log', detail: [spent ? `${plural(spent, 'spending entry', 'spending entries')}` : '', got ? `${plural(got, 'income entry', 'income entries')}` : ''].filter(Boolean).join(' · '), href: '/app/wealth#spending'});
  });
  read('goals', src.platform, () => {
    const p = src.platform!, names = new Map(p.goals.map(g => [g.id, g.name])), seen = new Set<string>();
    for (const c of p.contributions) {
      if (c.direction !== 'IN' || seen.has(c.goalId)) continue;
      let on: string; try { on = dayOf(c.occurredAt); } catch { continue; }
      if (on !== day || !names.has(c.goalId)) continue;
      seen.add(c.goalId);
      items.push({id: `goal:${c.goalId}`, pillar: 'goals', title: names.get(c.goalId)!, detail: 'Contribution', href: `/app/goals/tracked/${encodeURIComponent(c.goalId)}`});
    }
  });
  read('journal', src.journal, () => {
    const n = src.journal!.entries.filter(e => e.date === day).length;
    if (n) items.push({id: 'journal', pillar: 'journal', title: 'Journal', detail: `${plural(n, 'entry', 'entries')}`, href: '/app/journal'});
  });
  return {items, unread};
}
