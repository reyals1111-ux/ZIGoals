import {describe, expect, it} from 'vitest';
import {changeEntry, cleanTag, hasTag, readTags, tagCounts, withTag, withoutTag} from './tags';
import {journalSchema, type JournalEntry} from './schema';
import {showcaseJournal} from './showcase';

/** Session AV (owner follow-up 1, F-JOURNAL-TAGS): tags on journal entries in the existing field; nothing new stored. */
const entry = (over: Partial<JournalEntry> = {}): JournalEntry => ({id: 'e1', date: '2026-11-23', text: 'Fictional day', createdAt: '2026-11-23T20:00:00.000Z', ...over});
describe('Session AV (F-JOURNAL-TAGS)', () => {
  it('cleans and reads tags: no "#", spaces tidied, 24 characters, commas or #, no doubles, at most 8', () => {
    expect(cleanTag('  #Work  life ')).toBe('Work life');
    expect(cleanTag('#')).toBeNull();
    expect(readTags('work, Family #walk, work')).toEqual(['work', 'Family', 'walk']);
    expect(readTags('a,b,c,d,e,f,g,h,i,j')).toHaveLength(8);
    expect(cleanTag('x'.repeat(40))).toHaveLength(24);
  });
  it('adds once (any case), never past 8; removes, and the field leaves with the last tag', () => {
    const a = withTag(entry(), 'Work');
    expect(a.tags).toEqual(['Work']);
    expect(withTag(a, 'work')).toBe(a);
    expect(withTag(entry({tags: ['1', '2', '3', '4', '5', '6', '7', '8']}), 'nine').tags).toHaveLength(8);
    expect(withoutTag(a, 'WORK')).not.toHaveProperty('tags');
    expect(journalSchema.safeParse({version: 1, entries: [withTag(a, 'family')], shareWithAi: false, followUps: true}).success).toBe(true);
  });
  it('counts, filters and changes one entry only', () => {
    const list = [entry({id: 'a', tags: ['work']}), entry({id: 'b', tags: ['Work', 'family']}), entry({id: 'c'})];
    expect(tagCounts(list)).toEqual([{tag: 'work', count: 2}, {tag: 'family', count: 1}]);
    expect(list.filter(e => hasTag(e, 'WORK')).map(e => e.id)).toEqual(['a', 'b']);
    expect(list.filter(e => hasTag(e, null))).toHaveLength(3);
    const j = changeEntry({version: 1, entries: list, shareWithAi: false, followUps: true}, 'c', e => withTag(e, 'walk'));
    expect(j.entries.map(e => e.tags ?? [])).toEqual([['work'], ['Work', 'family'], ['walk']]);
  });
  it('the Showcase carries a few tags', () => {
    expect(tagCounts(showcaseJournal('2026-11-23').entries).map(t => t.tag)).toContain('work');
  });
});
