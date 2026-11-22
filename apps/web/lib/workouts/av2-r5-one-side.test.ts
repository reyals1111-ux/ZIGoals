import {describe, expect, test} from 'vitest';
import {plateLoad, platesFor, savePlates} from './depth';
import {baseOf, loadFor, oneSideLoad, rampFor} from './one-side';
import {emptyWorkouts, type PlateSetup} from './schema';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #378, Bevel's single-sided plate calculator): on one side every plate of a pair
 * may go on the one horn and the machine's own weight takes the bar's place; kept with the plate set.
 */
const SET: PlateSetup = {unit: 'kg', bar: 20, plates: [{size: 20, pairs: 2}, {size: 10, pairs: 1}, {size: 5, pairs: 1}, {size: 2.5, pairs: 1}]};
const ONE: PlateSetup = {...SET, oneSide: true, start: 40};

describe('plates on one side', () => {
  test('the horn takes the plates of the whole load above the machine', () => {
    expect(oneSideLoad(110, ONE)).toEqual({perSide: [20, 20, 20, 10], total: 110, exact: true, belowBar: false});
    // Both plates of a pair may go on the one horn: 2 × 10 kg though only one pair is kept.
    expect(oneSideLoad(60, ONE).perSide).toEqual([20]);
    expect(oneSideLoad(65, ONE).perSide).toEqual([20, 5]);
    expect(oneSideLoad(81, ONE)).toMatchObject({total: 80, exact: false});
    expect(oneSideLoad(30, ONE)).toMatchObject({perSide: [], total: 40, belowBar: true});
    expect(oneSideLoad(40, ONE)).toMatchObject({perSide: [], exact: true, belowBar: false});
  });
  test('without its own weight it starts from 0; on a bar nothing changed', () => {
    expect(oneSideLoad(25, {...SET, oneSide: true})).toMatchObject({perSide: [20, 5], total: 25, exact: true});
    expect(baseOf(SET)).toBe(20);
    expect(baseOf(ONE)).toBe(40);
    expect(loadFor(100, SET)).toEqual(plateLoad(100, SET));
  });
  test('the warm-up ramp rounds to what one horn loads, starting from the machine alone', () => {
    expect(rampFor(100, ONE)).toEqual([{weight: 40, reps: 10}, {weight: 60, reps: 3}, {weight: 80, reps: 1}]);
    expect(rampFor(100, {...SET, oneSide: true})[0]).toEqual({weight: 40, reps: 5});
  });
  test('kept with the plate set; a bad own weight is refused', () => {
    const w = savePlates(emptyWorkouts(), ONE);
    expect(platesFor(w, 'kg')).toMatchObject({oneSide: true, start: 40, bar: 20});
    expect(platesFor(savePlates(w, SET), 'kg')).not.toHaveProperty('oneSide');
    expect(() => savePlates(emptyWorkouts(), {...ONE, start: 900})).toThrow('Enter the machine’s own weight from 0 to 500.');
  });
});
