import {addLocalDays} from '../local-date';
import {journalSchema, type Journal} from './schema';

/** Session AI: the Showcase's fictional journal for the last two weeks, with energy ratings and ZIGi's questions answered. */
export function showcaseJournal(day: string): Journal {
  const rows: [number, string, number, string?, string?, string?][] = [ // offset, text, (unused: energy lives in lib/energy), question, answer
    [0, 'Calm start, a long walk before work. Grateful for the sunshine.', 4, 'Who or what made that moment possible?', 'The dog, honestly. And leaving my phone at home.'],
    [-1, 'Tired after a late night; the meeting ran long and I skipped the gym.', 2, 'What helped you rest the last time you slept well?', 'Reading instead of scrolling.'],
    [-2, 'Good progress on the Japan fund. Proud of saying no to takeaway.', 4],
    [-3, 'Work was busy, deadline stress. A short run helped.', 3, 'What is one small thing within your control tomorrow?', 'Blocking an hour without meetings.'],
    [-5, 'Dinner with friends, laughed a lot.', 5],
    [-6, 'Slept badly again, tired all day.', 2],
    // Session AV (follow-up 1, F-GOOD-THINGS): one entry made with "Three good things".
    [-8, 'A good thing today: a quiet Sunday morning\nAnother good thing: meal-prepped for the week\nOne more: finished my book', 4, undefined, undefined, 'three-good-things'],
    [-9, 'Stressful day at work, too many meetings.', 2],
    [-11, 'Ran 5 km without stopping for the first time. Proud.', 5],
    [-12, 'Tired, but kept the meditation streak going.', 3],
  ];
  const entries = rows.map(([offset, text, , question, answer, template], i) => ({id: `showcase-journal-${i}`, date: addLocalDays(day, offset), text: `${text} (SHOWCASE DATA)`, createdAt: `${addLocalDays(day, offset)}T21:00:00.000Z`, ...(template ? {template} : {}),
    ...(question ? {followUp: {question, from: 'device' as const, ...(answer ? {answer, answeredAt: `${addLocalDays(day, offset)}T21:05:00.000Z`} : {})}} : {})})).reverse();
  // Session AV (follow-up 1, F-JOURNAL-TAGS): a few tags, so the filter by tag shows in the Showcase.
  const TAGS: Record<number, string[]> = {0: ['outdoors', 'gratitude'], 3: ['work'], 7: ['work'], 8: ['running', 'proud']};
  const tagged = entries.map(e => { const i = Number(e.id.slice('showcase-journal-'.length)); return TAGS[i] ? {...e, tags: TAGS[i]} : e; })
    // Session AV lane 2 (journal; LEDGER #43): the two run entries sit in a second journal, labelled as an example.
    .map(e => e.id === 'showcase-journal-8' || e.id === 'showcase-journal-3' ? {...e, journal: 'j-showcaseruns'} : e);
  // Session AV (F-OWN-TEMPLATES): one template of the Showcase's own, labelled as an example.
  return journalSchema.parse({version: 1, entries: tagged, shareWithAi: false, followUps: true, templates: [{id: 'own-showcase01', title: 'Example · Run diary', headings: ['How the run went:', 'What I noticed on the way:']}],
    // Session AV lane 2 (journal; LEDGER #40): the reminder to write, on at 21:00 every day (the Showcase sends no notification).
    reminder: {on: true, time: '21:00', days: 127},
    journals: [{id: 'j-showcaseruns', name: 'Example · Runs', theme: 'teal'}]});
}
