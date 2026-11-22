import {describe, expect, test} from 'vitest';
import {isSealed, unsealed} from './letters';
import {journalLines, journalMemories, journalToday} from './today';
import {answersTo, promptsUsed} from './prompt-answers';
import {journalTool} from '../ai/tools/journal-ai';
import type {ToolEnv} from '../ai/tools/env';
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
describe('B3C-3: Every answer to a prompt', () => {
  test('a sealed letter gives no words, only its day to open; on that day its words are there', () => {
    const got = answersTo(sealedJournal(), 'letter-future-you', 'en', TODAY)!;
    expect(JSON.stringify(got)).not.toContain(SECRET);
    expect(got.entries).toBe(1); // the letter that opened today
    expect(got.sealed).toEqual(['2027-04-22', '2027-11-22', '2027-11-22']);
    expect(got.headings[0]!.answers.map(a => a.entryId)).toEqual(['opened']);
    const later = answersTo(sealedJournal(), 'letter-future-you', 'en', '2027-11-22')!;
    expect(later.sealed).toEqual([]);
    expect(JSON.stringify(later)).toContain(SECRET);
  });
  test('the list of prompts counts the letters but holds no words', () => {
    const used = promptsUsed(sealedJournal());
    expect(used).toEqual([{id: 'letter-future-you', title: 'A letter to future you', count: 4, own: false}]);
    expect(JSON.stringify(used)).not.toContain(SECRET);
  });
});
describe('B3C-4: ZIGi’s and NOVA’s journal tool', () => {
  const run = (journal: Journal, days = 30) => journalTool.run({days}, {journal, habitDay: TODAY, energy: null, showcase: false} as unknown as ToolEnv, 'Journal');
  test('a sealed letter’s words, follow-up and answer never appear; it is counted', () => {
    const out = run(sealedJournal());
    expect(out.ok).toBe(true);
    const data = (out as {data: {entries: {date: string; text: string}[]; lettersFoldedAway?: number; lettersNote?: string}}).data;
    expect(JSON.stringify(out)).not.toContain(SECRET);
    expect(JSON.stringify(out)).not.toContain('A fictional question?');
    expect(data.entries.map(e => e.date)).toEqual([]); // the plain entry and the opened letter are older than 30 days
    expect(data.lettersFoldedAway).toBe(1); // today's letter (the one of a month ago is 31 days back)
    expect(data.lettersNote).toMatch(/^1 letter to open later is folded away until its day: never quote/);
  });
  test('an open letter and an ordinary entry are read as before; no note when nothing is folded', () => {
    const j = sealedJournal({entries: [{id: 'week', date: '2026-11-20', text: 'A fictional week entry.', createdAt: '2026-11-20T20:00:00.000Z'}]});
    const week = run({...j, entries: j.entries.filter(e => !e.opensOn || e.opensOn <= TODAY)}, 7) as {data: Record<string, unknown>};
    expect(week.data.entries).toEqual([{date: '2026-11-20', text: 'A fictional week entry.'}]);
    expect(week.data).not.toHaveProperty('lettersFoldedAway');
    // On the day it opens, the letter written today a year before is read like any entry.
    const later = journalTool.run({days: 7}, {journal: j, habitDay: '2027-11-22', energy: null, showcase: false} as unknown as ToolEnv, 'Journal');
    expect(JSON.stringify(later)).not.toContain(SECRET); // older than the 7 days asked
    const atDay = journalTool.run({days: 30}, {journal: {...j, entries: [...j.entries, {id: 'x', date: '2027-11-01', text: `${SECRET} opens`, createdAt: '2027-11-01T08:00:00.000Z', opensOn: '2027-11-22'}]}, habitDay: '2027-11-22', energy: null, showcase: false} as unknown as ToolEnv, 'Journal');
    expect(JSON.stringify(atDay)).toContain(`${SECRET} opens`);
  });
  test('with sharing off, still only the count of entries', () => {
    const out = run(sealedJournal({shareWithAi: false})) as {data: Record<string, unknown>};
    expect(out.data).toMatchObject({private: true, entriesOnThisDevice: 5});
    expect(JSON.stringify(out)).not.toContain(SECRET);
  });
});
