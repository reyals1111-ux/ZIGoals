import {addLocalDays} from '../local-date';
import {journalSchema, type Journal} from './schema';

/** Session AI: the Showcase's fictional journal for the last two weeks, with energy ratings and ZIGi's questions answered. */
export function showcaseJournal(day: string): Journal {
  const rows: [number, string, number, string?, string?][] = [ // offset, text, (unused: energy lives in lib/energy), question, answer
    [0, 'Calm start, a long walk before work. Grateful for the sunshine.', 4, 'Who or what made that moment possible?', 'The dog, honestly. And leaving my phone at home.'],
    [-1, 'Tired after a late night; the meeting ran long and I skipped the gym.', 2, 'What helped you rest the last time you slept well?', 'Reading instead of scrolling.'],
    [-2, 'Good progress on the Japan fund. Proud of saying no to takeaway.', 4],
    [-3, 'Work was busy, deadline stress. A short run helped.', 3, 'What is one small thing within your control tomorrow?', 'Blocking an hour without meetings.'],
    [-5, 'Dinner with friends, laughed a lot.', 5],
    [-6, 'Slept badly again, tired all day.', 2],
    [-8, 'Quiet Sunday. Meal-prepped and read.', 4],
    [-9, 'Stressful day at work, too many meetings.', 2],
    [-11, 'Ran 5 km without stopping for the first time. Proud.', 5],
    [-12, 'Tired, but kept the meditation streak going.', 3],
  ];
  const entries = rows.map(([offset, text, , question, answer], i) => ({id: `showcase-journal-${i}`, date: addLocalDays(day, offset), text: `${text} (SHOWCASE DATA)`, createdAt: `${addLocalDays(day, offset)}T21:00:00.000Z`,
    ...(question ? {followUp: {question, from: 'device' as const, ...(answer ? {answer, answeredAt: `${addLocalDays(day, offset)}T21:05:00.000Z`} : {})}} : {})})).reverse();
  return journalSchema.parse({version: 1, entries, shareWithAi: false, followUps: true});
}
