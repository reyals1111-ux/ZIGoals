import {describe, expect, test} from 'vitest';
import {HIDDEN_NOTE, hideBodyFigures, withHiddenFigures} from './av2-hide-figures';
import {localAnswer} from './engine';
import {showcaseAll, zigiEnv} from '../evals/as/harness';

/**
 * Session AV lane 2 (review b1 #10): hiding calorie and body-weight figures no longer takes what is not one — a year
 * before a comma, an ordinal date, money in pounds, training volume — while every calorie and body weight still goes.
 */
describe('hidden figures hide only calories and body weight', () => {
  test('a year, an ordinal and money stay; the weight beside them goes', () => {
    expect(hideBodyFigures('In 2026, 72 kg.').text).toBe('In 2026, — kg.');
    expect(hideBodyFigures('On Nov 21st you logged 1,840 kcal.').text).toBe('On Nov 21st you logged — kcal.');
    expect(hideBodyFigures('You spent 20 pounds on groceries.')).toEqual({text: 'You spent 20 pounds on groceries.', changed: false});
    expect(hideBodyFigures('You weigh 11 st 4.').text).toBe('You weigh — st 4.');
    expect(hideBodyFigures('Weight 72.4 kg, 1 840 kcal today.').text).toBe('Weight — kg, — kcal today.');
  });
  test('training volume is not a body figure; a body weight on the same line still goes', () => {
    expect(hideBodyFigures('You lifted 4,200 kg this week over 12 sets.')).toEqual({text: 'You lifted 4,200 kg this week over 12 sets.', changed: false});
    expect(hideBodyFigures('Je hebt 3.150 kg getild deze week.').changed).toBe(false);
    expect(hideBodyFigures('You lifted 4,200 kg; your weight is 72 kg.').text).toBe('You lifted 4,200 kg; your weight is — kg.');
    expect(hideBodyFigures('You lifted 4,200 kg and burned 300 kcal.').text).toBe('You lifted 4,200 kg and burned — kcal.');
    // A line apart from the lifting one is read on its own.
    expect(hideBodyFigures('You lifted 4,200 kg.\nBody weight: 72 kg.').text).toBe('You lifted 4,200 kg.\nBody weight: — kg.');
  });
  test('the Showcase’s lifting answer keeps its volume while the switch is on', () => {
    const r = localAnswer('how much weight did I lift this week', zigiEnv(showcaseAll()));
    expect('text' in r ? r.text : '').toMatch(/^You lifted 2,643 kg this week/);
    expect(withHiddenFigures(r, true)).toBe(r);
    // A calorie answer still hides every calorie figure.
    const kcal = withHiddenFigures(localAnswer('how many calories did i eat today', zigiEnv(showcaseAll())), true);
    expect('text' in kcal ? kcal.text : '').not.toMatch(/\d[\d,.]*\s?(?:kcal|calories?)/i);
    expect('text' in kcal ? kcal.text : '').toContain(HIDDEN_NOTE.en);
  });
});
