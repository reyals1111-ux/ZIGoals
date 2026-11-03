import {daysBetween, waterAmount, whenWords} from './widgets/words';

/**
 * Session AK P3 (NOVA_DESIGN_REVIEW.md ND-3): the line under NOVA's greeting, built on this device from the person's own
 * day: at most three facts, in this order — the next item, habits left, water to go, and the next bill only when it is due
 * within three days. Facts only: a value that could not be read (null) is left out, never said as zero, and the "open
 * day" sentence is said only when the day really was read and holds nothing. Pure; the stage renders it (day-line.tsx).
 */
export type DayFacts = {
  /** The next item of today's orbit (its label), '' when the orbit was read and nothing is next, null when unread. */
  next: string | null;
  /** How many things today's orbit holds in all (done or not); null when unread. */
  planned: number | null;
  /** Habits still due today; null when the habits could not be read. */
  habitsLeft: number | null;
  /** Water still to drink today in mL; null with no target or when unread. */
  waterToGoMl: number | null;
  waterUnit: 'ml' | 'fl-oz-us';
  /** The next bill (title and its due day), null when none or unread. */
  bill: {title: string; due: string} | null;
  /** Today, YYYY-MM-DD. */
  today: string;
};
export const DAY_LINE_MAX = 3;
export const OPEN_DAY = 'Your day is open. Start with one habit.';
export const DAY_DONE = 'Everything planned for today is done.';
const BILL_DAYS = 3;
const clip = (text: string, max = 48) => { const t = text.replace(/\s+/g, ' ').trim(); return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t; };

/** The facts, in order, each a short phrase (never more than three). */
export function dayFacts(f: DayFacts): string[] {
  const out: string[] = [];
  if (f.next) out.push(`${clip(f.next)} next`);
  if (typeof f.habitsLeft === 'number' && Number.isFinite(f.habitsLeft) && f.habitsLeft > 0) out.push(`${Math.round(f.habitsLeft)} ${f.habitsLeft === 1 ? 'habit' : 'habits'} left`);
  if (typeof f.waterToGoMl === 'number' && Number.isFinite(f.waterToGoMl) && f.waterToGoMl > 0) { const amount = waterAmount(f.waterToGoMl, f.waterUnit); if (amount) out.push(`${amount} of water to go`); }
  if (f.bill && /^\d{4}-\d{2}-\d{2}$/.test(f.bill.due) && /^\d{4}-\d{2}-\d{2}$/.test(f.today)) {
    const days = daysBetween(f.today, f.bill.due);
    if (days >= 0 && days <= BILL_DAYS) out.push(`${clip(f.bill.title, 32)} due ${whenWords(days)}`);
  }
  return out.slice(0, DAY_LINE_MAX);
}
/**
 * The whole line: the facts joined with " · "; with none, when the orbit and the habits were both read and nothing is
 * left, either "everything planned is done" (the orbit held something) or the open-day sentence (it held nothing); null
 * while the day is not read yet (nothing is shown rather than a guess).
 */
export function dayLine(f: DayFacts): string | null {
  const facts = dayFacts(f);
  if (facts.length) return facts.join(' · ');
  if (f.next !== '' || f.habitsLeft !== 0 || typeof f.planned !== 'number') return null;
  return f.planned > 0 ? DAY_DONE : OPEN_DAY;
}
