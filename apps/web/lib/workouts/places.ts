import {EQUIPMENT} from './equipment';
import {MAX_PLACES, PLACE_NAME_MAX, workoutPlacesSchema, type Place, type WorkoutPlaces} from './places-schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #239, Fitbod's gym profiles): the places and what each has, pure — add (from a
 * ready-made set or empty), rename, change the equipment, remove, and choose the place for now. Up to five; names unique
 * however they are typed. The chosen place's equipment filters the picker, the library, "Suggest a workout" and "Replace".
 */
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();
const known = (list: readonly string[]) => [...new Set(list)].filter(e => (EQUIPMENT as readonly string[]).includes(e) || /^[a-z0-9-]{1,30}$/.test(e));
const newId = () => `place-${crypto.randomUUID().slice(0, 8)}`;
function checkName(r: WorkoutPlaces, name: string, except?: string): string {
  const n = name.trim().replace(/\s+/g, ' ');
  if (!n) throw Error('Give the place a name, such as Home or Gym.');
  if (n.length > PLACE_NAME_MAX) throw Error(`Up to ${PLACE_NAME_MAX} characters.`);
  if (r.places.some(p => p.id !== except && fold(p.name) === fold(n))) throw Error(`You already have a place called ${n}.`);
  return n;
}
export function addPlace(r: WorkoutPlaces, name: string, equipment: readonly string[], now: Date, id = newId()): {record: WorkoutPlaces; place: Place} {
  if (r.places.length >= MAX_PLACES) throw Error(`Up to ${MAX_PLACES} places fit. Remove one first.`);
  const place: Place = {id, name: checkName(r, name), equipment: known(equipment), createdAt: now.toISOString()};
  // The first place becomes the place for now.
  return {record: workoutPlacesSchema.parse({...r, places: [...r.places, place], ...(r.current ? {} : {current: place.id})}), place};
}
export function editPlace(r: WorkoutPlaces, id: string, patch: {name?: string; equipment?: readonly string[]}): WorkoutPlaces {
  const held = r.places.find(p => p.id === id);
  if (!held) throw Error('This place is no longer here.');
  const next = {...held, ...(patch.name !== undefined ? {name: checkName(r, patch.name, id)} : {}), ...(patch.equipment ? {equipment: known(patch.equipment)} : {})};
  return workoutPlacesSchema.parse({...r, places: r.places.map(p => p.id === id ? next : p)});
}
export function removePlace(r: WorkoutPlaces, id: string): WorkoutPlaces {
  const places = r.places.filter(p => p.id !== id);
  const {current, ...rest} = r;
  return workoutPlacesSchema.parse({...rest, places, ...(current && current !== id ? {current} : {})});
}
/** Chooses the place for now (null: any place, nothing filtered). */
export function choosePlace(r: WorkoutPlaces, id: string | null): WorkoutPlaces {
  if (id && !r.places.some(p => p.id === id)) throw Error('This place is no longer here.');
  const {current: _c, ...rest} = r; void _c;
  return workoutPlacesSchema.parse({...rest, ...(id ? {current: id} : {})});
}
/** The place chosen now, or null (any place). */
export const currentPlace = (r: WorkoutPlaces | null | undefined): Place | null => r?.places.find(p => p.id === r.current) ?? null;
