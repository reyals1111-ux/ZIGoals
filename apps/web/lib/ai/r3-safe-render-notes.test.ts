import {describe, expect, test} from 'vitest';
import {parseBlocks, parseInline, plainText} from './safe-render';

/**
 * Session AV lane 2 (r3-notes; LEDGER #264, #267): the tick-box and highlight marks are switched on for a note's own text
 * only. ZIGi's and NOVA's replies call the parser without options and get exactly the tree they always got.
 */
const TEXT = 'Plan ==the trip== and =={\u{1F7E2}}green bit==\n\n- [ ] pack the bag\n- [x] book the train\n- plain item';
describe('ZIGi’s replies: no tick box, no highlight', () => {
  test('==words== stay words and "[ ]" stays text in a list item', () => {
    const blocks = parseBlocks('Plan ==the trip==\n\n- [ ] pack the bag\n- [x] book the train');
    expect(blocks[0]).toEqual({type: 'paragraph', children: [{type: 'text', text: 'Plan ==the trip=='}]});
    expect(blocks[1]).toEqual({type: 'list', ordered: false, items: [[{type: 'text', text: '[ ] pack the bag'}], [{type: 'text', text: '[x] book the train'}]]});
    expect(parseInline('a ==b== c')).toEqual([{type: 'text', text: 'a ==b== c'}]);
    expect(JSON.stringify(parseBlocks(TEXT))).not.toMatch(/"mark"|"ticks"|"lines"/);
  });
});
describe('a note’s own text: tick boxes and six highlight colours', () => {
  test('a tick box keeps whether it is ticked and the line it came from', () => {
    const list = parseBlocks(TEXT.replace('{\u{1F7E2}}', '\u{1F7E2}'), {notes: true})[1]!;
    expect(list).toEqual({type: 'list', ordered: false, items: [[{type: 'text', text: 'pack the bag'}], [{type: 'text', text: 'book the train'}], [{type: 'text', text: 'plain item'}]], ticks: [false, true, null], lines: [2, 3, 4]});
  });
  test('==words== is a yellow highlight; a colour circle after == picks one of the six', () => {
    expect(parseInline('a ==b== c', {notes: true})).toEqual([{type: 'text', text: 'a '}, {type: 'mark', colour: 'yellow', children: [{type: 'text', text: 'b'}]}, {type: 'text', text: ' c'}]);
    const colours = ['\u{1F7E2}', '\u{1F535}', '\u{1F7E3}', '\u{1F534}', '\u{1F7E0}', '\u{1F7E1}'].map(e => parseInline(`==${e} words==`, {notes: true})[0]);
    expect(colours.map(c => c && c.type === 'mark' ? c.colour : null)).toEqual(['green', 'blue', 'purple', 'red', 'orange', 'yellow']);
    expect(parseInline('==**bold** inside==', {notes: true})).toEqual([{type: 'mark', colour: 'yellow', children: [{type: 'strong', children: [{type: 'text', text: 'bold'}]}, {type: 'text', text: ' inside'}]}]);
  });
  test('"a == b" and an unclosed mark stay text; code wins; plain text reads the words', () => {
    expect(parseInline('if a == b then', {notes: true})).toEqual([{type: 'text', text: 'if a == b then'}]);
    expect(parseInline('==open', {notes: true})).toEqual([{type: 'text', text: '==open'}]);
    expect(parseInline('`==code==`', {notes: true})).toEqual([{type: 'code', text: '==code=='}]);
    expect(plainText(parseBlocks('==hi== there\n\n- [ ] one', {notes: true}))).toBe('hi there\n\n• one');
  });
  test('an ordered tick list and a tick box inside fenced code', () => {
    expect(parseBlocks('1. [ ] first\n2. [X] second', {notes: true})[0]).toMatchObject({type: 'list', ordered: true, ticks: [false, true], lines: [0, 1]});
    expect(parseBlocks('```\n- [ ] code\n```', {notes: true})).toEqual([{type: 'code', text: '- [ ] code', language: null}]);
  });
});
