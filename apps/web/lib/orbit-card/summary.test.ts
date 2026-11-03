import {describe, expect, test} from 'vitest';
import {MAX_NEXT, orbitSummary, type OrbitCandidate} from './summary';
import {TODAY_CARD_IDS, emptyTodayCards, shownCards, toggleCard} from '../today-cards/store';

const c = (key: string, over: Partial<OrbitCandidate> = {}): OrbitCandidate => ({key, pillar: 'habits', label: key, time: null, href: '/app/habits', done: false, ...over});

describe('8.2 the Daily orbit card: the day across pillars, read only', () => {
  test('the Checklist\'s count wins when the person keeps a path; next items by time, then anytime, then earlier', () => {
    const s = orbitSummary({checklist: {done: 2, total: 5}, now: '12:00', contributionsDue: 1, candidates: [
      c('habit:walk', {label: 'Walk', time: '08:00'}),
      c('habit:read', {label: 'Read', time: '21:00'}),
      c('health:water', {pillar: 'health', label: 'Water', href: '/app/health'}),
      c('contribution:7', {pillar: 'wealth', label: 'House deposit', href: '/app/goals/tracked/7?contribute=1'}),
      c('habit:stretch', {label: 'Stretch', time: '13:30'}),
      c('habit:done', {label: 'Done one', time: '12:30', done: true}),
    ]});
    expect(s.source).toBe('checklist');
    expect([s.done, s.total]).toEqual([2, 5]);
    expect(s.next.map(n => [n.label, n.when])).toEqual([['Stretch', 'next'], ['Read', 'later'], ['Water', 'anytime']]);
    expect(s.next).toHaveLength(MAX_NEXT);
    expect(s.line).toBe('2 of 5 planets lit. Next: Stretch at 13:30. 1 contribution is due today.');
  });
  test('without a path: today\'s due habits are the count; a passed time comes last, as "earlier"', () => {
    const s = orbitSummary({checklist: null, now: '20:00', contributionsDue: 0, candidates: [c('habit:a', {label: 'A', time: '07:00'}), c('habit:b', {label: 'B', done: true})]});
    expect(s.source).toBe('habits');
    expect([s.done, s.total]).toEqual([1, 2]);
    expect(s.next.map(n => n.when)).toEqual(['earlier']);
    expect(s.line).toBe('1 of 2 habits done. Next: A at 07:00.');
  });
  test('a key shows once (a starred habit and the same due habit); the first source wins', () => {
    const s = orbitSummary({checklist: {done: 0, total: 1}, now: '09:00', contributionsDue: 0, candidates: [c('habit:x', {label: 'From the path', pillar: 'habits'}), c('habit:x', {label: 'From Habits', time: '10:00'})]});
    expect(s.next.map(n => n.label)).toEqual(['From the path']);
  });
  test('complete and empty days, calmly', () => {
    expect(orbitSummary({checklist: {done: 3, total: 3}, now: '18:00', contributionsDue: 0, candidates: []}).line).toBe('3 of 3 planets lit. Your orbit is complete for today.');
    const none = orbitSummary({checklist: {done: 0, total: 0}, now: '18:00', contributionsDue: 2, candidates: []});
    expect(none.source).toBe('none');
    expect(none.line).toBe('Nothing counted yet today. 2 contributions are due today.');
    expect(orbitSummary({checklist: null, now: 'nonsense', contributionsDue: -3, candidates: [c('habit:a', {time: '25:99'})]})).toMatchObject({contributionsDue: 0, next: [{when: 'anytime', time: null}]});
  });
  test('copy holds no guilt words', () => {
    const s = orbitSummary({checklist: {done: 0, total: 4}, now: '23:00', contributionsDue: 3, candidates: [c('habit:a', {time: '07:00'})]});
    expect(s.line).not.toMatch(/missed|behind|late|fail|should|overdue/i);
  });
});

describe('8.2 registered as a Today card kept on this device', () => {
  test('the id `orbit`, last, so earlier orders hold; off until chosen', () => {
    expect(TODAY_CARD_IDS.at(-1)).toBe('orbit');
    expect(shownCards(emptyTodayCards())).toEqual([]);
    expect(shownCards(toggleCard(emptyTodayCards(), 'orbit'))).toEqual(['orbit']);
  });
});
