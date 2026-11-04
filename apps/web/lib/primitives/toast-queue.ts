/**
 * Session AL (3e): the rules of the app's one toast, kept pure so they can be tested without a page.
 * - No pile-up: at most TOAST_CAP toasts are shown, the newest last; a newer one pushes out the oldest. The cap is 1:
 *   the newest replaces (the Checklist's toast slot holds one 52 px line, and every page's toast is one sentence).
 * - The same words shown again without an Undo ("Saved.") replace their earlier copy instead of stacking.
 * - Time: 8 s unless the caller asks otherwise, never under 5 s (time to reach the Undo; WCAG 2.2.1 — the pointer or
 *   focus resting on a toast also stops its clock) and never over a minute.
 */
export const TOAST_CAP = 1;
export const TOAST_MS = 8_000, MIN_TOAST_MS = 5_000, MAX_TOAST_MS = 60_000;

type Queued = {id: number; message: string; undo?: unknown};

/** The toasts shown after `next` arrives: the earlier same-words status copy dropped, then the newest `cap` kept. */
export function enqueueToast<T extends Queued>(shown: readonly T[], next: T, cap: number = TOAST_CAP): T[] {
  const kept = shown.filter(t => t.id !== next.id && !(t.message === next.message && !t.undo && !next.undo));
  return [...kept, next].slice(-Math.max(1, Math.floor(cap)));
}

/** The toasts shown after one is dismissed: the one with `id`, or the newest when no id is given. */
export function dismissToast<T extends Queued>(shown: readonly T[], id?: number): T[] {
  if (!shown.length) return shown as T[];
  const target = id ?? shown.at(-1)!.id;
  return shown.some(t => t.id === target) ? shown.filter(t => t.id !== target) : shown as T[];
}

/** A toast's time on screen, within the bounds above. */
export function toastMs(requested?: number): number {
  if (requested === undefined || !Number.isFinite(requested)) return TOAST_MS;
  return Math.min(MAX_TOAST_MS, Math.max(MIN_TOAST_MS, Math.round(requested)));
}
