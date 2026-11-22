import {describe, expect, test} from 'vitest';
import {setTick, tickLines} from './ticks';
import {parseBlocks, type NoteBlock} from '../ai/safe-render';
import {closesFence, FENCE_OPEN} from '../markdown-fence';

/**
 * Session AV lane 2 (review B3C-9, B3C-10): Open tick boxes and the reading view agree on every tick box — the same fence
 * rule, and a box is a box only with its words on its own line, so every box the reading view draws can be ticked.
 */
/** The tick boxes the reading view draws: each list item with a box, by the line it starts on. */
const drawn = (body: string) => parseBlocks(body, {notes: true}).flatMap((b: NoteBlock) => b.type === 'list' && b.ticks ? b.ticks.flatMap((t, i) => t === null ? [] : [{line: b.lines![i]!, checked: t}]) : []);
const listed = (body: string) => tickLines(body).map(t => ({line: t.line, checked: t.checked}));

describe('B3C-9: one fence rule', () => {
  test('a four-backtick block holding a three-backtick line: its "- [ ]" is code, the box after it is found', () => {
    const body = ['````md', '```js', '- [ ] inside the code', '```', '````', '- [ ] a real box after'].join('\n');
    expect(parseBlocks(body, {notes: true}).map(b => b.type)).toEqual(['code', 'list']);
    expect(listed(body)).toEqual([{line: 5, checked: false}]);
    expect(listed(body)).toEqual(drawn(body));
  });
  test('a line like "```js some words" opens no fence (the parser reads it as words), so the box under it counts', () => {
    const body = ['```js some words', '- [ ] a box', '```'].join('\n');
    expect(listed(body)).toEqual(drawn(body));
    expect(listed(body)).toEqual([{line: 1, checked: false}]);
  });
  test('the close: the same character, at least as long, nothing after it; a fence never closed runs to the end', () => {
    expect(closesFence('```', '````')).toBe(true);
    expect(closesFence('````', '```')).toBe(false);
    expect(closesFence('```', '~~~')).toBe(false);
    expect(closesFence('~~~', '  ~~~~  ')).toBe(true);
    expect(closesFence('```', '``` x')).toBe(false);
    expect(FENCE_OPEN.exec('~~~ python')?.[1]).toBe('~~~');
    const open = ['```', '- [ ] never a box'].join('\n');
    expect(listed(open)).toEqual([]); expect(drawn(open)).toEqual([]);
  });
  test('mixed notes: the two lists agree line for line', () => {
    for (const body of [
      '- [ ] one\n- [x] two\n\n~~~\n- [ ] code\n~~~\n1. [ ] three',
      '```\n```js\n- [ ] still code\n```\n- [ ] out',
      '* [X] done\n  more words\n+ [ ] open',
    ]) expect(listed(body), body).toEqual(drawn(body));
  });
  test('ticking an entry from the list changes the box it names, never a code line', () => {
    const body = ['````md', '```js', '- [ ] inside the code', '```', '````', '- [ ] a real box after'].join('\n');
    const [first] = tickLines(body);
    expect(setTick(body, first!.line, true).split('\n')).toEqual(['````md', '```js', '- [ ] inside the code', '```', '````', '- [x] a real box after']);
  });
});
