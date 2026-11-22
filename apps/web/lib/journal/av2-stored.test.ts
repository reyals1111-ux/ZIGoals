import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test} from 'vitest';
import {JOURNAL_KEY, emptyJournal, journalSchema, type Journal} from './schema';
import {JOURNAL_MEDIA_DB, audioType, getJournalMedia, journalMediaIds, namedMedia, newMediaId, putJournalMedia, sweepJournalMedia} from './media';
import {NOTES_KEY, emptyNotes, notesSchema, type Notes} from '../notes/schema';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts, type PlannedPart} from '../restore/plan';

/**
 * Session AV lane 2 (journal; TIER 3 (stored format), additive and optional): the journal's and the notes' new fields read
 * on their own (a value this build cannot read is dropped, never failing the record), older records read as before, the
 * media store keeps photos and audio per scope with the 30-day sweep, and Export everything → erase → Restore (Replace and
 * Merge) gives every new field back.
 */
const AT = '2026-11-20T09:00:00.000Z';
export const FULL_JOURNAL: Journal = journalSchema.parse({
  version: 1, shareWithAi: false, followUps: true,
  entries: [
    {id: 'e1', date: '2026-11-19', text: 'Fictional walk by the sea.', createdAt: AT, journal: 'j-travel', photos: ['m-photo0001'], audio: [{id: 'm-audio0001', seconds: 42}], imported: 'dayone'},
    {id: 'e2', date: '2026-11-20', text: 'Fictional quiet evening, changed.', createdAt: AT, updatedAt: '2026-11-20T10:00:00.000Z'},
  ],
  templates: [{id: 'own-abc123def4', title: 'Fictional evening', headings: ['Best bit:'], body: 'Best bit:\nA walk.', tags: ['evening']}],
  journals: [{id: 'j-travel', name: 'Fictional travel', theme: 'teal'}],
  packs: ['sleep', 'training'],
  reminder: {on: true, time: '21:15', days: 31},
  defaultTemplate: 'own-abc123def4', affirmations: true,
  versions: [{id: 'v-first001', entryId: 'e2', text: 'Fictional quiet evening.', savedAt: '2026-11-20T10:00:00.000Z'}],
});
export const FULL_NOTES: Notes = notesSchema.parse({
  version: 1, voice: false,
  notes: [{id: 'n1', kind: 'topic', title: 'Fictional plans', body: 'Now', createdAt: AT, updatedAt: '2026-11-20T10:00:00.000Z'}],
  versions: [{id: 'v-note0001', noteId: 'n1', title: 'Fictional plans', body: 'Before', savedAt: '2026-11-20T10:00:00.000Z'}],
  dailyTemplate: 'Today I want to:\n- ',
  schedules: [{id: 's-weekly01', title: 'Fictional week plan', body: 'Three things this week:', every: 'week', weekday: 1, lastMade: '2026-11-16'}],
});

describe('the new journal fields read on their own', () => {
  test('a full record keeps every new field', () => {
    expect(FULL_JOURNAL.entries[0]).toMatchObject({journal: 'j-travel', photos: ['m-photo0001'], audio: [{id: 'm-audio0001', seconds: 42}], imported: 'dayone'});
    expect(FULL_JOURNAL).toMatchObject({packs: ['sleep', 'training'], reminder: {on: true, time: '21:15', days: 31}, defaultTemplate: 'own-abc123def4'});
    expect(FULL_JOURNAL.templates![0]).toMatchObject({body: 'Best bit:\nA walk.', tags: ['evening']});
    expect(FULL_JOURNAL.journals).toEqual([{id: 'j-travel', name: 'Fictional travel', theme: 'teal'}]);
    expect(FULL_JOURNAL.versions).toHaveLength(1);
  });
  test('a value this build cannot read is dropped, never failing the journal; the rest is kept', () => {
    const odd = journalSchema.parse({...FULL_JOURNAL,
      entries: [{...FULL_JOURNAL.entries[0], journal: 'Travel!', photos: 'x', audio: [{id: 'bad'}], imported: 'evernote'}],
      journals: [{id: 'j-travel', name: 'Kept', theme: 'neon'}, {id: 'nope', name: 'x'}], packs: 'sleep', reminder: {on: true, time: '25:00', days: 3},
      defaultTemplate: 'Bad Id', versions: [{id: 'v-ok000001', entryId: 'e1', text: 'Earlier', savedAt: AT}, {id: 'v-bad', entryId: 'e1', text: '', savedAt: AT}]});
    expect(odd.entries[0]!.journal).toBeUndefined();
    expect(odd.entries[0]!.photos).toBeUndefined(); expect(odd.entries[0]!.audio).toBeUndefined(); expect(odd.entries[0]!.imported).toBeUndefined();
    expect(odd.journals).toEqual([{id: 'j-travel', name: 'Kept', theme: 'violet'}]);
    expect(odd.packs).toBeUndefined(); expect(odd.reminder).toBeUndefined(); expect(odd.defaultTemplate).toBeUndefined();
    expect(odd.versions!.map(v => v.id)).toEqual(['v-ok000001']);
  });
  test('the affirmation choice (LEDGER #176): kept when it reads, dropped when not, absent on an older record', () => {
    expect(journalSchema.parse({...FULL_JOURNAL, affirmations: true}).affirmations).toBe(true);
    expect(journalSchema.parse({...FULL_JOURNAL, affirmations: 'yes'}).affirmations).toBeUndefined();
    expect(journalSchema.parse(emptyJournal()).affirmations).toBeUndefined();
  });
  test('a record from an earlier release reads as before, with none of the new fields', () => {
    const old = journalSchema.parse({version: 1, entries: [{id: 'e1', date: '2026-11-01', text: 'Old.', createdAt: AT}], shareWithAi: false, followUps: true});
    for (const k of ['journals', 'packs', 'reminder', 'defaultTemplate', 'versions', 'affirmations'] as const) expect(old[k]).toBeUndefined();
    expect(journalSchema.parse(emptyJournal())).toEqual(emptyJournal());
  });
});

