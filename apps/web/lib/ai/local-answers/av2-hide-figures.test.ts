import {describe, expect, test} from 'vitest';
import {HIDDEN_NOTE, hideBodyFigures, withHiddenFigures} from './av2-hide-figures';
import {HIDE_FIGURES_KEY} from '../../../components/hide-figures';
import {localAnswer} from './engine';
import {showcaseAll, zigiEnv} from '../evals/as/harness';

/** Session AV lane 2 (habits pillar; LEDGER #69): no calorie or body-weight figure in an answer while the switch is on. */
describe('hidden figures in NOVA and ZIGi', () => {
  test('calories and weight become a dash, in English and Dutch; other numbers stay', () => {
    expect(hideBodyFigures('Today: 1,840 kcal of 2,100 kcal, 8,214 steps, 7 h 05 min asleep.').text).toBe('Today: — kcal of — kcal, 8,214 steps, 7 h 05 min asleep.');
    expect(hideBodyFigures('Your weight is 72.4 kg, down 0.6 kg since Monday.').text).toBe('Your weight is — kg, down — kg since Monday.');
    expect(hideBodyFigures('Je gewicht 72,4 en 1.200 calorieën vandaag.').text).toBe('Je gewicht — en — calorieën vandaag.');
    expect(hideBodyFigures('weight: 160 lbs').text).toBe('weight: — lbs');
    const plain = hideBodyFigures('3 of 5 habits done, 25 minutes of focus.');
    expect(plain).toEqual({text: '3 of 5 habits done, 25 minutes of focus.', changed: false});
  });
  test('the reply carries one plain line, only when something was hidden, and only with the switch on', () => {
    const reply = {kind: 'answer' as const, text: 'Lunch: 640 kcal.', calls: []};
    expect(withHiddenFigures(reply, true)).toEqual({...reply, text: `Lunch: — kcal.\n\n${HIDDEN_NOTE.en}`});
    expect(withHiddenFigures(reply, true, 'nl').text).toContain(HIDDEN_NOTE.nl);
    expect(withHiddenFigures(reply, false)).toBe(reply);
    const other = {kind: 'answer' as const, text: '8,214 steps today.', calls: []};
    expect(withHiddenFigures(other, true)).toBe(other);
  });
  test('the Showcase\'s own calorie answer hides every calorie figure; the key is the Health switch\'s', () => {
    expect(HIDE_FIGURES_KEY).toBe('zigoals:hide-body-figures');
    const r = localAnswer('how many calories did i eat today', zigiEnv(showcaseAll()));
    const hidden = withHiddenFigures(r, true);
    expect('text' in r ? r.text : '').toMatch(/\d\s?kcal/);
    expect('text' in hidden ? hidden.text : '').not.toMatch(/\d[\d,.]*\s?(?:kcal|calories?)/i);
    expect('text' in hidden ? hidden.text : '').toContain(HIDDEN_NOTE.en);
  });
});
