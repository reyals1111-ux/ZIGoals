import {describe, expect, test} from 'vitest';
import {rovingCurrent, rovingTarget} from './roving';

// Session AO (D-028): a list or grid of repeated controls is one Tab stop; the arrows, Home and End move inside it.
describe('rovingTarget', () => {
  test('a list: every arrow moves by one and the ends wrap; Home and End; other keys are not moves', () => {
    expect(rovingTarget('ArrowRight', 0, 3)).toBe(1);
    expect(rovingTarget('ArrowDown', 2, 3)).toBe(0);
    expect(rovingTarget('ArrowLeft', 0, 3)).toBe(2);
    expect(rovingTarget('ArrowUp', 1, 3)).toBe(0);
    expect(rovingTarget('Home', 2, 3)).toBe(0);
    expect(rovingTarget('End', 0, 3)).toBe(2);
    expect(rovingTarget('Enter', 0, 3)).toBeNull();
    expect(rovingTarget('ArrowRight', -1, 3)).toBeNull();
    expect(rovingTarget('ArrowRight', 0, 0)).toBeNull();
  });
  test('a grid of 7 columns (the week): Up and Down move by a row and stop at the edges; Right walks every cell', () => {
    expect(rovingTarget('ArrowDown', 2, 14, 7)).toBe(9);
    expect(rovingTarget('ArrowDown', 9, 14, 7)).toBe(9);
    expect(rovingTarget('ArrowUp', 9, 14, 7)).toBe(2);
    expect(rovingTarget('ArrowUp', 2, 14, 7)).toBe(2);
    expect(rovingTarget('ArrowRight', 6, 14, 7)).toBe(7);
    expect(rovingTarget('ArrowRight', 13, 14, 7)).toBe(13);
    expect(rovingTarget('ArrowLeft', 0, 14, 7)).toBe(0);
    const seen = new Set<number>(); let at = 0;
    for (let i = 0; i < 14; i++) { seen.add(at); at = rovingTarget('ArrowRight', at, 14, 7)!; }
    expect(seen.size).toBe(14);
  });
});
describe('rovingCurrent', () => {
  test('the item used last while it is there, else the first', () => {
    expect(rovingCurrent(['a', 'b'], 'b')).toBe('b');
    expect(rovingCurrent(['a', 'b'], 'c')).toBe('a');
    expect(rovingCurrent(['a', 'b'], null)).toBe('a');
    expect(rovingCurrent([], null)).toBeUndefined();
  });
});
