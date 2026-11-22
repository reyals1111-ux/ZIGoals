import {finished} from './engine';
import {availableWith} from './equipment';
import {howToOf} from './howto';
import {EXERCISES, type LibraryExercise} from './library';
import type {Workouts} from './schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #241, Fitbod's replace an exercise): similar exercises for one in a running or
 * planned workout — built-in exercises that record the same thing (so the sets typed so far still fit) and work the same
 * main muscle (lib/workouts/howto.ts), that the chosen place's equipment allows (lib/workouts/equipment.ts), and that are
 * not already in the workout. Ranked by how many main muscles they share, then helping muscles, then the ones in the
 * person's own log first. Replacing keeps the sets as typed (and their ticks), the note and the rest time. Pure.
 */
export type Alternative = LibraryExercise & {shared: string[]; done: boolean};
/** `sameMeasure`: only exercises that record the same thing (a running workout keeps the sets typed); off for a plan. */
export function alternatives(of: Pick<LibraryExercise, 'id' | 'measure'>, w: Workouts, have: readonly string[] | null, exclude: readonly string[] = [], limit = 6, sameMeasure = true): Alternative[] {
  const own = howToOf(of.id);
  if (!own) return [];
  const main = new Set(own.primary), helps = new Set(own.secondary), logged = new Set(finished(w).flatMap(x => x.exercises.map(e => e.exerciseId)));
  return EXERCISES.filter(e => e.id !== of.id && !exclude.includes(e.id) && (!sameMeasure || e.measure === of.measure) && e.measure !== 'distance-time' && availableWith(e.id, have))
    .map(e => { const h = howToOf(e.id); return {e, h, shared: h ? h.primary.filter(m => main.has(m)) : []}; })
    .filter(x => x.shared.length > 0)
    .map(({e, h, shared}) => ({...e, shared, done: logged.has(e.id), score: shared.length * 10 + (h ? h.secondary.filter(m => helps.has(m) || main.has(m)).length + h.primary.filter(m => helps.has(m)).length : 0) + (logged.has(e.id) ? 0.5 : 0)}))
    .sort((a, b) => b.score - a.score || EXERCISES.findIndex(e => e.id === a.id) - EXERCISES.findIndex(e => e.id === b.id))
    .slice(0, limit).map(({score: _s, ...rest}) => { void _s; return rest; });
}
