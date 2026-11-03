import {describe, expect, it} from 'vitest';
import {nextTabIndex} from './tab-key';

describe('nextTabIndex (Session AK P6: the ARIA tabs keys)', () => {
  it('steps right and left, wrapping at both ends', () => {
    expect(nextTabIndex('ArrowRight', 0, 3)).toBe(1);
    expect(nextTabIndex('ArrowRight', 2, 3)).toBe(0);
    expect(nextTabIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(nextTabIndex('ArrowLeft', 2, 3)).toBe(1);
  });
  it('Home and End go to the first and the last tab', () => {
    expect(nextTabIndex('Home', 2, 4)).toBe(0);
    expect(nextTabIndex('End', 0, 4)).toBe(3);
  });
  it('other keys, and an empty list, move nowhere', () => {
    for (const key of ['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'a']) expect(nextTabIndex(key, 1, 3)).toBeNull();
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
  });
  it('a current tab that is unknown (-1) or past the end counts from the nearest end', () => {
    expect(nextTabIndex('ArrowRight', -1, 3)).toBe(1);
    expect(nextTabIndex('ArrowLeft', 9, 3)).toBe(1);
    expect(nextTabIndex('ArrowRight', 0, 1)).toBe(0);
  });
});
