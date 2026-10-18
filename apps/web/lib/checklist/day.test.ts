import {afterEach, describe, expect, test} from 'vitest';
import {setJournalTimeZone} from '../journal-zone';
import {addReceipt, checklistDay, dropReceipt, markNudged, mendDay, sealDay, setCustomDone, todayOf, zonedDay} from './day';
import {emptyChecklistDays, type ChecklistDays} from './schema';

afterEach(() => { setJournalTimeZone(null, false); });

describe('the day: local midnight in the journal time zone (ADR-028 H66)', () => {
  test('the same instant is a different day in Brussels, Auckland and Los Angeles', () => {
    const at = new Date('2026-10-18T22:30:00.000Z');
    expect(zonedDay(at, 'Europe/Brussels')).toBe('2026-10-19');
    expect(zonedDay(at, 'Pacific/Auckland')).toBe('2026-10-19');
    expect(zonedDay(at, 'America/Los_Angeles')).toBe('2026-10-18');
    expect(zonedDay(new Date('2026-10-18T21:59:59.000Z'), 'Europe/Brussels')).toBe('2026-10-18');
  });
  test('the journal zone decides when one is set; the device zone otherwise', () => {
    const at = new Date('2026-10-18T22:30:00.000Z');
    setJournalTimeZone('Pacific/Auckland', true);
    expect(checklistDay(at)).toBe('2026-10-19');
    setJournalTimeZone('America/Los_Angeles', true);
    expect(checklistDay(at)).toBe('2026-10-18');
  });
  test('across the autumn daylight-saving night in Brussels, midnight is still midnight', () => {
    expect(zonedDay(new Date('2026-10-24T21:59:00.000Z'), 'Europe/Brussels')).toBe('2026-10-24'); // 23:59 CEST
    expect(zonedDay(new Date('2026-10-24T22:00:00.000Z'), 'Europe/Brussels')).toBe('2026-10-25'); // 00:00 CEST
    expect(zonedDay(new Date('2026-10-25T22:59:00.000Z'), 'Europe/Brussels')).toBe('2026-10-25'); // 23:59 CET
    expect(zonedDay(new Date('2026-10-25T23:00:00.000Z'), 'Europe/Brussels')).toBe('2026-10-26');
  });
});

describe('sealing a day', () => {
  const held: ChecklistDays = {version: 1, days: {}, today: {date: '2026-10-17', ticks: [{id: 'a', at: '2026-10-17T07:00:00.000Z'}], custom: ['c'], nudged: ['10']}};
  test('the first read on a new day seals yesterday with its receipts and starts today empty', () => {
    const calls: [string, boolean][] = [];
    const sealed = sealDay(held, '2026-10-18', (day, o) => { calls.push([day.date, o.receipts]); return {total: 3, done: day.custom.length + day.ticks.length, perfect: false}; });
    expect(calls).toEqual([['2026-10-17', true]]);
    expect(sealed.days).toEqual({'2026-10-17': {total: 3, done: 2, perfect: false}});
    expect(sealed.today).toEqual({date: '2026-10-18', ticks: [], custom: [], nudged: []});
  });
  test('idempotent: the same day again changes nothing; a sealed day is never overwritten', () => {
    const once = sealDay(held, '2026-10-18', () => ({total: 3, done: 3, perfect: true}));
    expect(sealDay(once, '2026-10-18', () => ({total: 9, done: 0}))).toBe(once);
    const replay = sealDay({...once, today: held.today}, '2026-10-18', () => ({total: 9, done: 0}));
    expect(replay.days['2026-10-17']).toEqual({total: 3, done: 3, perfect: true});
  });
  test('days never opened are sealed from the records alone (no receipts), up to two weeks; empty days are neutral', () => {
    const calls: string[] = [];
    const sealed = sealDay(held, '2026-10-21', (day, o) => { calls.push(`${day.date}:${o.receipts}`); return day.date === '2026-10-19' ? {total: 0, done: 0} : {total: 2, done: 2}; });
    expect(calls).toEqual(['2026-10-17:true', '2026-10-18:false', '2026-10-19:false', '2026-10-20:false']);
    expect(Object.keys(sealed.days)).toEqual(['2026-10-17', '2026-10-18', '2026-10-20']);
    const far = sealDay(held, '2026-12-01', () => ({total: 1, done: 1}));
    expect(Object.keys(far.days)).toHaveLength(15);
  });
  test('the history keeps the latest 400 days', () => {
    const days: ChecklistDays = {version: 1, days: Object.fromEntries(Array.from({length: 405}, (_, i) => [new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10), {total: 1, done: 1}])), today: {date: '2026-03-01', ticks: [], custom: [], nudged: []}};
    const sealed = sealDay(days, '2026-03-02', () => ({total: 1, done: 0}));
    expect(Object.keys(sealed.days)).toHaveLength(400);
    expect(Object.keys(sealed.days).at(-1)).toBe('2026-03-01');
  });
  test('receipts, custom ticks, nudges and a mended day', () => {
    let d = addReceipt(emptyChecklistDays(), '2026-10-18', {id: 'a', at: new Date('2026-10-18T07:00:00.000Z'), record: {kind: 'water', id: 'w1'}});
    d = addReceipt(d, '2026-10-18', {id: 'a', at: new Date('2026-10-18T08:00:00.000Z')});
    expect(todayOf(d, '2026-10-18').ticks).toEqual([{id: 'a', at: '2026-10-18T08:00:00.000Z'}]);
    expect(todayOf(dropReceipt(d, '2026-10-18', 'a'), '2026-10-18').ticks).toEqual([]);
    expect(todayOf(d, '2026-10-19').ticks).toEqual([]);
    d = setCustomDone(d, '2026-10-18', 'c', true);
    expect(setCustomDone(d, '2026-10-18', 'c', true)).toBe(d);
    expect(todayOf(setCustomDone(d, '2026-10-18', 'c', false), '2026-10-18').custom).toEqual([]);
    expect(todayOf(markNudged(d, '2026-10-18', '10'), '2026-10-18').nudged).toEqual(['10']);
    const mended = mendDay({version: 1, days: {'2026-10-16': {total: 6, done: 4}}}, '2026-10-16', 2);
    expect(mended.days['2026-10-16']).toEqual({total: 4, done: 4});
  });
});
