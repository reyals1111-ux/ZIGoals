import {describe, expect, it} from 'vitest';
import {MAX_LEAN, carouselIndex, carouselStep, dropPlace, leanAt, orbitRows, placeOrbit, visibleFor} from './layout';
import type {NovaWidget, WidgetSize} from './store';

const w = (sizes: WidgetSize[]): NovaWidget[] => sizes.map((size, slot) => ({id: `w${slot}`, size, slot}));

describe('Orbit layout', () => {
  it('balances the two sides by height, left first on a tie', () => {
    const placed = placeOrbit(w(['M', 'M', 'S', 'L']));
    expect(placed.map(p => [p.id, p.side, p.row])).toEqual([['w0', 'left', 1], ['w1', 'right', 1], ['w2', 'left', 3], ['w3', 'right', 3]]);
    expect(orbitRows(placed)).toBe(5);
  });
  it('sends what does not fit beside the star to the outer band, in order', () => {
    const placed = placeOrbit(w(['L', 'L', 'L', 'L', 'M', 'S']), 6);
    expect(placed.filter(p => p.side === 'band').map(p => p.id)).toEqual(['w4', 'w5']);
    expect(placed.every(p => p.side === 'band' ? p.row === 0 && p.lean === 0 : p.row >= 1)).toBe(true);
  });
  it('a side never holds more rows than it has', () => {
    for (const sizes of [['L', 'L', 'L', 'L', 'L', 'L'], ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S']] as WidgetSize[][]) {
      const placed = placeOrbit(w(sizes), 8);
      for (const side of ['left', 'right'] as const) expect(placed.filter(p => p.side === side).reduce((n, p) => n + p.rows, 0)).toBeLessThanOrEqual(8);
    }
  });
  it('panels lean in toward the star most at its height and not at all at the column ends', () => {
    const placed = placeOrbit(w(['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S']));
    const left = placed.filter(p => p.side === 'left').map(p => p.lean);
    expect(left).toHaveLength(5);
    expect(left[2]).toBe(Math.max(...left));
    expect(left[0]).toBe(left[4]); expect(left[1]).toBe(left[3]);
    expect(left[0]).toBeLessThan(left[1]!);
    for (const p of placed) { expect(p.lean).toBeGreaterThanOrEqual(0); expect(p.lean).toBeLessThanOrEqual(MAX_LEAN); }
  });
  it('the lean is bounded and safe on odd input', () => {
    expect(leanAt(0, 0, 3)).toBe(0); expect(leanAt(Number.NaN, 4, 3)).toBe(0); expect(leanAt(0, 4, 0)).toBe(0);
    expect(leanAt(0, 4, 3)).toBe(MAX_LEAN); expect(leanAt(3, 4, 3)).toBe(0); expect(leanAt(10, 4, 3)).toBe(0);
  });
  it('the opening order follows the orbit order', () => {
    expect(placeOrbit(w(['S', 'M', 'L'])).map(p => p.order)).toEqual([0, 1, 2]);
  });
  it('AM-D9: a widget keeps the side it stands on when another is made, hidden or pinned; a new one takes the emptier side', () => {
    const list = (ids: string[]) => ids.map((id, slot) => ({id, size: 'M' as const, slot}));
    const sideOf = (placed: ReturnType<typeof placeOrbit>) => Object.fromEntries(placed.map(p => [p.id, p.side]));
    const first = sideOf(placeOrbit(list(['weather', 'habits', 'worth'])));
    expect(first).toEqual({weather: 'left', habits: 'right', worth: 'left'});
    const prefer = (id: string) => first[id];
    // Weather is hidden: without the memory Net worth would cross to the left and Habits stay; with it nobody moves.
    expect(sideOf(placeOrbit(list(['habits', 'worth'])))).toEqual({habits: 'left', worth: 'right'});
    expect(sideOf(placeOrbit(list(['habits', 'worth']), undefined, undefined, prefer))).toEqual({habits: 'right', worth: 'left'});
    // Net worth is pinned (it moves behind the made ones in the list): still nobody crosses.
    expect(sideOf(placeOrbit(list(['weather', 'habits', 'worth']).reverse(), undefined, undefined, prefer))).toEqual(first);
    // A new widget, first in the list: the others stay, it takes the emptier side and leads its column.
    const more = placeOrbit(list(['sun', 'weather', 'habits', 'worth']), undefined, undefined, prefer);
    expect(sideOf(more)).toEqual({sun: 'right', ...first});
    expect(more.filter(p => p.side === 'right').map(p => [p.id, p.row])).toEqual([['sun', 1], ['habits', 3]]);
    // Full columns (two M each in four rows): the new widget still stands beside the star, at the top of the emptier side;
    // the last one of that side goes to the band instead of the new one.
    const full = placeOrbit(list(['a', 'b', 'c', 'd']), 4);
    expect(full.map(p => p.side)).toEqual(['left', 'right', 'left', 'right']);
    const sides4 = sideOf(full), crowded = placeOrbit(list(['new', 'a', 'b', 'c', 'd']), 4, undefined, id => sides4[id]);
    expect(sideOf(crowded)).toEqual({new: 'left', a: 'left', b: 'right', c: 'band', d: 'right'});
    // The same list again (a re-render): everyone stays exactly where they stood, the band included.
    const again = sideOf(crowded);
    expect(sideOf(placeOrbit(list(['new', 'a', 'b', 'c', 'd']), 4, undefined, id => again[id]))).toEqual(again);
    // Room opens (a is closed): the one waiting in the band takes it; nobody crosses.
    expect(sideOf(placeOrbit(list(['new', 'b', 'c', 'd']), 4, undefined, id => again[id]))).toEqual({new: 'left', b: 'right', c: 'left', d: 'right'});
    // A side that is full gives way: the widget goes to the other side, then to the band; rows never overlap.
    const tight = placeOrbit(list(['a', 'b', 'c']), 2, undefined, () => 'left');
    expect(tight.map(p => p.side)).toEqual(['left', 'right', 'band']);
  });
});

describe('what each layout shows', () => {
  const all = w(['S', 'M', 'L', 'S', 'M']);
  it('Orbit and Bento all, Focus the first three, Minimal none', () => {
    expect(visibleFor('orbit', all)).toHaveLength(5); expect(visibleFor('bento', all)).toHaveLength(5);
    expect(visibleFor('focus', all).map(x => x.id)).toEqual(['w0', 'w1', 'w2']);
    expect(visibleFor('minimal', all)).toEqual([]);
  });
});

describe('drag and the carousel', () => {
  it('a drop lands on the target’s place; on itself or nowhere nothing moves', () => {
    const order = ['a', 'b', 'c', 'd'];
    expect(dropPlace(order, 'a', 'c')).toBe(2); expect(dropPlace(order, 'd', 'b')).toBe(1);
    expect(dropPlace(order, 'b', 'b')).toBe(1); expect(dropPlace(order, 'b', null)).toBe(1); expect(dropPlace(order, 'b', 'zz')).toBe(1);
    expect(dropPlace(order, 'zz', 'a')).toBe(-1);
  });
  it('steps stop at the ends; the card in view is the nearest start', () => {
    expect(carouselStep(0, -1, 5)).toBe(0); expect(carouselStep(4, 1, 5)).toBe(4); expect(carouselStep(2, 1, 5)).toBe(3); expect(carouselStep(0, 1, 0)).toBe(0);
    expect(carouselIndex(0, 300, 12, 4)).toBe(0); expect(carouselIndex(320, 300, 12, 4)).toBe(1); expect(carouselIndex(5000, 300, 12, 4)).toBe(3); expect(carouselIndex(10, 0, 12, 4)).toBe(0);
  });
});
