import type {CATEGORIES, CustomExercise, Measure} from './schema';

/** Session AH (DE8): the built-in exercises, by category, with what each set records. Names are plain English. */
export type LibraryExercise = {id: string; name: string; category: typeof CATEGORIES[number]; measure: Measure};
const x = (id: string, name: string, category: LibraryExercise['category'], measure: Measure = 'weight-reps'): LibraryExercise => ({id, name, category, measure});
export const EXERCISES: readonly LibraryExercise[] = [
  x('bench-press', 'Bench press', 'Chest'), x('incline-db-press', 'Incline dumbbell press', 'Chest'), x('chest-fly', 'Chest fly', 'Chest'), x('push-up', 'Push-up', 'Chest', 'reps'), x('dip', 'Dip', 'Chest', 'reps'),
  x('deadlift', 'Deadlift', 'Back'), x('barbell-row', 'Barbell row', 'Back'), x('lat-pulldown', 'Lat pulldown', 'Back'), x('seated-row', 'Seated cable row', 'Back'), x('pull-up', 'Pull-up', 'Back', 'reps'), x('chin-up', 'Chin-up', 'Back', 'reps'), x('shrug', 'Shrug', 'Back'),
  x('squat', 'Squat', 'Legs'), x('front-squat', 'Front squat', 'Legs'), x('romanian-deadlift', 'Romanian deadlift', 'Legs'), x('leg-press', 'Leg press', 'Legs'), x('lunge', 'Lunge', 'Legs'), x('hip-thrust', 'Hip thrust', 'Legs'), x('leg-curl', 'Leg curl', 'Legs'), x('leg-extension', 'Leg extension', 'Legs'), x('calf-raise', 'Calf raise', 'Legs'), x('bodyweight-squat', 'Bodyweight squat', 'Legs', 'reps'), x('wall-sit', 'Wall sit', 'Legs', 'time'),
  x('overhead-press', 'Overhead press', 'Shoulders'), x('lateral-raise', 'Lateral raise', 'Shoulders'), x('face-pull', 'Face pull', 'Shoulders'),
  x('bicep-curl', 'Bicep curl', 'Arms'), x('hammer-curl', 'Hammer curl', 'Arms'), x('triceps-pushdown', 'Triceps pushdown', 'Arms'), x('skull-crusher', 'Skull crusher', 'Arms'),
  x('plank', 'Plank', 'Core', 'time'), x('side-plank', 'Side plank', 'Core', 'time'), x('crunch', 'Crunch', 'Core', 'reps'), x('sit-up', 'Sit-up', 'Core', 'reps'), x('hanging-leg-raise', 'Hanging leg raise', 'Core', 'reps'),
  x('kettlebell-swing', 'Kettlebell swing', 'Full body'), x('burpee', 'Burpee', 'Full body', 'reps'), x('clean', 'Power clean', 'Full body'),
  x('running', 'Running', 'Cardio', 'distance-time'), x('walking', 'Walking', 'Cardio', 'distance-time'), x('cycling', 'Cycling', 'Cardio', 'distance-time'), x('rowing', 'Rowing', 'Cardio', 'distance-time'), x('swimming', 'Swimming', 'Cardio', 'distance-time'), x('elliptical', 'Elliptical', 'Cardio', 'distance-time'), x('jump-rope', 'Jump rope', 'Cardio', 'time'),
  x('stretching', 'Stretching', 'Mobility', 'time'), x('yoga', 'Yoga flow', 'Mobility', 'time'), x('foam-rolling', 'Foam rolling', 'Mobility', 'time'),
];
export function allExercises(custom: readonly CustomExercise[]): LibraryExercise[] {
  return [...EXERCISES, ...custom.map(c => ({id: c.id, name: c.name, category: c.category, measure: c.measure}))];
}
/** Exercises whose name contains every typed word, any order, case and accents ignored. */
export function searchExercises(list: readonly LibraryExercise[], query: string): LibraryExercise[] {
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const words = fold(query.slice(0, 80)).split(/\s+/).filter(Boolean);
  return list.filter(e => words.every(w => fold(e.name).includes(w) || fold(e.category).includes(w)));
}
