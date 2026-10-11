/**
 * Per-reply handles (ADR-012; Session V Part 2): the AI only ever sees a short name for one of the person's records —
 * h1 a habit, g2 a goal, f3 a food, r1 a recipe, c1 an exercise counter, m1 a saved meal — and the device keeps the map
 * back to the identifier. One instance serves one reply: the page context, the question's sources and every tool the
 * reply runs share it, so the same record keeps the same handle throughout and a handle the reply never gave resolves to
 * nothing.
 */
export type HandleKind = 'habit' | 'goal' | 'food' | 'recipe' | 'counter' | 'meal';
export type Handle = {handle: string; kind: HandleKind; id: string; label: string};
/**
 * Session Y Part 4 (SECURITY_REVIEW_Y F1): a reply's handles live in memory for the session that received it. Shown again
 * after a reload or from History, its cards resolve against this page's records with every handle key made unmatchable:
 * a record named by its exact title is still found, one named only as h2 is not (h2 may be another record now).
 */
export const STALE_HANDLE = '\u0000stale';
export const staleHandles = (handles: readonly Handle[]): Handle[] => handles.map(h => ({...h, handle: STALE_HANDLE}));
export const HANDLE_PREFIX: Record<HandleKind, string> = {habit: 'h', goal: 'g', food: 'f', recipe: 'r', counter: 'c', meal: 'm'};
export class Handles {
  readonly list: Handle[] = [];
  private counts: Record<HandleKind, number> = {habit: 0, goal: 0, food: 0, recipe: 0, counter: 0, meal: 0};
  constructor(seed: readonly Handle[] = []) {
    for (const h of seed) {
      this.list.push(h);
      const n = Number(h.handle.slice(HANDLE_PREFIX[h.kind].length));
      if (Number.isInteger(n) && n > this.counts[h.kind]) this.counts[h.kind] = n;
    }
  }
  /** The record's handle: the one it already has in this reply, else the next free one of its kind. */
  add(kind: HandleKind, id: string, label: string): string {
    const known = this.list.find(h => h.kind === kind && h.id === id);
    if (known) return known.handle;
    const handle = `${HANDLE_PREFIX[kind]}${++this.counts[kind]}`;
    this.list.push({handle, kind, id, label});
    return handle;
  }
  find(handle: string, kind?: HandleKind): Handle | null { return resolveHandle(this.list, handle, kind); }
}
/** The record behind a handle, or null when the AI used one that was never given (nothing is guessed). */
export function resolveHandle(handles: readonly Handle[], handle: string, kind?: HandleKind): Handle | null {
  const found = handles.find(h => h.handle === handle.trim().toLowerCase());
  return found && (!kind || found.kind === kind) ? found : null;
}
