/**
 * Session AL Part 14 (lane P14-B; AL_SCOPE D13, Studio-4's held gaze X020–X022): while ZIGi waits on the person, the gaze
 * clip holds instead of the resting one. Three waits, each reported by the part of the app that knows it:
 * - `composer`: ZIGi's chat box has the focus (the chat's composer) → X020, a look down at the chat box, while ZIGi listens;
 * - `cards`: proposal cards wait for Add or Dismiss (the cards' own list) → X022, a look at something on the page;
 * - `question`: ZIGi asked "which one do you mean?" and the choices wait (the chat's last answer) → X021, a look at you.
 * The gaze shows only while ZIGi rests (idle) or listens, never over a reply, a mood or a celebration, and only while
 * motion is allowed: reduced motion, the app's Motion Off and ZIGi's animation Off keep the still frame of the state, as
 * every clip does. The art is Studio-4's own (the ZIGi look is unchanged); with no gaze art landed nothing changes.
 * Pure in-page facts: nothing stored, nothing sent. Kept free of the manifest so the chat and the cards that report a
 * wait carry nothing more; the clip itself is picked in the alive chunk (manifest.ts `gazeOf`).
 */
export type GazeHold = 'composer' | 'cards' | 'question';
export type GazeSlot = 'chatInput' | 'viewer' | 'target';
const holds = new Map<string, GazeHold>();
const watchers = new Set<() => void>();
const notify = () => { for (const watch of watchers) watch(); };
/** An owner (a chat composer, a card list, a turn) says it waits on the person, or no longer does (null). */
export function holdGaze(owner: string, hold: GazeHold | null): void {
  if (hold ? holds.get(owner) === hold : !holds.has(owner)) return;
  if (hold) holds.set(owner, hold); else holds.delete(owner);
  notify();
}
export const heldGazes = (): ReadonlySet<GazeHold> => new Set(holds.values());
export function watchGaze(watch: () => void): () => void { watchers.add(watch); return () => { watchers.delete(watch); }; }
/** Tests only: forget every hold. */
export const clearGazeHolds = (): void => { if (holds.size) { holds.clear(); notify(); } };
/**
 * Which gaze shows for ZIGi's state and what waits: listening with the chat box focused looks at the box; resting with
 * cards to decide looks at them, with a question asked looks at the person. Cards come first: they are what the person
 * acts on next. Null: the state's own clip.
 */
export function gazeFor(state: string, held: ReadonlySet<GazeHold>, motion: boolean): GazeSlot | null {
  if (!motion) return null;
  if (state === 'listening') return held.has('composer') ? 'chatInput' : null;
  if (state !== 'idle') return null;
  return held.has('cards') ? 'target' : held.has('question') ? 'viewer' : null;
}
