import {describe, expect, test} from 'vitest';
import {emptyNotes} from './schema';
import {setTagTemplate, startWords} from './tag-templates';
import {parseTagField} from './tags';

/** Review b5i B5I-6 (Major): the template is chosen from the final tags, and a nested tag's own template wins. */
const DAY = '2026-11-22';
const rec = setTagTemplate(setTagTemplate(setTagTemplate(emptyNotes(), 'work', 'Work notes'), 'work/meetings', '## Who\n{date}'), 'meet', 'Meet words');
describe('a tag template from the final tags', () => {
  test('a nested tag’s own template wins over its parent’s; a longer tag is not taken for a prefix', () => {
    expect(startWords(rec, parseTagField('work/meetings'), '', null, DAY)).toEqual({tag: 'work/meetings', words: '## Who\n2026-11-22'});
    expect(startWords(rec, parseTagField('work/other'), '', null, DAY)).toEqual({tag: 'work', words: 'Work notes'});
    expect(startWords(rec, parseTagField('meeting'), '', null, DAY)).toBeNull();
  });
  test('while the words are still the untouched template, a changed tag picks again; words of its own never change', () => {
    expect(startWords(rec, parseTagField('work/meetings'), 'Work notes', 'Work notes', DAY)?.tag).toBe('work/meetings');
    expect(startWords(rec, parseTagField('work/meetings'), 'Work notes and mine', 'Work notes', DAY)).toBeNull();
    expect(startWords(rec, parseTagField('work'), 'My own words', null, DAY)).toBeNull();
    expect(startWords(rec, parseTagField('work'), 'Work notes', 'Work notes', DAY)).toBeNull();
  });
});
