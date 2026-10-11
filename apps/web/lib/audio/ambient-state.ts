import type {AmbientSound} from '../music/schema';

/**
 * What the ambient player is doing (Session W Part 6), as a tiny store the shell can read without loading the player:
 * the Stop pill shows while a sound plays anywhere in ZIGoals. The player (lib/audio/ambient.ts) is its only writer.
 */
export type AmbientState = {playing: false} | {playing: true; sound: AmbientSound; endsAt?: number};
const SILENT: AmbientState = {playing: false};
let state: AmbientState = SILENT;
const listeners = new Set<() => void>();
export const ambientState = (): AmbientState => state;
/** The same object every time, as React asks of a server snapshot. */
export const serverAmbientState = (): AmbientState => SILENT;
export function setAmbientState(next: AmbientState): void { state = next; for (const listener of listeners) listener(); }
export function subscribeAmbient(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
