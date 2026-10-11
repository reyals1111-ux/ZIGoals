import {describe, expect, it} from 'vitest';
import {ACCENT_EVERY_MS, BASE_WEIGHT, idlePool, MAX_GAP_MS, MIN_GAP_MS, nextGapMs, pickIdle, variantFrame} from '../../components/zigi/idle';
import {skinOf, type ExtraClip, type Skin} from '../../components/zigi/manifest';

// Session X-Local Part 3: the idle rotation's rules, exact under a seeded random number.
const skin = skinOf('origami-nebula');
const pool = idlePool(skin);
describe('the idle pool', () => {
  it('holds the delivered clips that read as idle-appropriate, never sleepy, and only clips of their own', () => {
    expect(pool.map(v => v.id)).toEqual(['listening', 'thinking', 'insight']);
    expect(pool.find(v => v.id === 'insight')!.accent).toBe(true); expect(pool.filter(v => v.accent).length).toBe(1);
    expect(pool.some(v => v.id === 'sleepy')).toBe(false);
    for (const v of pool) expect(v.files.animated, v.id).toMatch(/\.anim\.webp$/);
  });
  it('adds the Studio-4 idle variants once their files land', () => {
    const clip: ExtraClip = {name: 'X010-idle-glance', kind: 'loop', durationMs: 5000, files: {'1x': '/x.webp', '2x': '/x2.webp', animated: '/x.anim.webp', animatedFallback: '/x.anim.png'}};
    const later: Skin = {...skin, extras: {...skin.extras!, idleVariants: {X010: clip, X011: null}}};
    expect(idlePool(later).map(v => v.id)).toEqual(['listening', 'thinking', 'insight', 'X010-idle-glance']);
    expect(variantFrame(idlePool(later)[3]!, false, {x1: '/b.webp', x2: '/b2.webp'})).toEqual({poster: {x1: '/x.webp', x2: '/x2.webp'}, animated: '/x.anim.webp', own: true});
    expect(variantFrame(idlePool(later)[3]!, true, {x1: '/b.webp', x2: '/b2.webp'}).animated).toBe('/x.anim.png');
  });
});
describe('picking', () => {
  const none = {lastId: null, lastAccentAt: -Infinity};
  it('the base keeps half the picks; the variations share the rest by weight', () => {
    expect(pickIdle(pool, none, 0, 0)).toBeNull(); expect(pickIdle(pool, none, 0, BASE_WEIGHT - 0.001)).toBeNull();
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) { const v = pickIdle(pool, none, 0, (i + 0.5) / 1000); counts[v?.id ?? 'base'] = (counts[v?.id ?? 'base'] ?? 0) + 1; }
    expect(counts.base).toBe(500); expect(counts.listening).toBe(250); expect(counts.thinking).toBe(150); expect(counts.insight).toBe(100);
  });
  it('never the same variation twice in a row, never two accents close together', () => {
    for (let i = 0; i < 1000; i++) expect(pickIdle(pool, {lastId: 'listening', lastAccentAt: -Infinity}, 0, (i + 0.5) / 1000)?.id).not.toBe('listening');
    const after = {lastId: 'insight', lastAccentAt: 100_000};
    for (let i = 0; i < 1000; i++) expect(pickIdle(pool, after, 100_000 + ACCENT_EVERY_MS - 1, (i + 0.5) / 1000)?.accent ?? false).toBe(false);
    expect(pickIdle(pool, {lastId: null, lastAccentAt: 100_000}, 100_000 + ACCENT_EVERY_MS, 0.999)?.id).toBe('insight');
  });
  it('an empty pool or nothing allowed gives the base', () => {
    expect(pickIdle([], none, 0, 0.9)).toBeNull();
    expect(pickIdle([pool[0]!], {lastId: pool[0]!.id, lastAccentAt: 0}, 0, 0.9)).toBeNull();
  });
  it('the gap between variations stays inside the bounds', () => {
    expect(nextGapMs(0)).toBe(MIN_GAP_MS); expect(nextGapMs(1)).toBe(MAX_GAP_MS); expect(nextGapMs(0.5)).toBe((MIN_GAP_MS + MAX_GAP_MS) / 2);
    expect(MIN_GAP_MS).toBeGreaterThanOrEqual(20_000); expect(MAX_GAP_MS).toBeLessThanOrEqual(90_000);
  });
});
