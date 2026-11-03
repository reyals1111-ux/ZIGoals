import {describe, expect, test} from 'vitest';
import {labelled, spendingMaps, squarify, type MapRect} from './layout';
import type {MoneyEntry} from '../money-log/schema';
import {showcaseMoneyLog} from '../money-log/showcase';
import {monthOf} from '../money-log/engine';

const box = {x: 0, y: 0, w: 600, h: 400};
const area = (rects: readonly MapRect[]) => rects.reduce((s, r) => s + r.w * r.h, 0);
const inside = (r: MapRect) => r.x >= -1e-6 && r.y >= -1e-6 && r.x + r.w <= box.w + 1e-6 && r.y + r.h <= box.h + 1e-6;
const overlap = (a: MapRect, b: MapRect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

describe('BUILD list 2 #18: the spending map layout', () => {
  test('the areas add up to the whole rectangle, each in proportion, none overlapping, all inside', () => {
    const items = [6, 6, 4, 3, 2, 2, 1].map((value, i) => ({id: `c${i}`, value}));
    const rects = squarify(items, box);
    expect(rects).toHaveLength(7);
    expect(area(rects)).toBeCloseTo(box.w * box.h, 6);
    for (const r of rects) { expect(r.w * r.h).toBeCloseTo((r.value / 24) * box.w * box.h, 6); expect(inside(r)).toBe(true); }
    for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) expect(overlap(rects[a]!, rects[b]!)).toBeLessThan(1e-6);
  });
  test('squarified: the rectangles stay close to squares', () => {
    const rects = squarify([6, 6, 4, 3, 2, 2, 1].map((value, i) => ({id: `c${i}`, value})), box);
    for (const r of rects) expect(Math.max(r.w / r.h, r.h / r.w)).toBeLessThan(4);
  });
  test('zero categories: nothing to draw; zero and negative values are left out', () => {
    expect(squarify([], box)).toEqual([]);
    expect(squarify([{id: 'a', value: 0}, {id: 'b', value: -3}], box)).toEqual([]);
    expect(squarify([{id: 'a', value: 1}], {x: 0, y: 0, w: 0, h: 10})).toEqual([]);
  });
  test('one category fills the whole rectangle', () => {
    expect(squarify([{id: 'only', value: 12.5}], box)).toEqual([{id: 'only', value: 12.5, x: 0, y: 0, w: 600, h: 400}]);
  });
  test('a tall box lays rows along the top', () => {
    const rects = squarify([{id: 'a', value: 1}, {id: 'b', value: 1}], {x: 10, y: 20, w: 100, h: 400});
    expect(rects.map(r => [r.id, r.x, r.y, r.w, r.h])).toEqual([['a', 10, 20, 100, 200], ['b', 10, 220, 100, 200]]);
  });
  test('labels only where they fit', () => {
    expect(labelled({w: 100, h: 60})).toBe(true);
    expect(labelled({w: 300, h: 20})).toBe(false);
    expect(labelled({w: 40, h: 40})).toBe(false);
  });
  test('one map per currency, never mixed; shares inside one currency; split parts by category', () => {
    const e = (amount: string, category: string, currency = 'EUR', extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `${category}${amount}${currency}`, kind: 'expense', amount, currency, category, date: '2026-10-10', createdAt: '2026-10-10T10:00:00.000Z', ...extra});
    const maps = spendingMaps([e('30.00', 'Fun'), e('10.00', 'Home'), e('5.00', 'Fun', 'USD'), e('20.00', 'Groceries', 'EUR', {parts: [{amount: '15.00'}, {amount: '5.00', category: 'Home'}]}), {...e('99.00', 'Salary'), kind: 'income'}], '2026-10-01', '2026-10-31');
    expect(maps.map(m => [m.currency, m.total])).toEqual([['EUR', 6000], ['USD', 500]]);
    expect(maps[0]!.rows.map(r => [r.category, r.total, r.share])).toEqual([['Fun', 3000, 0.5], ['Groceries', 1500, 0.25], ['Home', 1500, 0.25]]);
  });
  test('the Showcase month makes a map', () => {
    const today = '2026-11-20', {start, end} = monthOf(today);
    const maps = spendingMaps(showcaseMoneyLog(today).entries, start, end);
    expect(maps).toHaveLength(1);
    expect(area(squarify(maps[0]!.rows.map(r => ({id: r.category, value: r.total})), box))).toBeCloseTo(240000, 6);
  });
});
