import {describe, expect, test} from 'vitest';
import {notesSchema} from './schema';
import {linkIndex, unlinkedMentions} from './links';

/** Review b5i B5I-7 (Minor): the words of a Markdown link are not a mention, so Link it never nests a link inside one. */
const AT = '2026-11-20T09:00:00.000Z';
describe('a Markdown link is not a mention', () => {
  test('[Paris guide](https://…) is left alone; the same words outside a link are found', () => {
    const rec = notesSchema.parse({version: 1, voice: false, notes: [
      {id: 't', kind: 'topic', title: 'Paris', body: 'City.', createdAt: AT},
      {id: 'a', kind: 'topic', title: 'Fictional A', body: 'see [Paris guide](https://example.com/x) ok', createdAt: AT},
      {id: 'b', kind: 'topic', title: 'Fictional B', body: 'see ![Paris](https://example.com/p.jpg) and then Paris again', createdAt: AT}]});
    const found = unlinkedMentions(rec.notes, {id: 't'}, 'Paris', linkIndex({notes: rec.notes}));
    expect(found.map(m => [m.note.id, m.start])).toEqual([['b', 'see ![Paris](https://example.com/p.jpg) and then '.length]]);
  });
});
