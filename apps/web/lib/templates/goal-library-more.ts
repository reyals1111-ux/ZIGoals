import type {LibraryTemplate, TemplateHabit} from './goal-library';
import {LIBRARY_GOALS} from './library-goals';

/**
 * Session AK (F5a, items 2 and 5): more goal templates for the library (lib/templates/goal-library.ts joins them in, in
 * life-area order). The same rules as the library's own: a money template never suggests a sum, a rate or a date (the
 * amount is always the person's own); a count is named only as milestones the person can change.
 *
 * The savings challenges (ids in lib/savings-challenges/challenges.ts CHALLENGE_TEMPLATES) start a goal whose page then
 * shows the challenge's schedule and progress from the person's own contributions and money log; nothing moves money.
 *
 * EXTENSION POINT: `BUILD_LIST_2_TEMPLATES` below takes the winners of the competitor research's BUILD list 2 (F3) as
 * plain `LibraryTemplate` entries; nothing else needs to change (the gallery, search, ZIGi's template lookup and the
 * command palette read GOAL_LIBRARY). Each id must be new and match /^[a-z0-9-]{1,60}$/ (goal extras' `template`);
 * lib/templates/goal-library.test.ts checks ids, areas, kinds and the money words.
 */
const h = (title: string, schedule: TemplateHabit['schedule'], why: string): TemplateHabit => ({title, schedule, why});

export const SAVINGS_CHALLENGE_TEMPLATES: readonly LibraryTemplate[] = [
  {id: 'challenge-52-week', title: '52-week savings challenge', area: 'wealth', kind: 'value', summary: 'Put aside a little more each week for a year: one step in week 1, two in week 2, up to 52. You choose the step; the year adds up to 1,378 steps.', milestones: ['Week 13: a quarter of the way', 'Week 26: halfway', 'Week 39: three quarters', 'Week 52: done'], keywords: ['challenge', '52 week', 'weekly', 'savings', 'saving']},
  {id: 'challenge-no-spend-days', title: 'No-spend days', area: 'wealth', kind: 'project', summary: 'Days with nothing spent beyond what was already planned. You mark each day; your money log keeps it honest.', milestones: ['5 no-spend days', '10 no-spend days', '20 no-spend days', '30 no-spend days'], habits: [h('No-spend day', 'three-a-week', 'Pick the days that are easiest for you.')], keywords: ['challenge', 'frugal', 'budget', 'spending', 'no spend']},
  {id: 'challenge-round-ups', title: 'Round-ups by hand', area: 'wealth', kind: 'value', summary: 'Round each purchase you log up to the next whole amount, and move the difference to savings yourself, once a week.', milestones: ['First week of round-ups moved', 'Four weeks in a row', 'Three months of round-ups'], habits: [h('Log today’s spending', 'daily', 'The round-ups come from what you log.')], keywords: ['challenge', 'round up', 'spare change', 'savings']},
];

export const MORE_TEMPLATES: readonly LibraryTemplate[] = [
  // Wealth
  {id: 'debt-free', title: 'Become debt-free', area: 'wealth', kind: 'project', summary: 'List every debt, choose an order, and clear them one by one.', milestones: ['List my debts', 'Choose a payoff order', 'First debt cleared', 'Half cleared', 'Debt-free'], habits: [h('Check spending', 'weekdays', 'Two minutes a day keeps it honest.')], keywords: ['debt', 'loan', 'credit card', 'snowball', 'avalanche', 'pay off']},
  {id: 'fi-number', title: 'Know my financial freedom number', area: 'wealth', kind: 'project', summary: 'Work out what your investments would need to cover a year of your spending, then set a first milestone toward it.', milestones: ['Add up a year of spending', 'Try the freedom model', 'Set a first milestone', 'Review in a year'], keywords: ['fire', 'retire', 'retirement', 'independence', 'freedom']},
  {id: 'yearly-bill', title: 'A yearly bill, ready in time', area: 'wealth', kind: 'value', summary: 'Set a little aside each month for a bill that comes once a year, so it is ready when it is due.', milestones: ['Know the amount and the date', 'Half put aside', 'Ready before it is due'], keywords: ['insurance', 'annual', 'bill', 'sinking fund', 'tax']},
  // Health
  {id: 'mobility-30', title: 'Thirty days of mobility', area: 'health', kind: 'project', summary: 'A few minutes of stretching every day for a month.', milestones: ['10 days', '20 days', '30 days'], habits: [h('Ten minutes of stretching', 'daily', 'Little and often loosens up.')], keywords: ['stretching', 'flexibility', 'yoga', 'mobility']},
  // Habits & Mind
  {id: 'deep-work', title: 'Deep work most weekdays', area: 'mind', kind: 'project', summary: 'One focused hour on what matters, phone away.', milestones: ['First week', 'Two weeks', 'A month'], habits: [h('One focused hour', 'weekdays', 'One task, no notifications.')], keywords: ['focus', 'concentration', 'productivity']},
  // Relationships
  {id: 'thank-you-notes', title: 'Write five thank-you notes', area: 'relationships', kind: 'project', summary: 'Tell five people what they did for you.', milestones: ['First note', 'Three notes', 'Five notes'], keywords: ['gratitude', 'letters', 'kindness']},
  // Career
  {id: 'give-a-talk', title: 'Give a talk', area: 'career', kind: 'project', summary: 'From a topic you care about to a talk in front of people.', milestones: ['Choose a topic', 'Write the outline', 'Practise in front of a friend', 'Give the talk'], keywords: ['presentation', 'speaking', 'conference', 'meetup']},
];

/**
 * EXTENSION POINT for BUILD list 2's winners (see above). Backlog #15 (AL-COMPETITOR-GAP-118, the curated template
 * library) fills it with the goals in lib/templates/library-goals.ts.
 */
export const BUILD_LIST_2_TEMPLATES: readonly LibraryTemplate[] = LIBRARY_GOALS;
