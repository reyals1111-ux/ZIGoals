import {describe, expect, test} from 'vitest';
import {parseBlocks, plainText} from '../ai/safe-render';

/** Session AV lane 2 (r4-notes; LEDGER #314, Bear's callouts). */
describe('callouts, in notes only', () => {
  test('the five kinds, with a title and paragraphs', () => {
    expect(parseBlocks('> [!TIP] Pack light\n> One bag.\n>\n> Two shoes.', {notes: true})).toEqual([{type: 'callout', kind: 'tip', word: 'Tip', title: [{type: 'text', text: 'Pack light'}], paragraphs: [[{type: 'text', text: 'One bag.'}], [{type: 'text', text: 'Two shoes.'}]]}]);
    for (const k of ['NOTE', 'IMPORTANT', 'WARNING', 'CAUTION']) expect(parseBlocks(`> [!${k}]\n> Words.`, {notes: true})[0]).toMatchObject({type: 'callout', kind: k.toLowerCase(), word: k[0] + k.slice(1).toLowerCase(), title: null});
  });
  test('Obsidian’s other markers keep their word; a fold sign is read', () => {
    expect(parseBlocks('> [!info]- Read me\n> x', {notes: true})[0]).toMatchObject({type: 'callout', kind: 'note', word: 'Info'});
    expect(parseBlocks('> [!danger]\n> x', {notes: true})[0]).toMatchObject({kind: 'caution', word: 'Danger'});
    expect(parseBlocks('> [!mood]\n> x', {notes: true})[0]).toMatchObject({kind: 'note', word: 'Mood'});
  });
  test('ZIGi’s replies keep a quote; a plain quote stays a quote; the words read plainly', () => {
    expect(parseBlocks('> [!TIP] Pack light')[0]).toEqual({type: 'quote', children: [{type: 'text', text: '[!TIP] Pack light'}]});
    expect(parseBlocks('> Just a quote', {notes: true})[0]!.type).toBe('quote');
    expect(plainText(parseBlocks('> [!WARNING] Careful\n> Hot pan.', {notes: true}))).toBe('Warning: Careful\nHot pan.');
  });
});
