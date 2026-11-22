import {describe, expect, it} from 'vitest';
import {instantAt} from '../zone-time';
import {noteHref, noteRemindersBetween, noteRemindersByDay} from './note-reminder-days';
import type {Notes} from '../notes/schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #224): a note's reminders listed in Tasks → Today, Upcoming and the Agenda's days,
 * linking back to the note. Notes saved today, so "tomorrow" reads the same against the save day and against today.
 */
const ZONE = 'Europe/Amsterdam', today = '2026-11-23', at = new Date('2026-11-23T07:00:00Z');
const note = (id: string, body: string) => ({id, kind: 'topic' as const, title: `Fictional ${id}`, body, createdAt: at.toISOString(), updatedAt: at.toISOString()});
const record = {version: 1, voice: false, notes: [
  note('house', 'Boiler\n@remind tomorrow 9:30 call the plumber\n⏰ 8:00 water the plants\nno reminder here'),
  note('trip', '@herinner vrijdag 18:00 koffer pakken'),
]} as unknown as Notes;

describe('note reminders where tasks are (LEDGER #224)', () => {
  it('today, the next days and the Agenda’s range, soonest first; gone off is marked', () => {
    const now = instantAt(today, '10:00', ZONE);
    const todayOnly = noteRemindersBetween(record, today, today, today, ZONE, now);
    expect(todayOnly.map(r => [r.time, r.what, r.gone])).toEqual([['08:00', 'water the plants', true]]);
    const next = noteRemindersBetween(record, today, '2026-12-06', today, ZONE, now);
    expect(next.map(r => [r.day, r.time, r.what])).toEqual([[today, '08:00', 'water the plants'], ['2026-11-24', '09:30', 'call the plumber'], ['2026-11-27', '18:00', 'koffer pakken']]);
    expect(noteRemindersByDay(next).map(d => [d.day, d.items.length])).toEqual([[today, 1], ['2026-11-24', 1], ['2026-11-27', 1]]);
    expect(noteRemindersBetween(record, '2026-11-24', '2026-11-24', today, ZONE, now).map(r => r.note.id)).toEqual(['house']);
  });
  it('each opens its own note; nothing is copied into the task list', () => {
    expect(noteHref('house')).toBe('/app/notes?note=house');
    expect(noteHref('a b')).toBe('/app/notes?note=a%20b');
    expect(noteRemindersBetween({version: 1, voice: false, notes: []} as unknown as Notes, today, today, today, ZONE, Date.now())).toEqual([]);
  });
});
