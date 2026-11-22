import {workoutsSchema, type Workouts} from './schema';

/**
 * Session AV lane 2 (body; LEDGER #119, Hevy's three-level notes): the two notes beside the session note — a note pinned
 * to an exercise (shown every time it is done, and in the exercise library) and a routine's own note (shown when it is
 * started). Pure; each returns a parsed record or throws a sentence.
 */
export const PINNED_NOTE_MAX = 500;
export const pinnedNoteOf = (w: Workouts, exerciseId: string): string | null => w.pinnedNotes?.[exerciseId] ?? null;
/** Pins `note` to the exercise; an empty note removes the pin. */
export function setPinnedNote(w: Workouts, exerciseId: string, note: string): Workouts {
  const text = note.trim().slice(0, PINNED_NOTE_MAX), next = {...w.pinnedNotes};
  if (text) next[exerciseId] = text; else delete next[exerciseId];
  if (Object.keys(next).length > 300) throw Error('Up to 300 pinned notes fit. Remove one first.');
  const {pinnedNotes: _old, ...rest} = w; void _old;
  return workoutsSchema.parse(Object.keys(next).length ? {...rest, pinnedNotes: next} : rest);
}
/** A routine's note; an empty note removes it. */
export function setRoutineNote(w: Workouts, routineId: string, note: string): Workouts {
  if (!w.templates.some(t => t.id === routineId)) throw Error('This routine is no longer here.');
  const text = note.trim().slice(0, 500);
  return workoutsSchema.parse({...w, templates: w.templates.map(t => { if (t.id !== routineId) return t; const {note: _n, ...rest} = t; void _n; return text ? {...rest, note: text} : rest; })});
}
