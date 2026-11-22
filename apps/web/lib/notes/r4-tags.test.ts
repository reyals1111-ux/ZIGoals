import {describe, expect, test} from 'vitest';
import {fieldTags, focused, hasTag, noteTags, parseTagField, splitTags, tagTree, tagsForSave, textTags} from './tags';
import {notesPerTag, noteRows} from './table';
import {notesSchema} from './schema';

/** Session AV lane 2 (r4-notes; LEDGER #306, Bear's tags): tags in the text, nested, and one tag as Notes' focus. */
const AT = '2026-11-20T09:00:00.000Z';
const note = (id: string, body: string, tags?: string[]) => notesSchema.parse({version: 1, notes: [{id, kind: 'topic', title: id, body, createdAt: AT, ...(tags ? {tags} : {})}]}).notes[0]!;

describe('tags written in the text', () => {
  test('#tags and nested #tags, each once, in the order written', () => {
    expect(textTags('Plans for #travel and #work/meetings, then #Travel again. #work/meetings/')).toEqual(['travel', 'work/meetings']);
  });
  test('not a tag: headings, numbers, link and address parts, code', () => {
    expect(textTags('# Heading\n\nIssue #12 · [[Note#part]] · https://example.com/#top · `#code`\n\n```\n#fenced\n```\nend #real')).toEqual(['real']);
  });
  test('the Tags field and a save keep both; a tag removed from the text goes', () => {
    const n = note('a', 'Pack for #travel.', ['travel', 'Japan']);
    expect(fieldTags(n)).toEqual(['Japan']);
    expect(parseTagField('#Japan, home  work/meetings')).toEqual(['Japan', 'home', 'work/meetings']);
    expect(tagsForSave(['Japan'], 'Pack for #travel and #spring.')).toEqual(['travel', 'spring', 'Japan']);
    expect(tagsForSave(['Japan'], 'Pack.')).toEqual(['Japan']);
    expect(tagsForSave([], Array.from({length: 20}, (_, i) => `#t${i}`).join(' '))).toHaveLength(12);
  });
  test('an older note counts the #tags in its words too', () => {
    expect(noteTags(note('b', 'A #book note', ['reading']))).toEqual(['reading', 'book']);
  });
  test('the reading view splits words and tags', () => {
    expect(splitTags('Go #travel, now')).toEqual(['Go ', {tag: 'travel'}, ', now']);
    expect(splitTags('#a1 start')).toEqual([{tag: 'a1'}, ' start']);
  });
});
describe('nested tags and the focus', () => {
  const notes = [note('a', 'x #work/meetings'), note('b', 'y #work'), note('c', 'z', ['home']), note('d', 'nothing')];
  test('the tree counts a parent with its children, a note once', () => {
    expect(tagTree(notes)).toEqual([
      {tag: 'home', name: 'home', depth: 0, count: 1},
      {tag: 'work', name: 'work', depth: 0, count: 2},
      {tag: 'work/meetings', name: 'meetings', depth: 1, count: 1},
    ]);
  });
  test('a focus tag keeps its notes and those under it', () => {
    expect(focused(notes, 'work').map(n => n.id)).toEqual(['a', 'b']);
    expect(focused(notes, 'Work/Meetings').map(n => n.id)).toEqual(['a']);
    expect(focused(notes, undefined)).toHaveLength(4);
    expect(hasTag(notes[0]!, 'wor')).toBe(false);
  });
  test('the table and the chart read the tags in the words', () => {
    expect(noteRows([notes[0]!])[0]!.tags).toEqual(['work/meetings']);
    expect(notesPerTag(notes)).toEqual({tags: [{tag: 'home', count: 1}, {tag: 'work', count: 1}, {tag: 'work/meetings', count: 1}], untagged: 1});
  });
});
