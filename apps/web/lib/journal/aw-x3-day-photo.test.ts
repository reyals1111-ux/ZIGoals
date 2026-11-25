import {describe, expect, test} from 'vitest';
import {dayPhotos, dayStrip, nextMonth, photoOfDay, setDayPhoto, stripCount, stripMonths} from './day-photo';
import {journalSchema, type Journal} from './schema';

/**
 * Session AW (x3; LEDGER #445, The Five Minute Journal's photo of the day): one photo stands for a day (the one marked,
 * else the first), a month's strip leaves a day without one blank and never counts it as missed, and letters still
 * folded away and other journals stay out, as the photo grid leaves them out.
 */
const TODAY = '2026-11-25';
const e = (id: string, date: string, more: Record<string, unknown> = {}) => ({id, date, text: 'A fictional day.', createdAt: `${date}T09:00:00.000Z`, ...more});
const journal = (entries: unknown[], more: Record<string, unknown> = {}): Journal => journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries, ...more});
describe('the stored format (TIER 3, additive)', () => {
  test('an entry of an older build has no day photo; one that does not read is dropped', () => {
    expect(journal([e('a', TODAY, {photos: ['m-photo0001']})]).entries[0]!.dayPhoto).toBeUndefined();
    expect(journal([e('a', TODAY, {dayPhoto: 'not an id'})]).entries[0]!.dayPhoto).toBeUndefined();
  });
});
describe('the photo of a day', () => {
  test('the first photo of the day by default; the one marked when there is one', () => {
    const j = journal([e('b', TODAY, {createdAt: `${TODAY}T20:00:00.000Z`, photos: ['m-photo0003']}), e('a', TODAY, {photos: ['m-photo0001', 'm-photo0002']})]);
    expect(photoOfDay(j.entries)).toEqual({entryId: 'a', mediaId: 'm-photo0001', chosen: false});
    const marked = setDayPhoto(j, 'b', 'm-photo0003');
    expect(photoOfDay(marked.entries)).toEqual({entryId: 'b', mediaId: 'm-photo0003', chosen: true});
    // One a day: marking another photo of that day takes the mark off the first.
    const again = setDayPhoto(marked, 'a', 'm-photo0002');
    expect(again.entries.filter(x => x.dayPhoto)).toEqual([expect.objectContaining({id: 'a', dayPhoto: 'm-photo0002'})]);
    expect(setDayPhoto(again, 'a', null).entries.some(x => x.dayPhoto)).toBe(false);
    // A photo the entry does not hold changes nothing; a mark on a photo taken off is passed over.
    expect(setDayPhoto(j, 'a', 'm-photo0003')).toBe(j);
    expect(photoOfDay(journal([e('a', TODAY, {photos: ['m-photo0001'], dayPhoto: 'm-photo0009'})]).entries)).toEqual({entryId: 'a', mediaId: 'm-photo0001', chosen: false});
    expect(() => setDayPhoto(j, 'gone', null)).toThrow('This entry is no longer on this device.');
  });
  test('a month’s strip: every day in order, blank where there is no photo, days to come marked, never a missed count', () => {
    const j = journal([e('a', '2026-11-03', {photos: ['m-photo0001']}), e('b', '2026-11-20', {morePhotos: undefined, photos: ['m-photo0002']}), e('c', '2026-11-21')]);
    const strip = dayStrip(j, TODAY, '2026-11');
    expect(strip).toHaveLength(30);
    expect(strip[2]).toEqual({date: '2026-11-03', future: false, photo: {entryId: 'a', mediaId: 'm-photo0001', chosen: false}});
    expect(strip[20]).toEqual({date: '2026-11-21', future: false, photo: null});
    expect(strip[29]).toMatchObject({date: '2026-11-30', future: true, photo: null});
    expect(stripCount(strip)).toEqual({withPhoto: 2, soFar: 25});
    expect(dayStrip(j, TODAY, '2026-02')).toHaveLength(28); expect(dayStrip(j, TODAY, '2028-02')).toHaveLength(29); expect(dayStrip(j, TODAY, 'nope')).toEqual([]);
  });
  test('letters still folded away and other journals stay out', () => {
    const j = journal([e('a', '2026-11-03', {photos: ['m-photo0001'], opensOn: '2027-01-01'}), e('b', '2026-11-04', {photos: ['m-photo0002'], journal: 'j-travel01'})], {journals: [{id: 'j-travel01', name: 'Travel', theme: 'teal'}]});
    expect([...dayPhotos(j, TODAY, '2026-11').keys()]).toEqual(['2026-11-04']);
    expect([...dayPhotos(j, TODAY, '2026-11', 'main').keys()]).toEqual([]);
    expect([...dayPhotos(j, TODAY, '2026-11', 'j-travel01').keys()]).toEqual(['2026-11-04']);
  });
  test('the months to page: from the first photo to this month', () => {
    expect(stripMonths(journal([]), TODAY)).toEqual(['2026-11']);
    expect(stripMonths(journal([e('a', '2026-09-30', {photos: ['m-photo0001']})]), TODAY)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(nextMonth('2026-12')).toBe('2027-01');
  });
});
