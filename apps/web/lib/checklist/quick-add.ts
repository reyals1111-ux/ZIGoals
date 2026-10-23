import {visualTone} from '../../components/visual-tone';

/**
 * Session AG Polish 2 (ADR-031 K11; owner Part 5 and amendment 3): the Checklist quick add's two rules, pure.
 * - A chosen colour is the habit card's own tone, drawn from the habit's id (`visualTone`), so no field is added anywhere.
 * - Undo removes the habit only while it is exactly as quick add created it: never edited, never checked in, nothing added.
 */
export const QUICK_NAME_MAX = 80;
/** A habit id whose card tone is `tone` (0–4), or any id for automatic (null). Bounded: never loops for long. */
export function habitIdForTone(tone: number | null, make: () => string = () => crypto.randomUUID()): string {
  for (let i = 0; i < 400; i++) { const id = make(); if (tone === null || visualTone(id) === tone) return id; }
  return make();
}
/** Still exactly as quick add created it. */
export const untouchedHabit = (h: {createdAt: string; updatedAt: string; entries: readonly unknown[]; ruleRevisions?: readonly unknown[]; timerReceipts?: readonly unknown[]; healthLink?: unknown}) =>
  h.entries.length === 0 && h.updatedAt === h.createdAt && !h.ruleRevisions?.length && !h.timerReceipts?.length && !h.healthLink;
