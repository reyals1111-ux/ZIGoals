import type {Habit} from '../habits';
import type {HabitSection, TimeSection} from './sections';

/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-3): which section Today's "Up next" card shows. The clock's
 * section when it has habits, else the next section with something still due, else (everything due is done) the first
 * section that has habits today, so ticking the last open habit keeps the card and its done state in view instead of
 * removing it. Null only when no habit is scheduled today.
 */
export function pickTimeSection(sections: readonly HabitSection[], now: TimeSection): HabitSection | null {
  return sections.find(s => s.id === now && s.habits.length) ?? sections.find(s => s.due > s.done) ?? sections.find(s => s.habits.length && s.due > 0) ?? sections.find(s => s.habits.length) ?? null;
}
/** Every due habit in the section is done (the card says "All done for now"). */
export const sectionAllDone = (s: Pick<HabitSection, 'due' | 'done'>): boolean => s.due > 0 && s.done >= s.due;
/**
 * The first check-in this device holds is today's: across every habit, exactly one day carries a logged entry and it is
 * today. Read from the habits themselves (nothing new is stored), so the line shows on that first day only.
 */
export function firstStepToday(habits: readonly Pick<Habit, 'entries'>[], today: string): boolean {
  let logged = 0, onToday = false;
  for (const h of habits) for (const e of h.entries) {
    if (e.disposition !== 'logged' || !(e.count > 0)) continue;
    logged++; if (logged > 1) return false;
    onToday = e.date === today;
  }
  return logged === 1 && onToday;
}
