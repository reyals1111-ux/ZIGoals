import {describe, expect, it} from 'vitest';
import {composeStage, starFill, starPlan, tierCells, wingCapacity, wingOrder, wingTiers, TIER_GAP, TIER_UNIT_MIN, WING_MIN, type Composed} from './compose';
import type {NovaWidget, WidgetSize} from './store';

const w = (id: string, size: WidgetSize = 'M', slot = 0): NovaWidget => ({id, size, slot});
const list = (n: number, size: WidgetSize = 'M') => Array.from({length: n}, (_, i) => w(`w${i}`, size, i));
const wing = (c: Composed[], side: 'left' | 'right') => wingOrder(c, side).map(x => `${x.id}:${x.tier}:${x.show}`);

describe('Session AR (ADR-041): the composed stage', () => {
  it('a wing holds the rows its height allows, each unit at least TIER_UNIT_MIN', () => {
    expect(wingTiers(300)).toEqual(['hero']);
    expect(wingTiers(430)).toEqual(['hero', 'compact']);
    expect(wingTiers(587)).toEqual(['hero', 'supporting']); // 1440 × 900
    expect(wingTiers(726)).toEqual(['hero', 'supporting', 'compact']); // 1920 × 1080
    expect(wingTiers(1083)).toEqual(['hero', 'supporting', 'compact']); // 2560 × 1440
    expect(wingTiers(null)).toEqual(['hero', 'supporting']);
    // A Large hero weighs four units, so it leaves less.
    expect(wingTiers(587, true)).toEqual(['hero', 'compact']);
  });
  it('a wide wing holds two supporting panels side by side, and compact plates by their least width', () => {
    expect(tierCells('hero', 2000)).toBe(1);
    expect(tierCells('supporting', 420)).toBe(1);
    expect(tierCells('supporting', 744)).toBe(2);
    expect(tierCells('compact', 350)).toBe(1);
    expect(tierCells('compact', 620)).toBe(2);
    expect(tierCells('compact', 2000)).toBe(3);
    expect(wingCapacity(587, 350)).toBe(2);
    expect(wingCapacity(726, 418)).toBe(3);
    expect(wingCapacity(1083, 744)).toBe(5);
  });
  it('S2 at 1440 × 900: from four widgets each wing is a hero and a supporting panel, the right wing upside down', () => {
    const c = composeStage(list(4), {height: 587, wingWidth: 350});
    expect(wing(c, 'left')).toEqual(['w0:hero:M', 'w2:supporting:M']);
    expect(wing(c, 'right')).toEqual(['w3:supporting:M', 'w1:hero:M']); // drawn top to bottom: the hero stands at the foot
    const hero = c[0]!, support = c[2]!;
    expect(hero.height + support.height + TIER_GAP).toBeLessThanOrEqual(587);
    expect(hero.height).toBeGreaterThan(support.height * 1.4);
    expect(support.height / 2).toBeGreaterThanOrEqual(TIER_UNIT_MIN);
    expect(c.every(x => x.side !== 'band')).toBe(true);
  });
  it('panels differ in size by structure: hero, supporting, compact share the height 3 : 2 : 1, the rest rests on the band', () => {
    const c = composeStage(list(10), {height: 726, wingWidth: 418});
    expect(wing(c, 'left')).toEqual(['w0:hero:M', 'w2:supporting:M', 'w4:compact:S']);
    expect(wing(c, 'right')).toEqual(['w5:compact:S', 'w3:supporting:M', 'w1:hero:M']);
    expect(c.filter(x => x.side === 'band').map(x => x.id)).toEqual(['w6', 'w7', 'w8', 'w9']);
    const [h, s, k] = [c[0]!.height, c[2]!.height, c[4]!.height];
    expect(Math.abs(h / k - 3)).toBeLessThan(0.05); expect(Math.abs(s / k - 2)).toBeLessThan(0.05);
    // The stored size is never touched; a band widget shows as stored.
    expect(c.map(x => x.size)).toEqual(list(10).map(x => x.size));
    expect(c[9]!.show).toBe('M');
  });
  it('a very wide wing: one hero, two supporting side by side, two compact plates; a hero that tall is the Large body', () => {
    const c = composeStage(list(10), {height: 1083, wingWidth: 744});
    expect(wing(c, 'left')).toEqual(['w0:hero:L', 'w2:supporting:M', 'w4:supporting:M', 'w6:compact:S', 'w8:compact:S']);
    expect(c[2]!.span).toBe(3); expect(c[0]!.span).toBe(6);
    expect(c.filter(x => x.side === 'band')).toHaveLength(0);
  });
  it('one widget is one hero; a hero in a narrow wing is the Medium body and no taller than 400 px', () => {
    const c = composeStage(list(1), {height: 1083, wingWidth: 300});
    expect(wing(c, 'left')).toEqual(['w0:hero:M']);
    expect(c[0]!.height).toBeLessThanOrEqual(400);
    const wide = composeStage(list(1), {height: 1083, wingWidth: 600});
    expect(wide[0]!.show).toBe('L');
  });
  it('S3: what was made on request leads its wing; among the pinned a Large one is the hero; a locked one is a compact plate', () => {
    const widgets = [w('a'), w('b'), w('big', 'L'), w('c')];
    const plain = composeStage(widgets, {height: 726, wingWidth: 418});
    expect(wing(plain, 'left')[0]).toBe('big:hero:M'); // a's wing: the Large one is lifted over it
    const made = composeStage(widgets, {height: 726, wingWidth: 418, made: id => id === 'a'});
    expect(wing(made, 'left')[0]).toMatch(/^a:hero/);
    const locked = composeStage(widgets, {height: 726, wingWidth: 418, slim: id => id === 'a'});
    expect(locked.find(x => x.id === 'a')!.show).toBe('S');
    expect(wing(locked, 'left').at(-1)).toMatch(/^a:/);
  });
  it('AM-D9: a widget keeps its side while one is made beside it; the wing’s last steps down to the band', () => {
    const first = composeStage(list(4), {height: 587, wingWidth: 350});
    const side = new Map(first.map(x => [x.id, x.side] as const));
    const next = composeStage([w('new'), ...list(4)], {height: 587, wingWidth: 350, prefer: id => side.get(id), made: id => id === 'new'});
    for (const x of next.filter(x => x.id !== 'new' && x.side !== 'band')) expect(x.side, x.id).toBe(side.get(x.id));
    expect(next[0]!.tier).toBe('hero');
    expect(next.filter(x => x.side === 'band')).toHaveLength(1);
  });
  it('S3: two requests in a row are the two heroes (the new one takes the wing whose hero is older)', () => {
    const first = composeStage([w('one'), ...list(4)], {height: 587, wingWidth: 350, made: id => id === 'one'});
    const side = new Map(first.map(x => [x.id, x.side] as const));
    const next = composeStage([w('two'), w('one'), ...list(4)], {height: 587, wingWidth: 350, prefer: id => side.get(id), made: id => id === 'one' || id === 'two'});
    const one = next.find(x => x.id === 'one')!, two = next.find(x => x.id === 'two')!;
    expect(one.tier).toBe('hero'); expect(two.tier).toBe('hero');
    expect(two.side).not.toBe(one.side);
  });
  it('order in, order out', () => {
    const widgets = list(7);
    expect(composeStage(widgets, {height: 726, wingWidth: 418}).map(x => x.id)).toEqual(widgets.map(x => x.id));
  });
});