describe('the new notes fields read on their own', () => {
  test('kept when readable; dropped one by one when not; an older record reads as before', () => {
    expect(FULL_NOTES).toMatchObject({dailyTemplate: 'Today I want to:\n- ', schedules: [{id: 's-weekly01', every: 'week', weekday: 1}], versions: [{noteId: 'n1', body: 'Before'}]});
    const odd = notesSchema.parse({...FULL_NOTES, dailyTemplate: 5, schedules: [{id: 's-weekly01', title: 'Kept', every: 'week', weekday: 9}, {id: 'x', title: 'Gone', every: 'hour'}], versions: [{id: 'v-x', noteId: 'n1', body: 'x', savedAt: AT}]});
    expect(odd.dailyTemplate).toBeUndefined();
    expect(odd.schedules).toEqual([{id: 's-weekly01', title: 'Kept', body: '', every: 'week'}]);
    expect(odd.versions).toEqual([]);
    const old = notesSchema.parse({version: 1, notes: []});
    expect(old.versions).toBeUndefined(); expect(old.schedules).toBeUndefined(); expect(old.dailyTemplate).toBeUndefined();
    expect(notesSchema.parse(emptyNotes())).toEqual(emptyNotes());
  });
});

describe('the journal media store (zigoals-journal-media-v1)', () => {
  const wipe = () => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(JOURNAL_MEDIA_DB); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
  beforeEach(wipe);
  test('photos and audio per scope; the sweep marks unnamed media and deletes it only after 30 days', async () => {
    const photo = newMediaId(), audio = newMediaId();
    expect(photo).toMatch(/^m-[A-Za-z0-9]{6,}$/);
    await putJournalMedia('local', photo, {kind: 'photo', blob: new Blob([new Uint8Array(4)]), type: 'image/webp', bytes: 4, at: AT});
    await putJournalMedia('local', audio, {kind: 'audio', blob: new Blob([new Uint8Array(9)]), type: 'audio/webm', bytes: 9, seconds: 3, at: AT});
    await putJournalMedia('showcase', 'm-showcase1', {kind: 'photo', blob: new Blob([new Uint8Array(4)]), type: 'image/jpeg', bytes: 4, at: AT});
    expect((await journalMediaIds('local')).sort()).toEqual([photo, audio].sort());
    expect((await getJournalMedia('local', audio))).toMatchObject({kind: 'audio', seconds: 3});
    const now = Date.parse(AT);
    expect(await sweepJournalMedia('local', [photo], now)).toEqual({deleted: [], marked: [audio]});
    expect(await sweepJournalMedia('local', [photo], now + 29 * 86_400_000)).toEqual({deleted: [], marked: []});
    expect(await sweepJournalMedia('local', [photo], now + 30 * 86_400_000)).toEqual({deleted: [audio], marked: []});
    expect(await journalMediaIds('local')).toEqual([photo]);
    expect(await journalMediaIds('showcase')).toEqual(['m-showcase1']);
    await expect(putJournalMedia('local', 'm-toolarge', {kind: 'photo', blob: new Blob([]), type: 'image/png' as never, bytes: 1, at: AT})).rejects.toThrow();
  });
  test('the recorder’s types and the ids entries name', () => {
    expect(audioType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(audioType('audio/mp4')).toBe('audio/mp4');
    expect(audioType('video/webm')).toBeNull();
    expect(namedMedia(FULL_JOURNAL.entries)).toEqual(['m-photo0001', 'm-audio0001']);
  });
});

describe('Export everything → erase → Restore keeps every new field', () => {
  const NOW = new Date('2026-11-21T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
  const blobOf = (bytes: Uint8Array) => new Blob([bytes as Uint8Array<ArrayBuffer>]);
  const value = (part: PlannedPart, mode: 'replace' | 'merge', current?: unknown) => { const next = nextValue(part, mode, current); if ('error' in next) throw Error(next.error); return next.value; };
  test('Replace on an erased device, and Merge into a device that holds older records', async () => {
    const zip = buildEverythingZip(collectEverything({[JOURNAL_KEY]: JSON.stringify(FULL_JOURNAL), [NOTES_KEY]: JSON.stringify(FULL_NOTES)}, APP), {date: '2026-11-21', showcase: false, now: NOW});
    const parts = planParts((await openBackup(blobOf(zip.bytes))).json), byId = (id: string) => parts.find(p => p.id === id)!;
    expect(journalSchema.parse(value(byId('device:journal'), 'replace'))).toEqual(FULL_JOURNAL);
    expect(notesSchema.parse(value(byId('device:notes'), 'replace'))).toEqual(FULL_NOTES);
    const merged = journalSchema.parse(value(byId('device:journal'), 'merge', emptyJournal()));
    expect(merged).toMatchObject({journals: FULL_JOURNAL.journals, packs: FULL_JOURNAL.packs, reminder: FULL_JOURNAL.reminder, versions: FULL_JOURNAL.versions, defaultTemplate: 'own-abc123def4'});
    expect(merged.entries).toEqual(FULL_JOURNAL.entries);
    const mergedNotes = notesSchema.parse(value(byId('device:notes'), 'merge', emptyNotes()));
    expect(mergedNotes).toMatchObject({versions: FULL_NOTES.versions, schedules: FULL_NOTES.schedules, dailyTemplate: FULL_NOTES.dailyTemplate});
  });
});
