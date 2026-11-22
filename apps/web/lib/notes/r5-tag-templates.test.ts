import {describe, expect, test} from 'vitest';
import {MAX_TAG_TEMPLATES, emptyNotes} from './schema';
import {removeTagTemplate, setTagTemplate, tagTemplatesOf, templateForTags, templateWords} from './tag-templates';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/** Session AV lane 2 (r5-notes; LEDGER #362, Logseq's templates for a tag): set, find (nested), replace and remove. */
describe('a template for every note with a tag', () => {
  test('set, replaced in place, found for the tag and the tags under it, removed', () => {
    let r = setTagTemplate(emptyNotes(), '#meeting', '## Who\n{date}');
    r = setTagTemplate(r, 'book', 'Author:');
    r = setTagTemplate(r, 'MEETING', '## Who came\n{date}');
    expect(tagTemplatesOf(r)).toEqual([{tag: 'MEETING', body: '## Who came\n{date}'}, {tag: 'book', body: 'Author:'}]);
    expect(templateForTags(r, ['travel', 'meeting/standup'])?.tag).toBe('MEETING');
    expect(templateForTags(r, ['Book'])?.body).toBe('Author:');
    expect(templateForTags(r, ['travel'])).toBeNull();
    expect(templateWords(templateForTags(r, ['meeting'])!, '2026-11-22')).toBe('## Who came\n2026-11-22');
    expect(tagTemplatesOf(setTagTemplate(r, 'book', '  '))).toHaveLength(1);
    expect(removeTagTemplate(removeTagTemplate(r, 'book'), 'meeting').tagTemplates).toBeUndefined();
  });
  test('caps and plain refusals', () => {
    let r = emptyNotes();
    for (let i = 0; i < MAX_TAG_TEMPLATES; i++) r = setTagTemplate(r, `t${i}`, 'x');
    expect(() => setTagTemplate(r, 'one-more', 'x')).toThrow(/At most 10/);
    expect(() => setTagTemplate(r, '###', 'x')).toThrow(/Name the tag/);
    expect(tagTemplatesOf(setTagTemplate(r, 't3', 'changed'))[3]).toEqual({tag: 't3', body: 'changed'});
  });
  test('the editor starts a still empty note from it once the tag is final, unsaved until Save', () => {
    // Session AV lane 2 (review b5i B5I-6, deliberate): the template is chosen when the Tags field is left or the note is
    // saved, not on a keystroke; the same two places are checked (no saved words; the words set once found).
    const src = readFileSync(join(__dirname, '../../components/notes/note-editor.tsx'), 'utf8');
    expect(src).toMatch(/if \(!record \|\| note\?\.body\.trim\(\)\) return null;/);
    expect(src).toMatch(/startedWords\.current = got\.words; setStartedFrom\(got\.tag\); setBody\(got\.words\);/);
    expect(src).toMatch(/onChange=\{e => setTagText\(e\.target\.value\)\} onBlur=\{e => \{ startFromTag\(e\.currentTarget\.value\); \}\}/);
    expect(src).toMatch(/const words = startFromTag\(tagText\) \?\? body;/);
  });
});
