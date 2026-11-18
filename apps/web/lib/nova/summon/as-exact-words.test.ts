import {describe, expect, it} from 'vitest';
import {stageAnswerText} from './words';

// Session AS (found by tests/nova-answers-as.spec.ts): an exact answer keeps its third sentence under the star when it
// fits the same 220 characters ("Today is still open." is a fact of the answer); any other reply is cut at two as before.
const reply = 'Meditate: not done on 2 days this month (Sun, Nov 1 to Tue, Nov 17): Tue, Nov 3 and Thu, Nov 12. Both were marked as skipped. Today is still open.';
const base = {made: [], lines: {}, lang: 'en' as const, decision: false, fallback: false};
describe('an exact answer under the star', () => {
  it('keeps three sentences within 220 characters', () => {
    expect(stageAnswerText({...base, reply, exact: true})).toBe(reply);
    expect(stageAnswerText({...base, reply: `${reply} A fourth sentence.`, exact: true})).toBe(reply);
  });
  it('never runs past 220 characters, and a reply that is not exact is two sentences as before', () => {
    const long = `${'A sentence of some length here. '.repeat(3)}${'word '.repeat(40)}end.`;
    expect(stageAnswerText({...base, reply: long, exact: true}).length).toBeLessThanOrEqual(220);
    expect(stageAnswerText({...base, reply})).toBe('Meditate: not done on 2 days this month (Sun, Nov 1 to Tue, Nov 17): Tue, Nov 3 and Thu, Nov 12. Both were marked as skipped.');
  });
});
