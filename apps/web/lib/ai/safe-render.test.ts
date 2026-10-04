import {expect, test} from 'vitest';
import {parseBlocks, parseInline, plainText, safeHref} from './safe-render';

// ADR-012, Part 6: a reply is rendered from a tree the parser built, never as HTML; links are https only.
test('markup the reply may use becomes blocks and inline marks', () => {
  const blocks = parseBlocks('## Today\n\nYou logged **two** things, *nicely* done.\n\n- water `500 mL`\n- a walk\n\n1. first\n2. second\n\n> a quote\n\n```\ncode here\n```');
  expect(blocks.map(b => b.type)).toEqual(['heading', 'paragraph', 'list', 'list', 'quote', 'code']);
  expect(blocks[0]).toEqual({type: 'heading', level: 2, children: [{type: 'text', text: 'Today'}]});
  expect(blocks[1]).toEqual({type: 'paragraph', children: [{type: 'text', text: 'You logged '}, {type: 'strong', children: [{type: 'text', text: 'two'}]}, {type: 'text', text: ' things, '}, {type: 'em', children: [{type: 'text', text: 'nicely'}]}, {type: 'text', text: ' done.'}]});
  expect(blocks[2]).toMatchObject({type: 'list', ordered: false, items: [[{type: 'text', text: 'water '}, {type: 'code', text: '500 mL'}], [{type: 'text', text: 'a walk'}]]});
  expect(blocks[3]).toMatchObject({type: 'list', ordered: true}); expect(blocks[5]).toEqual({type: 'code', text: 'code here', language: null});
});
test('HTML, scripts, images and non-https links stay text; only https links become links', () => {
  const inline = parseInline('<img src=x onerror=alert(1)> <script>alert(1)</script> [click](javascript:alert(1)) ![alt](https://evil.example/x.png) [docs](https://example.com/a?b=1) https://zigoals.app/help.');
  const links = inline.filter(n => n.type === 'link');
  expect(links).toEqual([{type: 'link', href: 'https://example.com/a?b=1', children: [{type: 'text', text: 'docs'}]}, {type: 'link', href: 'https://zigoals.app/help', children: [{type: 'text', text: 'https://zigoals.app/help'}]}]);
  const text = inline.filter(n => n.type === 'text').map(n => n.text).join('');
  expect(text).toContain('<img src=x onerror=alert(1)>'); expect(text).toContain('<script>alert(1)</script>'); expect(text).toContain('[click](javascript:alert(1))'); expect(text).toContain('![alt](https://evil.example/x.png)');
  expect(safeHref('http://example.com')).toBeNull(); expect(safeHref('https://user:pw@example.com/')).toBeNull(); expect(safeHref('HTTPS://Example.com/path')).toBe('https://example.com/path'); expect(safeHref('javascript:alert(1)')).toBeNull();
  expect(parseBlocks('<p>raw</p>')).toEqual([{type: 'paragraph', children: [{type: 'text', text: '<p>raw</p>'}]}]);
});
test('an unfinished fence, odd markers and nested marks do not break the parser; plain text reads back', () => {
  expect(parseBlocks('```js\nlet x = 1;')).toEqual([{type: 'code', text: 'let x = 1;', language: 'js'}]);
  expect(parseInline('snake_case_name stays and 2*3*4 stays')).toEqual([{type: 'text', text: 'snake_case_name stays and 2*3*4 stays'}]);
  expect(parseInline('**bold *and em* inside**')).toEqual([{type: 'strong', children: [{type: 'text', text: 'bold '}, {type: 'em', children: [{type: 'text', text: 'and em'}]}, {type: 'text', text: ' inside'}]}]);
  expect(plainText(parseBlocks('# T\n\nA **b** [c](https://x.y)\n\n- one\n- two'))).toBe('T\n\nA b c\n\n• one\n• two');
  expect(parseBlocks('')).toEqual([]);
});
