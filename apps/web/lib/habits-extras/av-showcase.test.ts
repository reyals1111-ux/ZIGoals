import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData} from '../habits';
import {focusOf} from '../habit-focus';
import {lookOf} from '../habit-look';
import {showcaseHabitExtras, showcaseHabitsAa} from './showcase';

/** Session AV (q4 #26): the Showcase shows three habits with a symbol and colour. Deliberate change (labelled): its focus
 * habit was taken out again (its line took Showcase Today past its 90 Tab stops, D-028); no focus is set there. */
describe('Session AV Showcase extras (q4 #24, #26)', () => {
  it('no focus habit is set on the Showcase day, and Read, Walk and Meditate have a look', () => {
    const day = '2026-11-17', at = new Date('2026-10-19T00:00:00Z');
    let d = emptyHabitData();
    ['Read', 'Exercise', 'Walk', 'Meditate'].forEach((title, i) => { d = createHabit(d, {title, category: 'Wellbeing', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, at, `92000000-0000-4000-8000-00000000000${i + 1}`); });
    const habits = showcaseHabitsAa(d, day, 'UTC'), extras = showcaseHabitExtras(habits);
    const id = (t: string) => habits.habits.find(h => h.title === t)!.id;
    expect(focusOf(extras, day)).toBeNull();
    expect([lookOf(extras, id('Read')), lookOf(extras, id('Walk')), lookOf(extras, id('Meditate'))]).toEqual([{glyph: '✎', colour: 'violet'}, {glyph: '☀', colour: 'green'}, {glyph: '☾', colour: 'blue'}]);
    expect(lookOf(extras, id('Exercise'))).toBeNull();
  });
});
