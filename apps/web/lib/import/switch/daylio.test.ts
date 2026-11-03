import {describe, expect, test} from 'vitest';
import {emptyMoods} from '../../moods/schema';
import {emptyJournal, journalSchema} from '../../journal/schema';
import {daylioClock, daylioRecords, isDaylioHeader, mergeDaylioJournal, mergeDaylioMoods, readDaylio} from './daylio';

// Session AK (A15): Daylio's CSV. Fictional entries.
const HEADER = 'full_date,date,weekday,time,mood,activities,note_title,note';
const CSV = [HEADER,
  '2026-10-02,October 2,Friday,9:15 pm,rad,"friends | movies | friends",Great evening,"Dinner with friends, then a film.<br>Laughed a lot."',
  '2026-10-02,October 2,Friday,8:00 am,meh,work,,',
  '2026-10-01,October 1,Thursday,20:30,Sleepy-ish,,,"=1+1 is a note, not a formula"',
  '2026-10-01,October 1,Thursday,7:00,good,,,',
  '2026-11-30,November 30,Monday,7:00,good,,,"From the future"',
  'not a date,?,?,?,good,,,',
].join('\n');

describe('Daylio CSV', () => {
  test('recognised by its header; times in Daylio’s words', () => {
    expect(isDaylioHeader(HEADER)).toBe(true);
    expect(isDaylioHeader('year,date,weekday,time,mood,activities,note')).toBe(true);
    expect(isDaylioHeader('Date,Payee,Outflow')).toBe(false);
    expect([daylioClock('9:15 pm'), daylioClock('12:05 AM'), daylioClock('20:30'), daylioClock('noonish')]).toEqual(['21:15', '00:05', '20:30', '12:00']);
  });
  test('entries, the five default moods matched, the person’s own words listed, future and unreadable rows skipped', async () => {
    const plan = await readDaylio(CSV, {today: '2026-10-31'});
    expect(plan.entries).toHaveLength(4);
    expect(plan.entries[0]).toEqual({date: '2026-10-02', clock: '21:15', mood: 'rad', activities: ['friends', 'movies'], title: 'Great evening', note: 'Dinner with friends, then a film.\nLaughed a lot.'});
    expect(plan.moods).toEqual(expect.arrayContaining([{label: 'Sleepy-ish', count: 1, mapped: null}, {label: 'rad', count: 1, mapped: 5}]));
    expect(plan.warnings.join(' ')).toMatch(/One mood word is your own \(“Sleepy-ish”\)/);
    expect(plan.warnings.join(' ')).toMatch(/1 entry is dated after today/);
    expect(plan.warnings.join(' ')).toMatch(/1 entry has no readable date/);
  });
  test('the older layout with a year column', async () => {
    const plan = await readDaylio('year,date,weekday,time,mood,activities,note\n2025,March 3,Monday,10:00,awful,,Rough day\n2025,4 March,Tuesday,10:00,bad,,', {today: '2026-10-31'});
    expect(plan.entries.map(e => [e.date, e.mood])).toEqual([['2025-03-03', 'awful'], ['2025-03-04', 'bad']]);
  });
  test('records: the day’s last entry decides its mood; own words placed by the person; notes become journal entries with tags', async () => {
    const plan = await readDaylio(CSV, {today: '2026-10-31'});
    const r = daylioRecords(plan, {moodMap: {'Sleepy-ish': 2}, zone: 'UTC', now: new Date('2026-10-31T10:00:00Z')});
    expect(r.moods).toEqual({'2026-10-02': {mood: 5, at: '2026-10-31T10:00:00.000Z'}, '2026-10-01': {mood: 2, at: '2026-10-31T10:00:00.000Z'}});
    expect(r.severalADay).toBe(2);
    expect(r.journal.map(e => [e.date, e.text, e.tags])).toEqual([
      ['2026-10-02', 'Great evening\n\nDinner with friends, then a film.\nLaughed a lot.', ['friends', 'movies']],
      ['2026-10-01', '=1+1 is a note, not a formula', undefined],
    ]);
    expect(journalSchema.safeParse({...emptyJournal(), entries: r.journal}).success).toBe(true);
    const without = daylioRecords(plan, {zone: 'UTC', now: new Date('2026-10-31T10:00:00Z')});
    expect(without.moods['2026-10-01']).toEqual({mood: 4, at: '2026-10-31T10:00:00.000Z'}); // "good" at 07:00 is the day's only known mood
    expect(without.noMood).toBe(1);
  });
  test('merging: the person’s own moods stay; a second import adds no journal duplicates', async () => {
    const plan = await readDaylio(CSV, {today: '2026-10-31'});
    const r = daylioRecords(plan, {zone: 'UTC', now: new Date('2026-10-31T10:00:00Z')});
    const mine = {...emptyMoods(), days: {'2026-10-02': {mood: 3, at: '2026-10-02T22:00:00.000Z'}}};
    const moods = mergeDaylioMoods(mine, r.moods);
    expect(moods).toMatchObject({added: 1, kept: 1, dropped: 0});
    expect(moods.next.days['2026-10-02']!.mood).toBe(3);
    const once = mergeDaylioJournal(emptyJournal(), r.journal), twice = mergeDaylioJournal(once.next, r.journal);
    expect([once.added, twice.added, twice.duplicates]).toEqual([2, 0, 2]);
  });
  test('refusals', async () => {
    await expect(readDaylio('a,b\n1,2', {today: '2026-10-31'})).rejects.toThrow(/not a Daylio export/);
    await expect(readDaylio(`${HEADER}\nnope,,,,good,,,`, {today: '2026-10-31'})).rejects.toThrow(/no entries/);
  });
});
