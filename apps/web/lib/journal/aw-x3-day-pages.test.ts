import {describe, expect, test} from 'vitest';
import {DAY_PAGE_TEMPLATE, DEFAULT_MORNING, EVENING_QUESTIONS, dayPageOf, dayPageText, morningPlanInput, morningQuestions, morningReminderOf, partAnswers, partToOpen, partWritten, withDayPages, withMorningReminder, writePart} from './day-pages';
import {reminderPlanInput} from './reminder';
import {emptyJournal, journalSchema, type Journal} from './schema';
import {undoEntryChange} from './versions';

/**
 * Session AW (x3; LEDGER #444, The Five Minute Journal): one day's entry in two parts — the morning page with its
 * questions, the evening page showing what the morning said — each with its own reminder; the day stays one entry, its
 * text holds both pages, and every stored change reads on its own (older records and unreadable values).
 */
const DAY = '2026-11-25', AT = '2026-11-25T07:40:00.000Z', EVE = '2026-11-25T21:10:00.000Z';
const on = (j: Journal = emptyJournal()) => withDayPages(j, {on: true});
describe('the stored format (TIER 3, additive)', () => {
  test('a journal of an older build reads as before: no day pages, no morning reminder', () => {
    const old = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [{id: 'a', date: DAY, text: 'x', createdAt: AT}]});
    expect(old.dayPages).toBeUndefined(); expect(old.morningReminder).toBeUndefined(); expect(old.entries[0]!.parts).toBeUndefined();
  });
  test('a value this build cannot read is dropped, never failing the journal; a later build’s fields are kept', () => {
    const j = journalSchema.parse({...emptyJournal(), dayPages: {on: 'yes'}, morningReminder: {on: true, time: '7am', days: 127}, entries: [{id: 'a', date: DAY, text: 'x', createdAt: AT, parts: {morning: [{q: 'Q', a: 'A'}, {q: '', a: 'bad'}, 'odd'], later: 1}}]});
    expect(j.dayPages).toBeUndefined(); expect(j.morningReminder).toBeUndefined();
    expect(j.entries[0]!.parts).toEqual({morning: [{q: 'Q', a: 'A'}], later: 1});
    expect(journalSchema.parse({...emptyJournal(), dayPages: {on: true, questions: [], future: true}}).dayPages).toEqual({on: true, future: true});
  });
});
describe('morning and evening', () => {
  test('off until switched on; the usual questions, or the person’s own, one a line', () => {
    expect(emptyJournal().dayPages).toBeUndefined();
    expect(morningQuestions(on(), 'en')).toEqual(DEFAULT_MORNING.en);
    expect(morningQuestions(on(), 'nl')).toEqual(DEFAULT_MORNING.nl);
    expect(DEFAULT_MORNING.en).toContain('What would make today great?');
    const own = withDayPages(on(), {questionsText: '  One thing I look forward to \n\nWho can I thank today?'});
    expect(morningQuestions(own, 'en')).toEqual(['One thing I look forward to', 'Who can I thank today?']);
    expect(withDayPages(own, {questionsText: ''}).dayPages).toEqual({on: true});
    expect(() => withDayPages(on(), {questionsText: 'a\nb\nc\nd\ne\nf'})).toThrow('Up to 5 morning questions.');
    expect(withDayPages(own, {on: false}).dayPages).toEqual({on: false, questions: ['One thing I look forward to', 'Who can I thank today?']});
  });
  test('the morning page makes the day’s entry; the evening page changes the same entry and keeps the words before', () => {
    const m = writePart(on(), {day: DAY, part: 'morning', answers: [{q: 'I am grateful for…', a: ' Fictional coffee with Anna '}, {q: 'What would make today great?', a: ''}], lang: 'en', now: AT, id: 'e1'});
    expect(m.undo).toEqual({kind: 'made', entryId: 'e1'});
    expect(m.entry).toMatchObject({id: 'e1', date: DAY, template: DAY_PAGE_TEMPLATE, createdAt: AT, text: 'Morning page\nI am grateful for…\nFictional coffee with Anna'});
    expect(partWritten(m.journal, DAY, 'morning')).toBe(true); expect(partWritten(m.journal, DAY, 'evening')).toBe(false);
    expect(partAnswers(dayPageOf(m.journal, DAY), 'morning')).toEqual([{q: 'I am grateful for…', a: 'Fictional coffee with Anna'}]);
    const e = writePart(m.journal, {day: DAY, part: 'evening', answers: [{q: EVENING_QUESTIONS.en[0]!, a: 'A fictional walk.'}], lang: 'en', now: EVE, id: 'unused'});
    expect(e.journal.entries).toHaveLength(1);
    expect(e.entry.text).toBe('Morning page\nI am grateful for…\nFictional coffee with Anna\n\nEvening page\nWhat went well today?\nA fictional walk.');
    expect(e.entry.updatedAt).toBe(EVE);
    expect(e.journal.versions).toEqual([expect.objectContaining({entryId: 'e1', text: 'Morning page\nI am grateful for…\nFictional coffee with Anna'})]);
    // Undo puts the entry back as it was, its parts included.
    if (e.undo.kind !== 'changed') throw new Error('expected a change');
    const back = undoEntryChange(e.journal, e.undo.undo);
    expect(back.entries[0]).toEqual(m.entry); expect(back.versions ?? []).toEqual([]);
  });
  test('at least one answer, and the day’s words within the entry’s room', () => {
    expect(() => writePart(on(), {day: DAY, part: 'morning', answers: [{q: 'Q', a: '  '}], lang: 'en', now: AT, id: 'e1'})).toThrow('Write at least one answer first.');
    expect(() => writePart(on(), {day: DAY, part: 'morning', answers: [{q: 'Q', a: 'x'.repeat(901)}], lang: 'en', now: AT, id: 'e1'})).toThrow('An answer holds at most 900 characters.');
    const long = Array.from({length: 5}, (_, i) => ({q: `Q${i}`, a: 'y'.repeat(900)}));
    const first = writePart(on(), {day: DAY, part: 'morning', answers: long, lang: 'en', now: AT, id: 'e1'});
    expect(() => writePart(first.journal, {day: DAY, part: 'evening', answers: long, lang: 'en', now: EVE, id: 'x'})).toThrow(/holds at most 5,000 characters/);
  });
  test('a letter of that day is never the day’s page; the part to open follows the morning and the hour', () => {
    const j = journalSchema.parse({...on(), entries: [{id: 'l', date: DAY, text: 'x', createdAt: AT, template: DAY_PAGE_TEMPLATE, opensOn: '2027-01-01'}]});
    expect(dayPageOf(j, DAY)).toBeNull();
    expect(partToOpen(j, DAY, 8)).toBe('morning'); expect(partToOpen(j, DAY, 16)).toBe('evening');
    const m = writePart(on(), {day: DAY, part: 'morning', answers: [{q: 'Q', a: 'A'}], lang: 'nl', now: AT, id: 'e1'});
    expect(m.entry.text).toBe('Ochtendpagina\nQ\nA');
    expect(partToOpen(m.journal, DAY, 8)).toBe('evening');
  });
});
describe('two reminders, both off until chosen', () => {
  test('the morning page’s reminder: off at 07:30 every day until set; a time and days that read', () => {
    expect(morningReminderOf(emptyJournal())).toEqual({on: false, time: '07:30', days: 127});
    const j = withMorningReminder(on(), {on: true, time: '06:45'});
    expect(j.morningReminder).toEqual({on: true, time: '06:45', days: 127});
    expect(() => withMorningReminder(j, {days: 0})).toThrow('Keep at least one day.');
    expect(() => withMorningReminder(j, {time: '6'})).toThrow('Choose a time, for example 07:30.');
  });
  test('the plan gets the morning wake only while both are on; quiet once the morning page is written', () => {
    const j = withMorningReminder(on(), {on: true, time: '07:15'});
    expect(morningPlanInput(withMorningReminder(emptyJournal(), {on: true}), DAY)).toBeNull();
    expect(morningPlanInput(withDayPages(j, {on: false}), DAY)).toBeNull();
    expect(morningPlanInput(j, DAY)).toEqual({time: '07:15', weekdays: 127, written: []});
    const written = writePart(j, {day: DAY, part: 'morning', answers: [{q: 'Q', a: 'A'}], lang: 'en', now: AT, id: 'e1'}).journal;
    expect(morningPlanInput(written, DAY)).toEqual({time: '07:15', weekdays: 127, written: [DAY]});
  });
  test('with day pages on, the reminder to write is the evening page’s: the morning page alone does not quiet it', () => {
    const j = journalSchema.parse({...on(), reminder: {on: true, time: '21:00', days: 127}});
    const morning = writePart(j, {day: DAY, part: 'morning', answers: [{q: 'Q', a: 'A'}], lang: 'en', now: AT, id: 'e1'}).journal;
    expect(reminderPlanInput(morning, DAY)).toEqual({time: '21:00', weekdays: 127, written: [], streak: 1, part: 'evening'});
    const evening = writePart(morning, {day: DAY, part: 'evening', answers: [{q: 'Q', a: 'B'}], lang: 'en', now: EVE, id: 'x'}).journal;
    expect(reminderPlanInput(evening, DAY)).toMatchObject({written: [DAY], part: 'evening'});
    // Off: as before (any entry that day quiets it).
    expect(reminderPlanInput(withDayPages(morning, {on: false}), DAY)).toEqual({time: '21:00', weekdays: 127, written: [DAY], streak: 1});
  });
  test('both pages in words, each answer under its question', () => {
    expect(dayPageText({morning: [{q: 'A?', a: ''}], evening: [{q: 'B?', a: 'b'}]}, 'en')).toBe('Evening page\nB?\nb');
    expect(dayPageText({}, 'en')).toBe('');
  });
});
