import {describe, expect, test} from 'vitest';
import {parseBlocks, plainText} from '../ai/safe-render';
import {sectionOf} from './fold';
import {parseLinks} from './links';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session AV lane 2 (r5-notes; LEDGER #361): `![[Note#Heading]]` draws that section of the other note — the heading and
 * what is under it up to the next heading of its level — or the whole note; a heading no longer there draws nothing.
 * The line itself stays text (Obsidian reads the same form): ZIGi's replies never draw an embed.
 */
const SOURCE = '# Trip\nIntro.\n## Packing\n- socks\n- [ ] tickets\n### Bags\nOne bag.\n## Money\nCash.';
const blocks = parseBlocks(SOURCE, {notes: true}), words = (b: (typeof blocks)[number]) => plainText([b]);

describe('the section an embed draws', () => {
  test('a heading, its blocks and the headings inside it, up to the next of its level', () => {
    expect(sectionOf(blocks, 'packing', words)!.map(words)).toEqual(['Packing', '• socks\n• tickets', 'Bags', 'One bag.']);
    expect(sectionOf(blocks, '  BAGS ', words)!.map(words)).toEqual(['Bags', 'One bag.']);
    expect(sectionOf(blocks, null, words)).toHaveLength(blocks.length);
    expect(sectionOf(blocks, 'Food', words)).toBeNull();
  });
  test('the embed form is read as written, and stays words outside Notes', () => {
    expect(parseLinks('![[Trip plan#Packing]]')).toMatchObject([{target: 'Trip plan', heading: 'Packing', embed: true, start: 0, end: 22}]);
    expect(plainText(parseBlocks('![[Trip plan#Packing]]'))).toBe('![[Trip plan#Packing]]');
  });
  test('an embed draws nothing of a locked note, and no embed inside an embed', () => {
    const src = readFileSync(join(__dirname, '../../components/notes/note-render.tsx'), 'utf8');
    expect(src).toMatch(/source\.locked\) return <figure[^]*?is locked: nothing of it shows here/);
    expect(src).toMatch(/const inner: Ctx = \{index: ctx\.index, onTag: ctx\.onTag, photos: notePhotoIdsOf\(source\)\};/);
  });
});
