import {habitDay, type Habit} from '../habits';
import {TIME_SECTIONS, type TimeSection} from './schema';

/**
 * H1: the Habits page and Today's habit widget group habits by time of day (Morning, Afternoon, Evening, Anytime: the
 * rule's own `timeOfDay`, which every habit already carries). The section the clock is in opens first.
 */
export {TIME_SECTIONS, type TimeSection};
export const SECTION_LABELS: Record<TimeSection, string> = {morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Anytime'};
export const SECTION_SYMBOLS: Record<TimeSection, string> = {morning: '☀', afternoon: '◐', evening: '☾', anytime: '✦'};
/** Morning until noon, afternoon until 17:00, evening until the small hours; between 00:00 and 04:59 it is still the evening. */
export function currentSection(hour: number): TimeSection {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}
export type HabitSection = {id: TimeSection; label: string; habits: Habit[]; due: number; done: number};
/** The four sections in their fixed order, each with its habits and today's progress; empty sections stay in the list. */
export function groupByTimeOfDay(habits: readonly Habit[], today: string): HabitSection[] {
  return TIME_SECTIONS.map(id => {
    const mine = habits.filter(h => (h.timeOfDay ?? 'anytime') === id);
    let due = 0, done = 0;
    for (const h of mine) { const day = habitDay(h, today, today); if (day.scheduled) { due++; if (day.status === 'complete') done++; } }
    return {id, label: SECTION_LABELS[id], habits: mine, due, done};
  });
}
/** Which section opens by default: the clock's section when it has habits, else the first section that has due habits, else anytime. */
export function openSection(sections: readonly HabitSection[], hour: number): TimeSection {
  const now = currentSection(hour);
  if (sections.find(s => s.id === now)?.habits.length) return now;
  return sections.find(s => s.due > 0)?.id ?? sections.find(s => s.habits.length)?.id ?? 'anytime';
}

/** Today's widget shows at most this many due habits; the rest are one tap away on Habits. */
export const TODAY_FOCUS_CAP = 5;
/**
 * ADR-022 B49: Today lists the due habits of the clock's section first, then the following sections in day order (wrapping
 * past Anytime to Morning), up to `cap` habits; `hidden` counts the rest. Empty sections are left out. Pure.
 */
export function todayFocus(sections: readonly HabitSection[], hour: number, cap = TODAY_FOCUS_CAP): {sections: HabitSection[]; hidden: number} {
  const order: TimeSection[] = ['morning', 'afternoon', 'evening', 'anytime'], start = order.indexOf(currentSection(hour));
  const ordered = [...order.slice(start), ...order.slice(0, start)].map(id => sections.find(s => s.id === id)).filter((s): s is HabitSection => !!s && s.habits.length > 0);
  let left = cap, hidden = 0; const out: HabitSection[] = [];
  for (const s of ordered) {
    if (left <= 0) { hidden += s.habits.length; continue; }
    const habits = s.habits.slice(0, left); hidden += s.habits.length - habits.length; left -= habits.length;
    out.push({...s, habits});
  }
  return {sections: out, hidden};
}
