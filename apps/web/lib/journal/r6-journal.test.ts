import {describe, expect, test} from 'vitest';
import {emptyJournal, journalSchema, type Journal} from './schema';
import {daysMet, goalLine, readGoal, setWordGoal, wordsOn} from './word-goal';
import {cleanPerson, peopleCounts, personMatches, withPerson, withoutPerson} from './people';
import {filterEntries} from './search';
import {onDate, throwbacks} from '../on-this-day/throwback';
import {galleryCount, galleryItems, galleryYears} from './gallery';
import {moonOn, readCoordinates, skyLine, skyPlace, sunOn} from './sky';
import {applyJournalImport, csvRows, isJourneyJson, planJournalImport, readCsvFile, readJourneyJson, undoJournalImport} from './import';
import {wallClock} from '../zone-time';

/**
 * Session AV lane 2 (r6-notes; LEDGER #400, #401, #403, #404, #409, #410; Diarium): a daily word goal, people in an
 * entry, on this day for any day, every photo in one place, sunrise and the moon, and imports from Journey and a CSV.
 */
const AT = '2026-11-20T09:00:00.000Z', TODAY = '2026-11-22';
const j = (entries: unknown[], extra: Record<string, unknown> = {}): Journal => journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries, ...extra});

describe('#400 a daily word goal', () => {
  const journal = j([
    {id: 'a', date: '2026-11-21', text: 'one two three four five six', createdAt: AT},
    {id: 'b', date: '2026-11-21', text: 'seven eight nine ten', createdAt: AT},
    {id: 'c', date: '2026-11-22', text: 'only three words', createdAt: AT}]);
  test('today’s words against the goal, calm either way; the days it was met', () => {
    expect(wordsOn(journal.entries, '2026-11-21')).toBe(10);
    expect([...daysMet(journal.entries, 10)]).toEqual(['2026-11-21']);
    expect(daysMet(journal.entries, null).size).toBe(0);
    expect(goalLine(3, 10)).toEqual({text: '3 of 10 words today.', met: false});
    expect(goalLine(12, 10)).toEqual({text: '12 words today: your 10 are written.', met: true});
    expect(goalLine(3, 10).text).not.toMatch(/behind|miss|only|fail/i);
  });
  test('set, changed and taken off; a goal outside 10 to 5,000 refused in words', () => {
    expect(setWordGoal(journal, 200).wordGoal).toBe(200);
    expect('wordGoal' in setWordGoal(setWordGoal(journal, 200), null)).toBe(false);
    expect(readGoal('200')).toBe(200); expect(readGoal('5')).toMatch(/between 10 and 5,000/); expect(readGoal('')).toMatch(/whole number/);
  });
});
describe('#401 people in an entry', () => {
  const journal = j([
    {id: 'a', date: '2026-11-20', text: 'A fictional walk.', createdAt: AT, people: ['Anna de Vries', 'Bram']},
    {id: 'b', date: '2026-11-21', text: 'A fictional dinner.', createdAt: '2026-11-21T09:00:00.000Z', people: ['anna de vries']},
    {id: 'l', date: '2026-11-21', text: 'A fictional letter.', createdAt: '2026-11-21T10:00:00.000Z', people: ['Anna de Vries'], opensOn: '2027-01-01'},
    {id: 'c', date: '2026-11-22', text: 'Annabel is a word here.', createdAt: '2026-11-22T09:00:00.000Z'}]);
  test('added once (case aside), up to eight, taken off; names counted for offering again', () => {
    const e = journal.entries[0]!;
    expect(withPerson(e, '  ANNA de VRIES ')).toBe(e);
    expect(withPerson(e, 'Cas').people).toEqual(['Anna de Vries', 'Bram', 'Cas']);
    expect(withoutPerson(e, 'bram').people).toEqual(['Anna de Vries']);
    expect('people' in withoutPerson(withoutPerson(e, 'bram'), 'Anna de Vries')).toBe(false);
    expect(cleanPerson('123')).toBeNull();
    let full = e; for (let i = 0; i < 10; i++) full = withPerson(full, `P${i}x`);
    expect(full.people).toHaveLength(8);
    expect(peopleCounts(journal.entries)[0]).toEqual({name: 'Anna de Vries', count: 3});
  });
  test('“Entries with Anna”, and a name found as a word; a letter still folded away never shows its names', () => {
    expect(filterEntries(journal, {person: 'Anna de Vries'}, TODAY).map(e => e.id)).toEqual(['b', 'a']);
    expect(filterEntries(journal, {query: 'anna'}, TODAY).map(e => e.id)).toEqual(['c', 'b', 'a']);
    expect(filterEntries(journal, {query: 'vries'}, TODAY).map(e => e.id)).toEqual(['b', 'a']);
    expect(personMatches(journal.entries[0]!, 'ann')).toBe(false);
    expect(filterEntries(journal, {person: 'Anna de Vries'}, TODAY, new Set(['l'])).map(e => e.id)).toEqual(['l', 'b', 'a']);
  });
});
describe('#403 on this day for any day', () => {
  const entries = [
    {id: 'y1', date: '2025-11-23', text: 'A year before the 23rd.'},
    {id: 'y3', date: '2023-11-23', text: 'Three years before.'},
    {id: 'same', date: '2026-11-23', text: 'Not earlier.'},
    {id: 'sealed', date: '2024-11-23', text: 'Folded.', opensOn: '2027-01-01'},
    {id: 'hid', date: '2022-11-23', text: 'Set aside.'},
    {id: 'leap', date: '2024-02-29', text: 'A leap day.'}];
  test('that date in the years before, nearest first; set aside and folded letters out', () => {
    expect(onDate(entries, '2026-11-23', TODAY, {hidden: ['hid']}).map(i => [i.entry.id, i.label])).toEqual([['y1', 'A year earlier'], ['y3', '3 years earlier']]);
    expect(onDate(entries, '2025-02-28', TODAY).map(i => i.entry.id)).toEqual(['leap']);
    expect(onDate(entries, 'soon', TODAY)).toEqual([]);
  });
  test('today keeps its own memories as before', () => {
    expect(throwbacks(entries, '2026-11-23').map(i => i.entry.id)).toEqual(throwbacks(entries, '2026-11-23').map(i => i.entry.id));
  });
});
describe('#404 every photo and voice note in one place', () => {
  const photos = (n: number, from = 0) => Array.from({length: n}, (_, i) => `m-photo${String(i + from).padStart(3, '0')}`);
  const journal = j([
    {id: 'a', date: '2025-06-01', text: 'Old.', createdAt: '2025-06-01T09:00:00.000Z', photos: photos(1)},
    {id: 'b', date: '2026-11-20', text: 'New.', createdAt: AT, photos: photos(4, 1), morePhotos: photos(1, 5), audio: [{id: 'm-voice0001', seconds: 75}], journal: 'j-trips'},
    {id: 'l', date: '2026-11-21', text: 'Letter.', createdAt: AT, photos: photos(1, 9), opensOn: '2027-01-01'}], {journals: [{id: 'j-trips', name: 'Trips', theme: 'teal'}]});
  test('newest first, a journal and a year chosen; a folded letter’s photos stay folded', () => {
    const all = galleryItems(journal, TODAY);
    expect(all.map(i => [i.entryId, i.kind, i.n, i.of])).toEqual([['b', 'photo', 1, 5], ['b', 'photo', 2, 5], ['b', 'photo', 3, 5], ['b', 'photo', 4, 5], ['b', 'photo', 5, 5], ['b', 'audio', 1, 1], ['a', 'photo', 1, 1]]);
    expect(galleryItems(journal, TODAY, {book: 'main'}).map(i => i.entryId)).toEqual(['a']);
    expect(galleryItems(journal, TODAY, {year: '2025'}).map(i => i.entryId)).toEqual(['a']);
    expect(galleryItems(journal, TODAY, {kind: 'audio'}).map(i => i.mediaId)).toEqual(['m-voice0001']);
    expect(galleryYears(journal, TODAY)).toEqual(['2026', '2025']);
    expect(galleryCount(journal, TODAY)).toEqual({photos: 6, audio: 1});
    expect(galleryItems(journal, '2027-01-01').some(i => i.entryId === 'l')).toBe(true);
  });
});
describe('#409 sunrise, sunset and the moon, worked out on the device', () => {
  test('Amsterdam in late November and midsummer, within a few minutes of the almanac', () => {
    const nov = sunOn('2026-11-22', 52.37, 4.9), jun = sunOn('2026-06-21', 52.37, 4.9);
    if (nov.kind !== 'normal' || jun.kind !== 'normal') throw Error('no sunrise');
    const min = (ms: number) => wallClock(ms, 'Europe/Amsterdam').minutes;
    expect(Math.abs(min(nov.rise) - (8 * 60 + 15))).toBeLessThanOrEqual(5); // almanac: about 08:15 (solar noon 12:27, 8 h 26 min of day)
    expect(Math.abs(min(nov.set) - (16 * 60 + 41))).toBeLessThanOrEqual(5); // about 16:41
    expect(Math.abs(min(jun.rise) - (5 * 60 + 18))).toBeLessThanOrEqual(5); // about 05:18
    expect(Math.abs(min(jun.set) - (22 * 60 + 6))).toBeLessThanOrEqual(5); // about 22:06
  });
  test('the midnight sun and the polar night are said, not made up', () => {
    expect(sunOn('2026-06-21', 78.22, 15.65).kind).toBe('up');
    expect(sunOn('2026-12-21', 78.22, 15.65).kind).toBe('down');
  });
  test('the moon: full on 24 November 2026, new about two weeks on', () => {
    expect(moonOn('2026-11-24').phase).toBe('full');
    expect(moonOn('2026-11-24').lit).toBeGreaterThan(0.95);
    expect(moonOn('2026-12-09').phase).toBe('new');
    expect(moonOn('2026-11-22').phase).toBe('waxing-gibbous');
  });
  test('the place: a city, typed coordinates, the time zone’s city, or off', () => {
    expect(skyPlace({city: 'paris'}, 'UTC')).toMatchObject({name: 'Paris', zone: 'Europe/Paris', from: 'city'});
    expect(skyPlace({lat: 1, lon: 2}, 'Europe/Amsterdam')).toMatchObject({name: '1.00, 2.00', zone: 'Europe/Amsterdam', from: 'typed'});
    expect(skyPlace(undefined, 'Europe/Amsterdam')).toMatchObject({name: 'Amsterdam', from: 'zone'});
    expect(skyPlace(undefined, 'Etc/GMT+3')).toBeNull();
    expect(skyPlace({off: true}, 'Europe/Amsterdam')).toBeNull();
    expect(skyLine('2026-11-24', null)).toMatch(/^Full moon, \d+% lit$/);
    expect(skyLine('2026-11-22', skyPlace({city: 'amsterdam'}, 'UTC'))).toMatch(/^Sunrise 08:\d\d · sunset 16:\d\d in Amsterdam · Waxing gibbous/);
    expect(readCoordinates('52,37', '4.9')).toEqual({lat: 52.37, lon: 4.9});
    expect(readCoordinates('100', '4')).toMatch(/latitude/);
  });
});
describe('#410 imports from Journey and a CSV', () => {
  const journey = {id: 'x1', text: '<p>A fictional <b>day</b> by the sea.</p><p>Second line.</p>', type: 'html', date_journal: Date.UTC(2026, 10, 3, 23, 30), timezone: 'Europe/Amsterdam', tags: ['sea', 'trip'], photos: ['1730677800000-abc.jpg'], favourite: true};
  test('a Journey entry: its day in its own zone, its words from HTML, tags, photos and the star', () => {
    expect(isJourneyJson(JSON.stringify(journey))).toBe(true);
    expect(isJourneyJson(JSON.stringify({entries: []}))).toBe(false);
    const r = readJourneyJson({name: '1730677800000-abc.json', text: JSON.stringify(journey)}, 'UTC');
    expect(r.entries).toEqual([{date: '2026-11-04', text: 'A fictional day by the sea.\nSecond line.', createdAt: '2026-11-03T23:30:00.000Z', tags: ['sea', 'trip'], extra: {star: true}, source: 'journey', photos: ['journey/1730677800000-abc.jpg'], audio: []}]);
    const bad = readJourneyJson({name: 'x.json', text: JSON.stringify([{...journey, date_journal: -1}, {...journey, text: '', photos: []}])}, 'UTC');
    expect(bad.skipped.map(s => s.reason)).toEqual(['it has no date ZIGoals can read', 'it has no words or photo']);
  });
  test('a CSV with a header in Dutch, quotes, line breaks and semicolons; a row without a date left out and said', () => {
    expect(csvRows('a,"b ""c"", d"\n1,2', ',')).toEqual([['a', 'b "c", d'], ['1', '2']]);
    const csv = 'Datum;Tekst;Tags\n2026-11-03;"Een fictieve dag;\nmet twee regels";werk; familie\n3-11-2026;Nog een;\n;Geen datum;\n2026-11-05;;';
    const r = readCsvFile({name: 'dagboek.csv', text: csv}, TODAY);
    expect(r.entries.map(e => [e.date, e.text, e.tags ?? []])).toEqual([['2026-11-03', 'Een fictieve dag;\nmet twee regels', ['werk']], ['2026-11-03', 'Nog een', []]]);
    expect(r.skipped.map(s => s.reason)).toEqual(['it has no date', 'it has no words']);
    const plain = readCsvFile({name: 'x.csv', text: '2026-11-01,First fictional line,"a, b"'}, TODAY);
    expect(plain.entries.map(e => [e.date, e.tags])).toEqual([['2026-11-01', ['a', 'b']]]);
  });
  test('planned first, applied with its photos, and undone in one step; marked by where it came from', () => {
    const files = [{name: 'Journey/x1.json', text: JSON.stringify(journey)}, {name: 'entries.csv', text: 'date,text\n2026-11-02,A fictional row.'}];
    const plan = planJournalImport(emptyJournal(), files, {today: TODAY, zone: 'UTC'});
    expect(plan.entries.map(e => e.source)).toEqual(['csv', 'journey']);
    const out = applyJournalImport(emptyJournal(), plan, new Map([['journey/1730677800000-abc.jpg', 'm-kept000001']]), (() => { let n = 0; return () => `imp-${n++}`; })());
    expect(out.journal.entries.map(e => [e.imported, e.photos ?? [], e.star ?? null])).toEqual([['csv', [], null], ['journey', ['m-kept000001'], true]]);
    expect(undoJournalImport(out.journal, out.undo).entries).toEqual([]);
    expect(planJournalImport(out.journal, files, {today: TODAY, zone: 'UTC'}).entries).toEqual([]);
  });
});
