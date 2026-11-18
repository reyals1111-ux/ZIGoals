import {describe, expect, it} from 'vitest';
import {sentenceCut, stageAnswerText} from './words';

// Session AS (found by tests/nova-answers-as.spec.ts): an exact answer keeps its third sentence under the star when it
// fits the same 220 characters ("Today is still open." is a fact of the answer); any other reply is cut at two as before.
const reply = 'Meditate: not done on 2 days this month (Sun, Nov 1 to Tue, Nov 17): Tue, Nov 3 and Thu, Nov 12. Both were marked as skipped. Today is still open.';
const base = {made: [], lines: {}, lang: 'en' as const, decision: false, fallback: false};
describe('an exact answer under the star', () => {
  it('a figure with a decimal point never cuts a sentence, nor drops the words before it', () => {
    const health = 'Your health, from what is recorded: sleep 7 h 17 min of 8 h; weight 73.48 kg (Mon, Nov 16); 1 workout this week. Nothing recorded for: resting heart rate.';
    expect(stageAnswerText({...base, reply: health, exact: true})).toBe(health);
    expect(sentenceCut('Weight 73.48 kg. Down 0.2 kg. Goal 72 kg.')).toBe('Weight 73.48 kg. Down 0.2 kg.');
    expect(sentenceCut('Version 1.2.3 is here')).toBe('Version 1.2.3 is here');
  });
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
