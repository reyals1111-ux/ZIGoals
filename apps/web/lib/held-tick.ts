/**
 * Session AR (6a): a box shows the person's tick at once. A checkbox controlled by a stored value whose save is async (it
 * waits for the cross-tab lock, a later task) is put back by React at the end of the click until the store answers: the
 * person saw (and a screen reader said) the old state for a moment. The person's tick is held, per key, until that save
 * settles; then the stored value shows again (ticked when saved; back, with the save's own error, when refused).
 * Session AQ's fix for a milestone's box (commit 8b325b3f), shared; the hook is components/use-held-tick.ts.
 */
export type HeldTicks = Readonly<Record<string, boolean>>;
export const holdTick = (held: HeldTicks, key: string, on: boolean): HeldTicks => ({...held, [key]: on});
/** Lets go of `key` only while it still holds `on`: a later tick of the same box (its save still waiting) keeps its own. */
export const releaseTick = (held: HeldTicks, key: string, on: boolean): HeldTicks => {
  if (held[key] !== on) return held;
  const rest = {...held}; delete rest[key]; return rest;
};
/** Holds `on` for `key`, starts the save in this same task, and lets go once it settles (saved, refused or thrown). */
export function heldSave<T>(set: (change: (held: HeldTicks) => HeldTicks) => void, key: string, on: boolean, save: () => Promise<T> | T): Promise<T> {
  set(held => holdTick(held, key, on));
  let saving: Promise<T>;
  try { saving = Promise.resolve(save()); } catch (error) { saving = Promise.reject(error); }
  return saving.finally(() => set(held => releaseTick(held, key, on)));
}
