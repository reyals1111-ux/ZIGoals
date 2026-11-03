import type {MoneyEntry} from '../money-log/schema';
import {byCategory} from '../money-log/engine';

/**
 * Session AK (BUILD list 2 #18, COMPETITORS_2: Monarch treemap): the spending map. Each rectangle's area is a category's
 * share of this month's spending in one currency (never mixed with another currency). A squarified layout (Bruls,
 * Huizing and van Wijk, 2000) written by hand, pure, no dependency: items largest first, laid in rows along the shorter
 * side, a row closed when adding the next item would make its worst aspect ratio worse. The areas add up to the whole
 * rectangle. A label is drawn only where it fits (`labelled`); every category is always in the table beside the map.
 */
export type MapItem = {id: string; value: number};
export type MapRect = {id: string; value: number; x: number; y: number; w: number; h: number};
export type Box = {x: number; y: number; w: number; h: number};
export const MIN_LABEL_AREA = 2600, MIN_LABEL_SIDE = 44;

const worst = (row: readonly number[], side: number) => {
  const sum = row.reduce((s, v) => s + v, 0), max = Math.max(...row), min = Math.min(...row), s2 = side * side, sum2 = sum * sum;
  return Math.max((s2 * max) / sum2, sum2 / (s2 * min));
};

/** Squarified rectangles for the items with a value above zero, largest first; none for none. */
export function squarify(items: readonly MapItem[], box: Box): MapRect[] {
  const list = items.filter(i => Number.isFinite(i.value) && i.value > 0).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  const total = list.reduce((s, i) => s + i.value, 0);
  if (!list.length || box.w <= 0 || box.h <= 0) return [];
  const scale = (box.w * box.h) / total, areas = list.map(i => i.value * scale), out: MapRect[] = [];
  let free = {...box}, i = 0;
  while (i < list.length) {
    const side = Math.min(free.w, free.h), row: number[] = [areas[i]!];
    let j = i + 1;
    while (j < list.length && worst([...row, areas[j]!], side) <= worst(row, side)) row.push(areas[j++]!);
    const rowArea = row.reduce((s, a) => s + a, 0), last = j >= list.length;
    if (free.w >= free.h) {
      // A column on the left, as tall as the free box.
      const width = last ? free.w : rowArea / free.h;
      let y = free.y;
      row.forEach((a, k) => { const h = k === row.length - 1 ? free.y + free.h - y : a / width; out.push({id: list[i + k]!.id, value: list[i + k]!.value, x: free.x, y, w: width, h}); y += h; });
      free = {x: free.x + width, y: free.y, w: free.w - width, h: free.h};
    } else {
      // A row along the top, as wide as the free box.
      const height = last ? free.h : rowArea / free.w;
      let x = free.x;
      row.forEach((a, k) => { const w = k === row.length - 1 ? free.x + free.w - x : a / height; out.push({id: list[i + k]!.id, value: list[i + k]!.value, x, y: free.y, w, h: height}); x += w; });
      free = {x: free.x, y: free.y + height, w: free.w, h: free.h - height};
    }
    i = j;
  }
  return out;
}

/** True when the rectangle is big enough for its label (else the label is only in the table). */
export const labelled = (r: Pick<MapRect, 'w' | 'h'>) => r.w * r.h >= MIN_LABEL_AREA && Math.min(r.w, r.h) >= MIN_LABEL_SIDE;

export type CurrencyMap = {currency: string; total: number; rows: {category: string; total: number; count: number; share: number}[]};
/** This month's spending by category, one map per currency (the largest currency first), in cents. */
export function spendingMaps(entries: readonly MoneyEntry[], from: string, to: string): CurrencyMap[] {
  const by = new Map<string, CurrencyMap>();
  for (const r of byCategory(entries, from, to)) {
    const m = by.get(r.currency) ?? {currency: r.currency, total: 0, rows: []};
    m.total += r.total; m.rows.push({category: r.category, total: r.total, count: r.count, share: 0}); by.set(r.currency, m);
  }
  return [...by.values()].map(m => ({...m, rows: m.rows.map(r => ({...r, share: m.total ? r.total / m.total : 0}))})).sort((a, b) => b.total - a.total || a.currency.localeCompare(b.currency));
}
