import {describe, expect, test} from 'vitest';
import {notesSchema, type Notes} from './schema';
import {mergeNotes, mergePreview} from './merge';
import {linkIndex, parseLinks, resolveLink} from './links';

/**
 * Review b6n B6N-1 (Blocker; LEDGER #407): a merge never leaves a link pointing nowhere or at the wrong note. When links to
 * the merged note exist and the other note cannot be reached by its own name — a name with #, |, [ or ], or a name two
 * notes share — the merge is refused in words, and the preview says why. Without such links the merge goes ahead; with a
 * reachable name every re-pointed link resolves to the note it went into.
 */
const AT = '2026-11-20T09:00:00.000Z', NOW = '2026-11-22T09:00:00.000Z';
const rec = (notes: unknown[]): Notes => notesSchema.parse({version: 1, voice: false, notes});
const pasta = {id: 'p', kind: 'topic', title: 'Fictional Pasta', body: 'Boil water.', createdAt: AT};
const linker = {id: 'l', kind: 'topic', title: 'Fictional dinners', body: 'See [[Fictional Pasta]].', createdAt: AT};

describe('B6N-1 a merge never leaves a broken link', () => {
  test('into “C# basics”: refused in words, in the preview and on Merge', () => {
    const r = rec([pasta, linker, {id: 'c', kind: 'topic', title: 'C# basics', body: 'Types.', createdAt: AT}]);
    expect(mergePreview(r, 'p', 'c').problem).toMatch(/cannot reach a note whose name holds #, \|, \[ or \]\. Rename “C# basics” first; nothing was merged\./);
    expect(() => mergeNotes(r, 'p', 'c', NOW, 'UTC')).toThrow(/nothing was merged/);
  });
  test('into the second of two notes with the same name: refused, the links would reach the other one', () => {
    const r = rec([pasta, linker, {id: 'a', kind: 'topic', title: 'Fictional Italy', body: 'First.', createdAt: AT}, {id: 'b', kind: 'topic', title: 'Fictional Italy', body: 'Second.', createdAt: AT}]);
    expect(mergePreview(r, 'p', 'b').problem).toMatch(/^Two notes are called “Fictional Italy”/);
    expect(() => mergeNotes(r, 'p', 'b', NOW, 'UTC')).toThrow(/Two notes are called/);
    // Into the first one, whose name reaches it, the links follow and resolve to it.
    const out = mergeNotes(r, 'p', 'a', NOW, 'UTC'), index = linkIndex({notes: out.record.notes});
    const body = out.record.notes.find(n => n.id === 'l')!.body;
    expect(body).toBe('See [[Fictional Italy#Fictional Pasta]].');
    expect(parseLinks(body).map(l => resolveLink(index, l.target)?.id)).toEqual(['a']);
  });
  test('with no link to the merged note, an unreachable name does not matter', () => {
    const r = rec([pasta, {id: 'c', kind: 'topic', title: 'C# basics', body: 'Types.', createdAt: AT}]);
    expect(mergePreview(r, 'p', 'c').problem).toBeNull();
    expect(mergeNotes(r, 'p', 'c', NOW, 'UTC').record.notes.find(n => n.id === 'c')!.body).toBe('Types.\n\n## Fictional Pasta\n\nBoil water.');
  });
});
