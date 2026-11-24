import {describe, expect, test} from 'vitest';
import {collectEverything, DEVICE_KEYS} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {emptyPlaces, WORKOUT_PLACES_KEY, workoutPlacesSchema} from './places-schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #239; TIER 3 (stored formats), a new key): the places and their equipment. It
 * reads as written; a place this build cannot read is dropped and the others kept; an equipment tag from a later build is
 * kept as written; and, once the lead registers the key, Export everything → erase → Restore keeps it.
 */
const AT = '2026-11-20T08:00:00.000Z';
const PLACES = {version: 1, places: [{id: 'place-home-1', name: 'Home', equipment: ['dumbbells', 'bench', 'bands'], createdAt: AT}, {id: 'place-gym-1', name: 'Fictional gym', equipment: ['barbell', 'dumbbells', 'bench', 'cable', 'machine', 'pull-up-bar'], createdAt: AT}], current: 'place-home-1'};

describe('the workout places record', () => {
  test('reads as written; an empty record is valid', () => {
    expect(workoutPlacesSchema.parse(PLACES)).toEqual(PLACES);
    expect(workoutPlacesSchema.parse(emptyPlaces())).toEqual(emptyPlaces());
  });
  test('an unreadable place is dropped and the rest kept; a later build\'s tag is kept; a bad current is dropped', () => {
    const r = workoutPlacesSchema.parse({...PLACES, places: [...PLACES.places, {id: 'nope', name: ''}, {id: 'place-trip-1', name: 'Trip', equipment: ['sled-2030'], createdAt: AT}], current: 'Home'});
    expect(r.places.map(p => p.id)).toEqual(['place-home-1', 'place-gym-1', 'place-trip-1']);
    expect(r.places[2]!.equipment).toEqual(['sled-2030']);
    expect(r.current).toBeUndefined();
    expect(workoutPlacesSchema.parse({version: 1, places: 'x'}).places).toEqual([]);
  });
  const registered = Object.values(DEVICE_KEYS as Record<string, string>).includes(WORKOUT_PLACES_KEY);
  test.skipIf(!registered)('Export everything → erase → Restore keeps the places', () => {
    const collected = collectEverything({[WORKOUT_PLACES_KEY]: JSON.stringify(PLACES)}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === WORKOUT_PLACES_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back && back.value).toEqual(PLACES);
  });
});
