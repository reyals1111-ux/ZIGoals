import {guideRoutine, type Guide, type Lang} from './routine-library';
import {workoutsSchema, type Workouts, type WorkoutTemplate} from './schema';

/**
 * Session AV lane 2 (body; LEDGER #115, Hevy's routine folders and library): a library routine saved as the person's
 * own, routine folders, and the routines grouped by folder (folders in the order first used, "No folder" last). Pure;
 * each mutator returns a parsed record or throws a sentence.
 */
export const MAX_ROUTINES = 50;
/** Saves a library routine as the person's own (once per library routine and language); returns it. */
export function saveGuide(w: Workouts, g: Guide, lang: Lang, now: Date): {workouts: Workouts; routine: WorkoutTemplate; added: boolean} {
  const base = guideRoutine(g, lang), held = w.templates.find(t => t.guideId === g.id && t.name === base.name);
  if (held) return {workouts: w, routine: held, added: false};
  if (w.templates.length >= MAX_ROUTINES) throw Error(`Up to ${MAX_ROUTINES} routines fit. Remove one first.`);
  const routine: WorkoutTemplate = {...base, id: `routine-${crypto.randomUUID()}`, createdAt: now.toISOString()};
  return {workouts: workoutsSchema.parse({...w, templates: [routine, ...w.templates]}), routine, added: true};
}
/** Puts a routine in a folder; an empty name takes it out of its folder. */
export function setRoutineFolder(w: Workouts, routineId: string, folder: string): Workouts {
  if (!w.templates.some(t => t.id === routineId)) throw Error('This routine is no longer here.');
  const name = folder.trim().replace(/\s+/g, ' ').slice(0, 40);
  // The same folder typed another way ("gym", "Gym ") is the one already there.
  const same = folderNames(w).find(f => f.toLowerCase() === name.toLowerCase()) ?? name;
  return workoutsSchema.parse({...w, templates: w.templates.map(t => { if (t.id !== routineId) return t; const {folder: _f, ...rest} = t; void _f; return same ? {...rest, folder: same} : rest; })});
}
/** The folders in use, in the order the routines list them. */
export const folderNames = (w: Workouts): string[] => [...new Set(w.templates.map(t => t.folder).filter((f): f is string => !!f))];
export type RoutineGroup = {folder: string | null; routines: WorkoutTemplate[]};
export function routineGroups(w: Workouts): RoutineGroup[] {
  const groups: RoutineGroup[] = folderNames(w).map(folder => ({folder, routines: w.templates.filter(t => t.folder === folder)}));
  const loose = w.templates.filter(t => !t.folder);
  return loose.length ? [...groups, {folder: null, routines: loose}] : groups;
}
