import {describe, expect, it} from 'vitest';
import {skinOf, type Skin} from '../../components/zigi/manifest';
import {BASE, BASE_SHARE, pickVariant, poolForState, poolOf, POOL_STATE, seededRandom, VARIANT_POOLS, variantPools, type Variant} from '../../components/zigi/variants';

/**
 * Session AK Part 12: the speaking/listening/thinking/celebrate-small variant rotation, over seeded random numbers:
 * never the same clip twice in a row, the base clip at least half of every run, and today (no variants landed) always
 * the base, so nothing changes until the art lands.
 */
const v = (id: string): Variant => ({id, files: {animated: `/brand/figures/zigi/origami-nebula/${id}.anim.webp`}, durationMs: 1600});
/** Plays `n` entries of one pool and returns the clip ids ('base' for the state's own). */
function play(variants: Variant[], n: number, seed: number): string[] {
  const random = seededRandom(seed), out: string[] = [];
  let last: string | null = null;
  for (let i = 0; i < n; i++) { const pick = pickVariant(variants, last, random()); last = pick ? pick.id : BASE; out.push(last); }
  return out;
}

describe('pickVariant', () => {
  it('no variant landed: always the base, whatever the random number', () => {
    for (const r of [0, 0.49, 0.5, 0.75, 0.999]) expect(pickVariant([], null, r)).toBeNull();
    expect(play([], 200, 7).every(id => id === BASE)).toBe(true);
  });
  it('never the same clip twice in a row and never two variants in a row; the base holds at least half of every run', () => {
    for (const pool of [[v('X050-speaking-nod')], [v('X051-listening-tilt'), v('X053-listening-lean')], [v('a'), v('b'), v('c')]]) for (const seed of [1, 2, 3, 42, 2026]) {
      const ids = play(pool, 500, seed);
      for (let i = 1; i < ids.length; i++) { if (ids[i] !== BASE) { expect(ids[i - 1], `${seed}@${i}`).toBe(BASE); expect(ids[i]).not.toBe(ids[i - 1]); } }
      let base = 0; ids.forEach((id, i) => { if (id === BASE) base++; expect(base * 2, `${seed} prefix ${i + 1}`).toBeGreaterThanOrEqual(i + 1); });
      // Each landed variant does play (the rotation is real once the art lands).
      for (const clip of pool) expect(ids, clip.id).toContain(clip.id);
    }
  });
  it('the first play and the play after a variant are the base; from the base, random numbers below BASE_SHARE keep it and the variants share the rest evenly', () => {
    const pool = [v('a'), v('b')];
    expect(BASE_SHARE).toBe(0.5);
    expect(pickVariant(pool, null, 0.49)).toBeNull(); expect(pickVariant(pool, BASE, 0)).toBeNull();
    expect(pickVariant(pool, null, 0.9)).toBeNull(); expect(pickVariant(pool, BASE, 0.5)?.id).toBe('a'); expect(pickVariant(pool, BASE, 0.74)?.id).toBe('a'); expect(pickVariant(pool, BASE, 0.75)?.id).toBe('b'); expect(pickVariant(pool, BASE, 0.9999)?.id).toBe('b');
    expect(pickVariant(pool, 'a', 0.9)).toBeNull(); expect(pickVariant(pool, 'b', 0.6)).toBeNull();
    for (const bad of [NaN, -1, 1, 7]) expect(pickVariant(pool, BASE, bad)).toBeNull();
  });
  it('the seeded generator is deterministic and in [0, 1)', () => {
    const a = seededRandom(99), b = seededRandom(99), xs = Array.from({length: 1000}, () => a());
    expect(xs).toEqual(Array.from({length: 1000}, () => b()));
    expect(xs.every(x => x >= 0 && x < 1)).toBe(true);
    expect(play([v('a')], 50, 5)).toEqual(play([v('a')], 50, 5));
  });
});
describe('the pools', () => {
  it('speaking, listening, thinking and the small celebration (success) each have a base state', () => {
    expect(VARIANT_POOLS).toEqual(['speaking', 'listening', 'thinking', 'celebrate-small']);
    expect(POOL_STATE).toEqual({speaking: 'speaking', listening: 'listening', thinking: 'thinking', 'celebrate-small': 'success'});
    expect(poolForState('success')).toBe('celebrate-small'); expect(poolForState('speaking')).toBe('speaking'); expect(poolForState('idle')).toBeNull(); expect(poolForState('celebrate')).toBeNull();
  });
  it('a variant\'s pool is its own field, else the word after its code; anything else never plays', () => {
    expect(poolOf({name: 'X050-speaking-nod'})).toBe('speaking'); expect(poolOf({name: 'X054-celebrate-small-hop'})).toBe('celebrate-small'); expect(poolOf({name: 'X052-thinking'})).toBe('thinking');
    expect(poolOf({name: 'X053-lean', pool: 'listening'})).toBe('listening');
    expect(poolOf({name: 'X053-lean'})).toBeNull(); expect(poolOf({name: 'X050-speakingly'})).toBeNull(); expect(poolOf({name: 'X050-celebrate-nod'})).toBeNull(); expect(poolOf({name: 'X050-speaking', pool: 'dancing'})).toBe('speaking');
  });
  it('today\'s skin has the variant slots and no variant in any pool (no visual change)', () => {
    const skin = skinOf('origami-nebula');
    expect(Object.keys(skin.extras!.variants!)).toEqual(['X050', 'X051', 'X052', 'X053', 'X054']);
    expect(variantPools(skin)).toEqual({speaking: [], listening: [], thinking: [], 'celebrate-small': []});
    // A landed variant (animated file) joins its pool; one without an animated file, or no pool, does not.
    const filled: Skin = {...skin, extras: {...skin.extras!, variants: {
      X050: {name: 'X050-speaking-nod', files: {animated: '/brand/figures/zigi/origami-nebula/X050-speaking-nod.anim.webp'}, kind: 'loop', durationMs: 1600},
      X051: {name: 'X051-listening-tilt', files: {'1x': '/brand/figures/zigi/origami-nebula/X051-listening-tilt.webp'}, kind: 'loop', durationMs: 0},
      X052: {name: 'X052-hum', files: {animated: '/brand/figures/zigi/origami-nebula/X052-hum.anim.webp'}, kind: 'loop', durationMs: 0},
      X053: null, X054: null}}};
    expect(variantPools(filled)).toEqual({speaking: [{id: 'X050-speaking-nod', files: {animated: '/brand/figures/zigi/origami-nebula/X050-speaking-nod.anim.webp'}, durationMs: 1600}], listening: [], thinking: [], 'celebrate-small': []});
  });
});
