import {describe, expect, test} from 'vitest';
import {readBear} from './import-enex';

/**
 * Session AV lane 2 (review b4g B4G-10; LEDGER #321): an asset name with a malformed % (Bear writes `50%off.jpg` as it
 * is) is read as written, and never stops the rest of a backup from importing.
 */
const enc = (s: string) => new TextEncoder().encode(s);
describe('Bear asset names', () => {
  test('a malformed % is read as written; an escaped name is decoded', () => {
    const {notes} = readBear([
      {name: 'a.textbundle/text.md', data: enc('# Fictional sale\n\n![](assets/50%off.jpg)\n\n![](assets/my%20cat.png)')},
      {name: 'a.textbundle/assets/50%off.jpg', data: new Uint8Array([1])},
      {name: 'a.textbundle/assets/my cat.png', data: new Uint8Array([2])},
      {name: 'b.textbundle/text.md', data: enc('# Fictional second\n\nWords.')}]);
    expect(notes.map(n => n.title)).toEqual(['Fictional sale', 'Fictional second']);
    expect(notes[0]!.images.map(i => i.type)).toEqual(['image/jpeg', 'image/png']);
  });
});
