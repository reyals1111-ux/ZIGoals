import type {MoneyEntry} from './schema';

/**
 * Session AV (owner follow-up 1, F-CATEGORY-SUGGEST; YNAB, Copilot): the category the person chose before for the same
 * payee or note — "Café Noël" was Dining the last times, so Dining is offered. From their own entries only (the last 20
 * of the same kind whose note matches, ignoring case, accents and numbers); the category used most among them, the
 * latest on a tie. Null when nothing matches. Nothing is chosen for them: the form offers it. Pure.
 * Session AV (fresh-agent check q2, rank 22; YNAB and Copilot fill the category as the payee is picked): the match is on
 * the payee part of a note (before " · ", so "Weekly shop · SHOWCASE DATA" is "Weekly shop"), keeps letters of every
 * script (\p{L}: "Кафе", "喫茶店"), and is offered from the first three letters: an exact payee first, else a payee that
 * starts with what is typed ("wee" → "Weekly shop"), or what is typed starting with a payee and a space ("Lunch with
 * Sam" → "Lunch"). A match that is not exact names the payee it came from (`payee`).
 */
export const noteKey = (note: string) => note.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^\p{L}\s]+/gu, ' ').replace(/\s+/g, ' ').trim();
/** The payee part of a note: before " · " (the Showcase label, a bank's extra detail). */
export const payeePart = (note: string) => note.split(' · ')[0]!.trim();
const MIN_LETTERS = 3;
export function pastCategory(entries: readonly MoneyEntry[], kind: MoneyEntry['kind'], note: string): {category: string; times: number; payee?: string} | null {
  const key = noteKey(payeePart(note));
  if ([...key.replace(/\s/g, '')].length < MIN_LETTERS) return null;
  const keyed = entries.filter(e => e.kind === kind && e.note).map(e => ({e, k: noteKey(payeePart(e.note!))})).filter(x => x.k);
  const exact = keyed.filter(x => x.k === key);
  const pool = exact.length ? exact : keyed.filter(x => x.k.startsWith(key) || key.startsWith(`${x.k} `));
  const same = pool.sort((a, b) => b.e.date.localeCompare(a.e.date) || b.e.createdAt.localeCompare(a.e.createdAt)).slice(0, 20);
  if (!same.length) return null;
  const count = new Map<string, number>();
  for (const {e} of same) count.set(e.category, (count.get(e.category) ?? 0) + 1);
  const best = [...count].sort((a, b) => b[1] - a[1] || same.findIndex(x => x.e.category === a[0]) - same.findIndex(x => x.e.category === b[0]))[0]!;
  const from = same.find(x => x.e.category === best[0])!;
  return {category: best[0], times: best[1], ...(exact.length ? {} : {payee: payeePart(from.e.note!).slice(0, 60)})};
}
