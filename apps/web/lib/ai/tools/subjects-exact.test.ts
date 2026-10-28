import {describe, expect, test} from 'vitest';
import {matchByName} from './subjects';

/** Session AI (G3): an exact name wins; it is never called ambiguous with a similar or longer one. */
const goals = [{id: 'a', name: 'Holiday fund'}, {id: 'b', name: 'Holiday fund Japan'}, {id: 'c', name: 'Emergency fund'}];
const pick = (q: string) => matchByName(goals, q, g => g.name, g => g.id);
describe('exact names win', () => {
  test.each(['Holiday fund', 'holiday fund', 'the Holiday fund goal', 'my Holiday fund', 'mijn Holiday fund'])('"%s" is the Holiday fund', q => expect(pick(q)).toMatchObject({kind: 'one', id: 'a'}));
  test('the longer name still wins when it is said', () => expect(pick('Holiday fund Japan')).toMatchObject({kind: 'one', id: 'b'}));
  test('a word both names share is still a choice, never a guess', () => expect(pick('fund').kind).toBe('many'));
  test.each(['Meditaet', 'Exercsie'])('one slip still names the habit: %s', q => {
    const habits = [{id: 'm', name: 'Meditate'}, {id: 'e', name: 'Exercise'}, {id: 'r', name: 'Read'}];
    expect(matchByName(habits, q, h => h.name, h => h.id).kind).toBe('one');
  });
});
