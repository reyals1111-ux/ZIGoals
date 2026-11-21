import type {MoneyEntry} from './schema';

/**
 * Session AV (owner follow-up 1, F-CATEGORY-SUGGEST; YNAB, Copilot): the category the person chose before for the same
 * payee or note — "Café Noël" was Dining the last times, so Dining is offered. From their own entries only (the last 20
 * of the same kind whose note matches, ignoring case, accents and numbers); the category used most among them, the
 * latest on a tie. Null when nothing matches. Nothing is chosen for them: the form offers it. Pure.
 */
export const noteKey = (note: string) => note.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]+/g, ' ').replace(/\s+/g, ' ').trim();
export function pastCategory(entries: readonly MoneyEntry[], kind: MoneyEntry['kind'], note: string): {category: string; times: number} | null {
  const key = noteKey(note);
  if (key.length < 3) return null;
  const same = entries.filter(e => e.kind === kind && e.note && noteKey(e.note) === key).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
  if (!same.length) return null;
  const count = new Map<string, number>();
  for (const e of same) count.set(e.category, (count.get(e.category) ?? 0) + 1);
  const best = [...count].sort((a, b) => b[1] - a[1] || same.findIndex(e => e.category === a[0]) - same.findIndex(e => e.category === b[0]))[0]!;
  return {category: best[0], times: best[1]};
}
