/**
 * Session AO (LS-H29): the duplicate-name check and its sentence, with no imports, so Checklist quick add (on every page)
 * can use them without loading the habits library (route weights). lib/habits.ts re-exports both.
 */
type Named = {id: string; title: string; rules: readonly {state: string}[]};
/** Session AO (LS-H29): an active habit already called `title` (outer spaces and letter case ignored), other than `exceptId`. */
export function activeHabitNamed<T extends Named>(habits: readonly T[], title: string, exceptId?: string): T | undefined {
  const name = title.trim().toLocaleLowerCase();
  return name ? habits.find(h => h.id !== exceptId && h.rules[h.rules.length - 1]?.state === "active" && h.title.trim().toLocaleLowerCase() === name) : undefined;
}
/** Session AO (LS-H29): the one sentence for a habit name already in use; saving stays allowed (a second habit is made). */
export const sameHabitNameNotice = (title: string) => `You already have a habit called “${title.trim()}”.`;
