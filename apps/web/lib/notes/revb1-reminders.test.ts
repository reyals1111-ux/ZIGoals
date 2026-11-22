import {describe, expect, test} from 'vitest';
import {noteReminders, remindersInNote} from './reminders';
import {anchorReminders, reminderKey} from './reminder-anchors';
import {addTopic, updateNote} from './store';
import {NOTES_KEY, emptyNotes, notesSchema, type Notes} from './schema';
import {instantAt} from '../zone-time';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts} from '../restore/plan';

/**
 * Session AV lane 2 (review b1 #1, Blocker): a reminder written as "@remind tomorrow 9:30 …" keeps the day it meant when
 * the line was saved. Read the next morning it is still due that morning (it used to slide to the day after, every day).
 */
const ZONE = 'Europe/Amsterdam';
const SUN = '2026-11-22T09:00:00.000Z', MON = '2026-11-23', MON_8 = instantAt(MON, '08:00', ZONE);
const written = (body: string, now = SUN): Notes => {
  const r = addTopic(emptyNotes(), {title: 'Fictional house', body: '', now: '2026-11-01T09:00:00.000Z', id: 'n1'}).record;
  return updateNote(r, 'n1', {body}, now, ZONE);
};

describe('a note reminder keeps the day it was written for', () => {
  test('"tomorrow 9:30" saved on Sunday is Monday 09:30, read on Sunday and on Monday morning', () => {
    const r = written('Boiler\n@remind tomorrow 9:30 call the plumber');
    expect(r.notes[0]!.remindFrom).toEqual({'tomorrow 9:30 call the plumber': '2026-11-22'});
    const sunday = remindersInNote(r.notes[0]!, '2026-11-22', ZONE), monday = remindersInNote(r.notes[0]!, MON, ZONE);
    expect(sunday.map(x => [x.day, x.time])).toEqual([[MON, '09:30']]);
    expect(monday.map(x => [x.day, x.time, x.what])).toEqual([[MON, '09:30', 'call the plumber']]);
    // Still ahead at 08:00 on Monday, so it reaches the notification plan and goes off at 09:30.
    expect(noteReminders(r, MON, ZONE, MON_8, {pastMs: 0}).map(x => x.at)).toEqual([instantAt(MON, '09:30', ZONE)]);
    // Gone by Wednesday: it never comes back as "tomorrow" again.
    expect(noteReminders(r, '2026-11-25', ZONE, instantAt('2026-11-25', '08:00', ZONE))).toEqual([]);
  });
  test('a weekday, a time alone and the Dutch words stay put too', () => {
    const r = written('⏰ friday 18:00 pay the rent\n⏰ 18:00 water the plants\n@herinner morgen 9:00 bel de bank');
    const after = remindersInNote(r.notes[0]!, '2026-11-28', ZONE);
    expect(after.map(x => [x.day, x.time])).toEqual([['2026-11-27', '18:00'], ['2026-11-22', '18:00'], ['2026-11-23', '09:00']]);
  });
  test('a later save of other words keeps each line’s day; a changed line is written anew', () => {
    let r = written('@remind tomorrow 9:30 call the plumber');
    r = updateNote(r, 'n1', {body: 'Boiler is fine\n@remind tomorrow 9:30 call the plumber'}, '2026-11-23T07:00:00.000Z', ZONE);
    expect(remindersInNote(r.notes[0]!, MON, ZONE)[0]!.day).toBe(MON);
    r = updateNote(r, 'n1', {body: '@remind tomorrow 9:30 call the electrician'}, '2026-11-23T07:00:00.000Z', ZONE);
    expect(r.notes[0]!.remindFrom).toEqual({'tomorrow 9:30 call the electrician': MON});
    expect(remindersInNote(r.notes[0]!, MON, ZONE)[0]!.day).toBe('2026-11-24');
    expect(updateNote(r, 'n1', {body: 'No reminder now'}, '2026-11-23T07:00:00.000Z', ZONE).notes[0]!.remindFrom).toBeUndefined();
  });
  test('a note no save of this build touched reads against its own last save, never a day after today', () => {
    const old = {id: 'n2', kind: 'topic' as const, title: 'Old', body: '@remind tomorrow call mum', createdAt: '2026-11-20T09:00:00.000Z'};
    expect(remindersInNote(old, MON, ZONE).map(x => x.day)).toEqual(['2026-11-21']);
    // Its first save by this build keeps the day the unchanged line already had.
    const r = updateNote(notesSchema.parse({version: 1, notes: [old]}), 'n2', {body: '@remind tomorrow call mum\nmore'}, SUN, ZONE);
    expect(r.notes[0]!.remindFrom).toEqual({'tomorrow call mum': '2026-11-20'});
    expect(anchorReminders(null, '@remind friday x', '2026-11-22', ZONE)).toEqual({'friday x': '2026-11-22'});
    expect(anchorReminders({body: '', createdAt: '2026-11-30T09:00:00.000Z'}, '@remind friday x', '2026-11-22', ZONE)).toEqual({'friday x': '2026-11-22'});
    expect(reminderKey('  Tomorrow   9:30 ')).toBe('tomorrow 9:30');
  });
  test('a `remindFrom` this build cannot read is dropped and the note kept', () => {
    const odd = notesSchema.parse({version: 1, notes: [{id: 'n1', kind: 'topic', title: 'x', body: '@remind tomorrow', createdAt: SUN, remindFrom: {x: 'monday'}}]});
    expect(odd.notes[0]!.remindFrom).toBeUndefined();
    expect(odd.notes[0]!.body).toBe('@remind tomorrow');
  });
  test('Export everything → erase → Restore keeps `remindFrom`', async () => {
    const r = written('@remind tomorrow 9:30 call the plumber'), NOW = new Date('2026-11-22T10:00:00.000Z');
    const zip = buildEverythingZip(collectEverything({[NOTES_KEY]: JSON.stringify(r)}, {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null}), {date: '2026-11-22', showcase: false, now: NOW});
    const part = planParts((await openBackup(new Blob([zip.bytes as Uint8Array<ArrayBuffer>]))).json).find(p => p.id === 'device:notes')!;
    const next = nextValue(part, 'replace', undefined);
    if ('error' in next) throw Error(next.error);
    expect(notesSchema.parse(next.value).notes[0]!.remindFrom).toEqual({'tomorrow 9:30 call the plumber': '2026-11-22'});
  });
});
