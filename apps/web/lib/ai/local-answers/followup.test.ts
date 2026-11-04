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
// Session AL second pass (TK-078, P-TK-33): a coin or a currency follow-up carries the question over.
describe('coin and currency follow-ups', () => {
  test.each([
    ['and in EUR?', 'What is the price of BTC in USD?', 'What is the price of BTC in EUR?'],
    ['and ETH?', 'How much BTC do I hold?', 'How much ETH do I hold?'],
    ['what about SOL?', 'What is the price of BTC?', 'What is the price of SOL?'],
    ['and in USD?', 'What is the price of BTC?', 'What is the price of BTC in USD?'],
  ])('"%s" after "%s"', (q, prev, want) => expect(followUpQuestion(q, prev)).toBe(want));
  test.each([['and Read?', 'How many minutes of Read this week?'], ['and in USD?', 'How much water did I drink?']])('"%s" stays as typed', (q, prev) => expect(followUpQuestion(q, prev)).toBeNull());
});
