import {describe, expect, test} from 'vitest';
import {notesSchema, type Notes} from './schema';
import {ensureDaily, removeNote, updateNote} from './store';
import {restoreFromTrash} from './trash';
import {readableNotes, withoutLocked} from './lock';
import {notesPackLines} from './pack';
import {notesExportEntries} from './markdown';
import {allCards} from './cards';
import {linkIndex, unlinkedMentions} from './links';
import {updateNoteKeepingVersion} from './versions';

/**
 * Review b5i B5I-3 (Blocker, privacy) and B5I-4 (Blocker): restoring a daily note whose day was written again never
 * merges it into the new note. A locked one comes back as its own locked note, whose words reach no reader; any one comes
 * back with every photo, its tags, properties, look and earlier versions.
 */
const AT = '2026-11-20T09:00:00.000Z', DEL = '2026-11-21T09:00:00.000Z', NOW = '2026-11-22T09:00:00.000Z', DAY = '2026-11-20';
function deletedDay(fields: Record<string, unknown>): Notes {
  const base = notesSchema.parse({version: 1, voice: false, notes: [{id: 'd', kind: 'daily', title: DAY, day: DAY, body: 'my secret fictional words', createdAt: AT, ...fields}]});
  const versioned = updateNoteKeepingVersion(base, 'd', {body: 'my secret fictional words, again'}, AT, 'v-aaaaaaaa');
  const gone = removeNote(versioned, 'd', DEL).record;
  const again = ensureDaily(gone, DAY, NOW);
  return updateNote(again.record, again.note.id, {body: 'today, written again'}, NOW, 'UTC');
}
describe('a restored daily note is never merged', () => {
  test('a locked one comes back as its own locked note; its words reach no reader', () => {
    const out = restoreFromTrash(deletedDay({locked: true}), 'd', NOW), r = out.record;
    expect(out.said).toBe(`Restored as its own note, “${DAY} · restored”, because ${DAY} has a new daily note; nothing was added to that one.`);
    const fresh = r.notes.find(n => n.kind === 'daily' && n.day === DAY)!, back = r.notes.find(n => n.id === 'd')!;
    expect(fresh.body).toBe('today, written again'); expect(fresh.locked).toBeUndefined();
    expect(back).toMatchObject({kind: 'topic', title: `${DAY} · restored`, locked: true});
    expect(r.versions?.every(v => v.noteId === 'd')).toBe(true);
    const words = /secret/;
    expect(readableNotes(r.notes).map(n => n.body).join('\n')).not.toMatch(words);
    expect(withoutLocked(r).notes.map(n => n.body).join('\n')).not.toMatch(words);
    expect(notesPackLines(r.notes).lines.join('\n')).not.toMatch(words);
    expect(notesExportEntries(r, {}).map(e => typeof e.data === 'string' ? e.data : '').join('\n')).not.toMatch(words);
    expect(allCards([{...back, body: 'secret q :: secret a'}])).toEqual([]);
    expect(unlinkedMentions(r.notes, {id: fresh.id}, DAY, linkIndex({notes: r.notes}))).toEqual([]);
  });
  test('every photo, its tags, properties and look come back', () => {
    const photos = ['p-2', 'p-3', 'p-4', 'p-5'];
    const r = restoreFromTrash(deletedDay({photoId: 'p-1', photos, tags: ['keep'], props: [{k: 'Mood', t: 'text', v: 'calm'}], look: {colour: 'sage', cover: 'p-1'}}), 'd', NOW).record;
    expect(r.notes.find(n => n.id === 'd')).toMatchObject({photoId: 'p-1', photos, tags: ['keep'], props: [{k: 'Mood', t: 'text', v: 'calm'}], look: {colour: 'sage', cover: 'p-1'}});
  });
  test('a second restore of the same day takes the next free name', () => {
    const one = restoreFromTrash(deletedDay({}), 'd', NOW).record;
    const twice = restoreFromTrash(notesSchema.parse({...one, trash: [{id: 'd9', kind: 'daily', title: DAY, day: DAY, body: 'Older.', createdAt: AT, deletedAt: DEL}]}), 'd9', NOW);
    expect(twice.record.notes.find(n => n.id === 'd9')!.title).toBe(`${DAY} · restored (2)`);
  });
});
