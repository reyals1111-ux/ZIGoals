/**
 * Session AV lane 2 (bodymind-r2; LEDGER #239, Fitbod's gym profiles and equipment): an equipment tag for every built-in
 * exercise — what it needs, as one or more ways to do it (any one way is enough: a lateral raise with dumbbells, a cable or
 * bands) — and the words for each piece, in English and Dutch. The floor and your own body weight are always there. An own
 * exercise has no tag, so it shows at every place. Constants and pure checks only (cheap for the workout view's chunk).
 */
export const EQUIPMENT = ['barbell', 'dumbbells', 'kettlebell', 'bench', 'cable', 'machine', 'pull-up-bar', 'dip-bars', 'bands', 'bike', 'rower', 'cardio-machine', 'pool', 'jump-rope', 'foam-roller'] as const;
export type Equipment = typeof EQUIPMENT[number];
export const EQUIPMENT_WORDS: Record<Equipment, {en: string; nl: string}> = {
  barbell: {en: 'Barbell and plates', nl: 'Halterstang en schijven'}, dumbbells: {en: 'Dumbbells', nl: 'Dumbbells'}, kettlebell: {en: 'Kettlebell', nl: 'Kettlebell'},
  bench: {en: 'Bench', nl: 'Bank'}, cable: {en: 'Cable station', nl: 'Kabelstation'}, machine: {en: 'Weight machines', nl: 'Krachtapparaten'},
  'pull-up-bar': {en: 'Pull-up bar', nl: 'Optrekstang'}, 'dip-bars': {en: 'Dip bars', nl: 'Dipstation'}, bands: {en: 'Resistance bands', nl: 'Weerstandsbanden'},
  bike: {en: 'Bike or exercise bike', nl: 'Fiets of hometrainer'}, rower: {en: 'Rowing machine', nl: 'Roeitrainer'}, 'cardio-machine': {en: 'Elliptical or treadmill', nl: 'Crosstrainer of loopband'},
  pool: {en: 'Pool', nl: 'Zwembad'}, 'jump-rope': {en: 'Jump rope', nl: 'Springtouw'}, 'foam-roller': {en: 'Foam roller', nl: 'Foamroller'},
};
type Way = readonly Equipment[];
const BODY: readonly Way[] = [[]];
/** What each built-in exercise needs: any one of the ways; [] is the floor and your body weight. */
export const NEEDS: Record<string, readonly Way[]> = {
  'bench-press': [['barbell', 'bench']], 'incline-db-press': [['dumbbells', 'bench']], 'chest-fly': [['dumbbells', 'bench'], ['cable'], ['machine']], 'push-up': BODY, dip: [['dip-bars']],
  deadlift: [['barbell']], 'barbell-row': [['barbell']], 'lat-pulldown': [['cable'], ['machine']], 'seated-row': [['cable'], ['machine']], 'pull-up': [['pull-up-bar']], 'chin-up': [['pull-up-bar']], shrug: [['barbell'], ['dumbbells']],
  squat: [['barbell']], 'front-squat': [['barbell']], 'romanian-deadlift': [['barbell'], ['dumbbells']], 'leg-press': [['machine']], lunge: BODY, 'hip-thrust': [['barbell', 'bench'], ['dumbbells', 'bench'], ['bench']],
  'leg-curl': [['machine']], 'leg-extension': [['machine']], 'calf-raise': BODY, 'bodyweight-squat': BODY, 'wall-sit': BODY,
  'overhead-press': [['barbell'], ['dumbbells']], 'lateral-raise': [['dumbbells'], ['cable'], ['bands']], 'face-pull': [['cable'], ['bands']],
  'bicep-curl': [['dumbbells'], ['barbell'], ['cable'], ['bands']], 'hammer-curl': [['dumbbells']], 'triceps-pushdown': [['cable'], ['bands']], 'skull-crusher': [['barbell', 'bench'], ['dumbbells', 'bench']],
  plank: BODY, 'side-plank': BODY, crunch: BODY, 'sit-up': BODY, 'hanging-leg-raise': [['pull-up-bar']],
  'kettlebell-swing': [['kettlebell'], ['dumbbells']], burpee: BODY, clean: [['barbell']],
  running: BODY, walking: BODY, cycling: [['bike']], rowing: [['rower']], swimming: [['pool']], elliptical: [['cardio-machine']], 'jump-rope': [['jump-rope']],
  stretching: BODY, yoga: BODY, 'foam-rolling': [['foam-roller']],
};
/** Whether an exercise can be done with this equipment (null: any place). An exercise without a tag (your own) always can. */
export function availableWith(exerciseId: string, have: readonly string[] | null): boolean {
  if (have === null) return true;
  const ways = NEEDS[exerciseId];
  if (!ways) return true;
  return ways.some(way => way.every(e => have.includes(e)));
}
/** What an exercise needs, in words: "Barbell and plates + Bench, or …"; "No equipment" for the floor. */
export function needsWords(exerciseId: string, lang: 'en' | 'nl' = 'en'): string | null {
  const ways = NEEDS[exerciseId];
  if (!ways) return null;
  return ways.map(way => way.length ? way.map(e => EQUIPMENT_WORDS[e][lang]).join(' + ') : (lang === 'nl' ? 'Geen materiaal' : 'No equipment')).join(lang === 'nl' ? ', of ' : ', or ');
}
/** Ready-made sets of equipment for a new place. */
export const PLACE_PRESETS: readonly {id: string; name: {en: string; nl: string}; equipment: readonly Equipment[]}[] = [
  {id: 'gym', name: {en: 'Full gym', nl: 'Volledige sportschool'}, equipment: ['barbell', 'dumbbells', 'kettlebell', 'bench', 'cable', 'machine', 'pull-up-bar', 'dip-bars', 'bands', 'bike', 'rower', 'cardio-machine', 'jump-rope', 'foam-roller']},
  {id: 'home', name: {en: 'Home with dumbbells', nl: 'Thuis met dumbbells'}, equipment: ['dumbbells', 'bench', 'bands', 'pull-up-bar']},
  {id: 'travel', name: {en: 'Body weight only (travel)', nl: 'Alleen lichaamsgewicht (op reis)'}, equipment: []},
];
