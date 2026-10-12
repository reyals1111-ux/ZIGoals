import {describe, expect, it} from 'vitest';
import {normalize, scoreItem, search, type SearchItem} from './engine';

const items: SearchItem[] = [
  {id: 'p1', kind: 'page', title: 'Wealth', href: '/app/wealth', keywords: ['assets', 'net worth']},
  {id: 'g1', kind: 'goal', title: 'Emergency fund', subtitle: 'Value goal', href: '/app/goals/x'},
  {id: 'g2', kind: 'goal', title: 'First home deposit', href: '/app/goals/y'},
  {id: 'f1', kind: 'food', title: 'Café au lait', href: '/app/health?food=1'},
  {id: 't1', kind: 'template', title: 'Build an emergency fund', href: '/app/goals/new?template=emergency-fund'},
  {id: 'h1', kind: 'help', title: 'How do I export everything?', href: '/app/help#export', keywords: ['backup', 'zip']},
];

describe('search (Session AA-Cloud Part 4)', () => {
  it('ignores case and accents', () => {
    expect(normalize('Café  AU-lait')).toBe('cafe au lait');
    expect(search(items, 'cafe').map(h => h.id)).toEqual(['f1']);
  });
  it('needs every word somewhere, and ranks a title word start above a keyword', () => {
    expect(search(items, 'emerg fund').map(h => h.id)).toEqual(['g1', 't1']);
    expect(scoreItem(items[0]!, 'net worth')).not.toBeNull();
    expect(scoreItem(items[0]!, 'wealth')! > scoreItem(items[0]!, 'assets')!).toBe(true);
    expect(search(items, 'emergency pizza')).toEqual([]);
  });
  it('finds help answers by their keywords and groups results by kind', () => {
    expect(search(items, 'backup').map(h => h.id)).toEqual(['h1']);
    const kinds = search(items, 'e').map(h => h.kind);
    expect(kinds.join(',')).toMatch(/^(\w+)(,\1)*(,(\w+)(,\4)*)*$/);
  });
  it('keeps at most perKind of a kind and nothing for an empty query', () => {
    const many: SearchItem[] = Array.from({length: 20}, (_, i) => ({id: `g${i}`, kind: 'goal', title: `Goal ${i}`, href: '/'}));
    expect(search(many, 'goal', {perKind: 6})).toHaveLength(6);
    expect(search(items, '   ')).toEqual([]);
  });
});
