import {describe, expect, test} from 'vitest';
import {followUpQuestion} from './followup';

/** Session AI (G4): a bare time follow-up reuses the previous question; nothing else is rewritten. */
describe('follow-ups on the device', () => {
  test.each([
    ['And the day before?', 'How much water did I drink yesterday?', 'How much water did I drink the day before yesterday?'],
    ['what about last week?', 'How many minutes of Read this week?', 'How many minutes of Read last week?'],
    ['En gisteren?', 'Hoeveel water heb ik vandaag gedronken?', 'Hoeveel water heb ik gisteren gedronken?'],
    ['and yesterday', 'How much water did I drink?', 'How much water did I drink yesterday?'],
  ])('"%s" after "%s"', (q, prev, want) => expect(followUpQuestion(q, prev)).toBe(want));
  test.each([['Log a coffee', 'How much water today?'], ['yesterday?', null], ['make it two', 'Log a coffee']])('"%s" stays as typed', (q, prev) => expect(followUpQuestion(q, prev)).toBeNull());
});
