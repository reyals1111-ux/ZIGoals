import {describe, expect, it} from 'vitest';
import {summonFor} from './summon';

/**
 * Session AM-2 (docs/handoff/AM_DEMO_TOUR.md, section 8): the requests the demo tour tells the owner to try each make
 * the widget the tour names — and only that one where the words name one thing.
 */
const ids = (question: string) => summonFor(question).widgets.map(w => w.id);
describe('the demo tour\'s requests', () => {
  const tour: [string, string][] = [
    ['Show my net worth over time', 'net-worth-history'], ['What is ready to assign?', 'ready-to-assign'], ['How old is my money?', 'age-of-money'], ['Am I spending faster than usual?', 'spending-pace'],
    ['Did any bill change?', 'bill-changes'], ['Show my spending by tag', 'money-tags'], ['Show my perfect days', 'perfect-days'], ['When does my day end?', 'day-rules'], ['What is on for this evening?', 'tasks-later'],
    ['Show my countdowns', 'countdowns'], ['Show my journal numbers', 'journal-numbers'], ['Show the templates', 'templates'], ['Show the priority matrix', 'priority-matrix'], ['Show today\'s hours', 'hour-grid'],
    ['When is my next review?', 'reviews'], ['Show my milestones', 'milestones'], ['Show my cash flow', 'cash-flow'], ['Show my accounts and debts', 'accounts'], ['Show the debt plan', 'debt-plan'],
    ['Show my savings challenges', 'savings-challenges'], ['Show my price alerts', 'price-alerts'], ['Wat staat er voor vanavond?', 'tasks-later'],
  ];
  it.each(tour)('"%s" makes %s', (question, id) => { expect(ids(question)).toContain(id); });
  it('"door de tijd" is about history, not the clock', () => {
    expect(ids('Laat mijn vermogen door de tijd zien')).toEqual(['net-worth-history']);
    expect(ids('Hoe laat is het?')).toContain('time'); // the clock still answers its own words
    expect(ids('Laat de tijd zien')).toContain('time');
  });
});
