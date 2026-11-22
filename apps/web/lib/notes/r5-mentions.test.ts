import {describe, expect, test} from 'vitest';
import {notesSchema} from './schema';
import {linkIndex, linkMention, unlinkedMentions} from './links';

/** Session AV lane 2 (r5-notes; LEDGER #358, Logseq's unlinked references): mentions without a link, and Link it. */
const AT = '2026-11-20T09:00:00.000Z';
const rec = notesSchema.parse({version: 1, voice: false, notes: [
  {id: 't', kind: 'topic', title: 'Garden plan', body: 'Beds and seeds.', createdAt: AT},
  {id: 'a', kind: 'topic', title: 'Fictional spring', body: 'First line.\nRead the garden PLAN again before May.', createdAt: AT, updatedAt: '2026-11-21T09:00:00.000Z'},
  {id: 'b', kind: 'topic', title: 'Fictional linked', body: 'See [[Garden plan]] and the garden plan.', createdAt: AT},
  {id: 'c', kind: 'topic', title: 'Fictional words', body: 'A gardenplan and `garden plan` and https://x.test/garden plan-ish; gardens planned.', createdAt: AT},
  {id: 'd', kind: 'topic', title: 'Fictional locked', body: 'Garden plan secret.', locked: true, createdAt: AT},
  {id: 'e', kind: 'topic', title: 'Fictional archived', body: 'Garden plan old.', archived: true, createdAt: AT},
  {id: 'f', kind: 'topic', title: 'Fictional spaced', body: 'The garden\nplan on two lines.', createdAt: AT}]});
const idx = linkIndex({notes: rec.notes});

describe('mentions without a link', () => {
  test('whole words in any case, outside links, code and addresses; never a linked, locked or archived note', () => {
    const found = unlinkedMentions(rec.notes, {id: 't'}, 'Garden plan', idx);
    expect(found.map(m => m.note.id)).toEqual(['a', 'f']);
    expect(found[0]).toMatchObject({words: 'garden PLAN', line: 'Read the garden PLAN again before May.'});
    expect(unlinkedMentions(rec.notes, {id: 't'}, 'ab', idx)).toEqual([]);
  });
  test('Link it writes the link at that place, keeping the words shown', () => {
    const m = unlinkedMentions(rec.notes, {id: 't'}, 'Garden plan', idx)[0]!;
    expect(linkMention(m.note.body, m, 'Garden plan')).toBe('First line.\nRead the [[Garden plan|garden PLAN]] again before May.');
    expect(linkMention('Garden plan here', {start: 0, end: 11, words: 'Garden plan'}, 'Garden plan')).toBe('[[Garden plan]] here');
    expect(() => linkMention('Other words', m, 'Garden plan')).toThrow(/changed meanwhile/);
  });
});