describe('Session AR (ADR-041 S1, S2): the star makes room', () => {
  it('one or two widgets: the large star; from six: exactly the size and column it had on main', () => {
    expect(starFill(0)).toBe(0); expect(starFill(2)).toBe(0); expect(starFill(4)).toBe(0.5); expect(starFill(6)).toBe(1); expect(starFill(40)).toBe(1);
    // 1440 × 900 with the left bar open: a stage of 1124 px, main's star 511 px in a column of 385 px.
    const at = (count: number) => starPlan({count, floorSize: 511, floorColumn: 385, room: 589, stage: 1124, gap: 20});
    expect(at(6)).toEqual({size: 511, column: 385});
    expect(at(12)).toEqual(at(6));
    const large = at(1);
    expect(large.column * 0.98 / 1124).toBeGreaterThanOrEqual(0.45); // the bezel is at least 45 % of the stage
    expect((1124 - large.column - 40) / 2).toBeGreaterThanOrEqual(WING_MIN);
    expect(at(2)).toEqual(large);
    // It steps down widget by widget and never goes below main's.
    const sizes = [2, 3, 4, 5, 6].map(n => at(n));
    for (let i = 1; i < sizes.length; i++) { expect(sizes[i]!.column).toBeLessThan(sizes[i - 1]!.column); expect(sizes[i]!.size).toBeGreaterThanOrEqual(511); }
  });
  it('the column always holds the whole bezel (S1), at every width', () => {
    for (const [stage, floorSize, floorColumn, room, gap] of [[1124, 511, 385, 589, 20], [1560, 782, 539, 928, 20], [2244, 1079, 938, 1711, 28]] as const) for (const count of [1, 3, 5, 8]) {
      const plan = starPlan({count, floorSize, floorColumn, room, stage, gap});
      expect(plan.column).toBeGreaterThanOrEqual(Math.round(floorColumn));
      expect(plan.column * 0.98 / stage, `${stage}/${count}`).toBeGreaterThanOrEqual(count <= 2 ? 0.45 : 0.33);
    }
  });
});
