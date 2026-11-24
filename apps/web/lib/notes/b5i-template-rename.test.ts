import {describe, expect, test} from 'vitest';
import {MAX_TAG_TEMPLATES, emptyNotes} from './schema';
import {setTagTemplate, tagTemplatesOf} from './tag-templates';

/** Review b5i B5I-8 (Minor): renaming a template's tag works with ten templates, in the same place in the list. */
describe('renaming a tag template', () => {
  test('with ten templates, #t3 becomes #standup in its place; a new eleventh is still refused', () => {
    let r = emptyNotes();
    for (let i = 0; i < MAX_TAG_TEMPLATES; i++) r = setTagTemplate(r, `t${i}`, `words ${i}`);
    const renamed = setTagTemplate(r, 'standup', 'Stand-up words', 't3');
    expect(tagTemplatesOf(renamed).map(t => t.tag)).toEqual(['t0', 't1', 't2', 'standup', 't4', 't5', 't6', 't7', 't8', 't9']);
    expect(tagTemplatesOf(renamed)[3]!.body).toBe('Stand-up words');
    expect(() => setTagTemplate(r, 'standup', 'x')).toThrow(/At most 10/);
  });
});
