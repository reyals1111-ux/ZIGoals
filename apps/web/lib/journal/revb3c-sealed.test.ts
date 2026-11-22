import {describe, expect, test} from 'vitest';
import {isSealed, unsealed} from './letters';
import {journalLines, journalMemories, journalToday} from './today';
import {journalSchema, type Journal} from './schema';

/**
 * Session AV lane 2 (review B3C-2/3/4/14): a letter whose day to open is still to come stays folded everywhere until its
 * day; every place reads through the one `isSealed` / `unsealed`. Fictional entries.
 */
const TODAY = '2026-11-22';
const SECRET = 'fictional-secret-words';
const sealedJournal = (more: Partial<Journal> = {}): Journal => journalSchema.parse({version: 1, shareWithAi: true, followUps: true, ...more, entries: [
  // Written a month ago, opens in six months: "On this day · A month ago" would match it.
  {id: 'month', date: '2026-10-22', text: `Dear future me, ${SECRET} from a month ago.`, createdAt: '2026-10-22T20:00:00.000Z', template: 'letter-future-you', opensOn: '2027-04-22'},
  // Written a year ago, opens in two years: its first anniversary is today.
  {id: 'year', date: '2025-11-22', text: `Dear future me, ${SECRET} from last year.`, createdAt: '2025-11-22T20:00:00.000Z', template: 'letter-future-you', opensOn: '2027-11-22'},
  // Written today, opens next year.
  {id: 'today', date: TODAY, text: `Dear future me, ${SECRET} from today.`, createdAt: '2026-11-22T08:00:00.000Z', template: 'letter-future-you', opensOn: '2027-11-22', followUp: {question: 'A fictional question?', from: 'device', answer: `${SECRET} in the answer`}},
  // An ordinary entry a year ago, and a letter that opened today.
  {id: 'plain', date: '2025-11-22', text: 'A fictional plain entry from last year.', createdAt: '2025-11-22T21:00:00.000Z'},
  {id: 'opened', date: '2024-11-22', text: 'Dear future me, a fictional letter that opens today.', createdAt: '2024-11-22T20:00:00.000Z', template: 'letter-future-you', opensOn: TODAY},
  ...(more.entries ?? []),
]});

describe('the one rule', () => {
  test('sealed until its day, open on it', () => {
    expect(isSealed({opensOn: '2026-11-23'}, TODAY)).toBe(true);
    expect(isSealed({opensOn: TODAY}, TODAY)).toBe(false);
    expect(isSealed({}, TODAY)).toBe(false);
    expect(unsealed(sealedJournal().entries, TODAY).map(e => e.id)).toEqual(['plain', 'opened']);
  });
});
describe('B3C-2: On this day and Today’s line', () => {
  test('the Journal’s On this day leaves sealed letters out, on their anniversary and a month on', () => {
    const ids = journalMemories(sealedJournal().entries, TODAY).map(m => m.entry.id);
    expect(ids).toEqual(['plain', 'opened']);
    // A month on: only the sealed letter would match, so nothing shows.
    expect(journalMemories(sealedJournal().entries.filter(e => e.id === 'month'), TODAY)).toEqual([]);
    // On the day the letter opens it is an ordinary memory again.
    expect(journalMemories(sealedJournal().entries, '2027-11-22').map(m => m.entry.id)).toContain('year');
  });
  test('Today: the letter written today is counted, but no sealed letter’s first line is shown', () => {
    const day = journalToday(sealedJournal(), TODAY, {shown: true});
    expect(day.today.map(e => e.id)).toEqual(['today']);
    expect(day.memories.map(m => m.entry.id)).toEqual(['plain', 'opened']);
    const lines = journalLines(day, TODAY);
    expect(lines.map(l => l.id)).toEqual(['plain', 'opened']);
    expect(JSON.stringify(lines)).not.toContain(SECRET);
  });
});
