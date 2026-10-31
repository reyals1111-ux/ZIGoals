/**
 * ZIGi's variant rotation (Session AK Part 12, Studio-4 preparation): when ZIGi starts speaking, listening, thinking or
 * a small celebration, the clip for that play is the state's own (the base) or, now and then, one of Studio-4's variants
 * for it (X050–X054, `extras.variants` in the manifest). The rules, pure and over a seeded random number so the tests
 * are exact:
 * - the base plays at least half the time, in any run of plays, not only on average: a pool's first play and the play
 *   after a variant are the base, and from the base a variant follows with probability 1 − BASE_SHARE;
 * - never the same variant twice in a row (and never two variants in a row at all);
 * - a pool with no landed variant always plays the base: until the art lands, nothing changes.
 * Only under the person's Full animation with motion allowed (the hook in alive.ts checks); stills never rotate.
 */
import {variantsOf, type ExtraClip, type Skin, type StateFiles} from './manifest';

export type VariantPool = 'speaking' | 'listening' | 'thinking' | 'celebrate-small';
export const VARIANT_POOLS: readonly VariantPool[] = ['speaking', 'listening', 'thinking', 'celebrate-small'];
/** The state whose own clip is each pool's base (the small celebration is `success`). */
export const POOL_STATE: Readonly<Record<VariantPool, string>> = {speaking: 'speaking', listening: 'listening', thinking: 'thinking', 'celebrate-small': 'success'};
export const BASE_SHARE = 0.5;
/** The history's mark for "the base played last". */
export const BASE = 'base';
export type Variant = {id: string; files: StateFiles; durationMs: number};

const isPool = (value: unknown): value is VariantPool => typeof value === 'string' && (VARIANT_POOLS as readonly string[]).includes(value);
/** A variant's pool: the slot's own `pool`, else the word after its code in the studio's name (X050-speaking-…). */
export function poolOf(clip: Pick<ExtraClip, 'name' | 'pool'>): VariantPool | null {
  if (isPool(clip.pool)) return clip.pool;
  const word = /^X0\d\d-(celebrate-small|speaking|listening|thinking)(?:-|$)/.exec(clip.name ?? '')?.[1];
  return isPool(word) ? word : null;
}
/** The landed variants of a skin, by pool (a clip with no pool is left out: it never plays by guesswork). */
export function variantPools(skin: Skin): Record<VariantPool, Variant[]> {
  const pools: Record<VariantPool, Variant[]> = {speaking: [], listening: [], thinking: [], 'celebrate-small': []};
  for (const clip of variantsOf(skin)) { const pool = poolOf(clip); if (pool) pools[pool].push({id: clip.name, files: clip.files, durationMs: clip.durationMs}); }
  return pools;
}
/** The pool a state starts, if any. */
export const poolForState = (state: string): VariantPool | null => VARIANT_POOLS.find(p => POOL_STATE[p] === state) ?? null;
/**
 * The clip for the next play of a pool: a variant, or null for the base. `lastId` is the pool's last play (BASE, a
 * variant's id, or null before the first, which is the base); `random` is a number in [0, 1).
 */
export function pickVariant(variants: readonly Variant[], lastId: string | null, random: number): Variant | null {
  if (!variants.length) return null;
  // The first play of a pool, and the play after a variant, is the base.
  if (lastId !== BASE) return null;
  if (!(random >= BASE_SHARE && random < 1)) return null;
  const index = Math.min(variants.length - 1, Math.floor(((random - BASE_SHARE) / (1 - BASE_SHARE)) * variants.length));
  return variants[index]!;
}
/** A small seeded generator (mulberry32): the same seed gives the same sequence, for tests and the test hook. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
