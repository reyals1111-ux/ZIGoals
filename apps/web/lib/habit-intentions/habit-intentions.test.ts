import {describe, expect, test} from 'vitest';
import {emptyHabitExtras, habitExtrasSchema} from '../habits-extras/schema';
import {setHabitArea} from '../habits-extras/store';
import {createHabit, emptyHabitData, type HabitInput} from '../habits';
import {showcaseHabitIntentions} from './showcase';
import {cleanIntentionText, habitIntention, intentionLine, INTENTION_MAX, setHabitIntention, stackSentence, stackSteps} from './intentions';

const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
describe('implementation intentions (habit extras, optional field)', () => {
  test('set, read, clear and prune; other fields survive', () => {
    let r = setHabitArea(emptyHabitExtras(), A, 'health');
    r = setHabitIntention(r, A, {when: '  after I pour   my coffee ', where: 'in the kitchen'});
    r = setHabitIntention(r, B, {when: 'At lunch'});
    expect(habitIntention(r, A)).toEqual({when: 'after I pour my coffee', where: 'in the kitchen'});
    expect(r.areas).toEqual({[A]: 'health'});
    r = setHabitIntention(r, B, {when: '', where: '   '});
    expect(habitIntention(r, B)).toBeNull();
    r = setHabitIntention(r, A, {where: 'on the mat'}, new Set<string>());
    expect(r.intentions).toEqual({[A]: {where: 'on the mat'}});
    r = setHabitIntention(r, A, null);
    expect(r.intentions).toBeUndefined();
  });
  test('texts are one plain line of at most 80 characters', () => {
    expect(cleanIntentionText('a\u0000b\nc')).toBe('a b c');
    expect(cleanIntentionText('x'.repeat(200))).toHaveLength(INTENTION_MAX);
    expect(cleanIntentionText(null)).toBeUndefined();
    expect(habitExtrasSchema.safeParse({version: 1, intentions: {[A]: {when: 'a\u0007b'}}}).success).toBe(false);
    expect(habitExtrasSchema.safeParse({version: 1, intentions: {[A]: {when: 'x'.repeat(81)}}}).success).toBe(false);
  });
  test('a record without intentions (an older build) still reads, and a later field survives', () => {
    expect(habitExtrasSchema.parse({version: 1}).intentions).toBeUndefined();
    const later = habitExtrasSchema.parse({version: 1, intentions: {[A]: {when: 'At 7', mood: 'later'}}});
    expect(setHabitIntention(later, B, {when: 'Noon'}).intentions![A]).toEqual({when: 'At 7', mood: 'later'});
  });
  test('more than 400 intentions is refused', () => {
    const intentions = Object.fromEntries(Array.from({length: 401}, (_, i) => [`h${i}`, {when: 'x'}]));
    expect(habitExtrasSchema.safeParse({version: 1, intentions}).success).toBe(false);
  });
  test('the line and the stack, in order, with the first habit’s cue', () => {
    expect(intentionLine('2 min stretch', {when: 'after I pour coffee'})).toBe('After I pour coffee → 2 min stretch');
    expect(intentionLine('Read', {where: 'on the sofa'})).toBe('Read · on the sofa');
    expect(intentionLine('Read', null)).toBeNull();
    const r = setHabitIntention(emptyHabitExtras(), A, {when: 'after I pour coffee'});
    const chain = [{id: A, title: '2 min stretch'}, {id: B, title: 'Read'}];
    expect(stackSteps(chain, r)).toEqual({cue: 'After I pour coffee', steps: chain});
    expect(stackSentence(chain, r)).toBe('After I pour coffee, then 2 min stretch, then Read.');
    expect(stackSteps(chain, null).cue).toBeNull();
    expect(stackSentence([], r)).toBe('');
  });
  test('the Showcase intentions are labelled and only for habits the Showcase has', () => {
    const input = (title: string): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}});
    let habits = createHabit(emptyHabitData(), input('Read'), new Date('2026-10-01T06:00:00Z'), A);
    habits = createHabit(habits, input('Walk'), new Date('2026-10-01T06:00:00Z'), B);
    const r = showcaseHabitIntentions(setHabitArea(emptyHabitExtras(), B, 'health'), habits);
    expect(r.intentions).toEqual({[A]: {when: 'After I pour my morning coffee', where: 'on the sofa (Showcase)'}});
    expect(r.areas).toEqual({[B]: 'health'});
  });
});
