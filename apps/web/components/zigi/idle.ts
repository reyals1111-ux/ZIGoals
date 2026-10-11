/**
 * ZIGi's idle rotation (Session X-Local Part 3, ADR-017 S7; owner decision D2): while ZIGi rests in `idle`, the base
 * clip (F001) plays, and now and then a quieter variation takes its place: a glance (listening F004, thinking T001) or,
 * rarely, an accent (insight F003), plus the Studio-4 idle variants (X010, X011) once they land. The rules, all here as
 * pure functions over a seeded random number so the tests are exact:
 * - rare and randomised within bounds: a variation starts between MIN_GAP_MS and MAX_GAP_MS after the last one ended;
 * - never two attention-grabbing clips in a row: an accent is followed by a glance or the base, and at most one accent
 *   per ACCENT_EVERY_MS;
 * - never the same variation twice in a row (the studio's blink-timing rule);
 * - weights like the studio's blink timing: the base keeps half the picks, the variations share the rest;
 * - only under the person's Full animation (Calm is the base idle only; Off, reduced motion and Motion Off are posters),
 *   only while the tab is visible, the figure on screen and nobody typing (the hook in alive.ts enforces these);
 * - F008 sleepy is never a variation: it comes only from the existing inactivity rule in events.ts.
 */
import type {ExtraClip, Skin, StateFiles} from './manifest';
import {idleVariantsOf, ZIGI_MANIFEST} from './manifest';

export type IdleVariant = {id: string; files: StateFiles; accent: boolean; durationMs: number; weight: number};
export const MIN_GAP_MS = 25_000, MAX_GAP_MS = 60_000, ACCENT_EVERY_MS = 180_000, BASE_WEIGHT = 0.5;
/** The delivered clips that read as idle-appropriate (decided by watching them; ZIGI_ASSET_SPEC.md "The idle pool"). */
const DELIVERED_POOL: readonly {state: string; accent: boolean; weight: number}[] = [{state: 'listening', accent: false, weight: 0.5}, {state: 'thinking', accent: false, weight: 0.3}, {state: 'insight', accent: true, weight: 0.2}];
const durationOf = (state: string) => ZIGI_MANIFEST.states[state]?.durationMs ?? 4000;
/** The variations available for a skin: the delivered pool, then the Studio-4 idle variants that have landed. */
export function idlePool(skin: Skin): IdleVariant[] {
  const pool: IdleVariant[] = [];
  for (const {state, accent, weight} of DELIVERED_POOL) { const files = skin.states[state]; if (files?.animated && !files.wears) pool.push({id: state, files, accent, durationMs: durationOf(state), weight}); }
  for (const clip of idleVariantsOf(skin)) if (clip.files.animated) pool.push({id: clip.name, files: clip.files, accent: false, durationMs: clip.durationMs || 5000, weight: 0.5});
  return pool;
}
export type IdlePlan = {at: number; variant: IdleVariant | null};
export type IdleHistory = {lastId: string | null; lastAccentAt: number};
/** The next pick: the base (null) or a variation, given the history; `random` is a number in [0, 1). */
export function pickIdle(pool: readonly IdleVariant[], history: IdleHistory, now: number, random: number): IdleVariant | null {
  if (!pool.length) return null;
  const allowed = pool.filter(v => v.id !== history.lastId && (!v.accent || now - history.lastAccentAt >= ACCENT_EVERY_MS));
  if (!allowed.length) return null;
  if (random < BASE_WEIGHT) return null;
  const total = allowed.reduce((sum, v) => sum + v.weight, 0);
  let point = ((random - BASE_WEIGHT) / (1 - BASE_WEIGHT)) * total;
  for (const v of allowed) { point -= v.weight; if (point < 0) return v; }
  return allowed[allowed.length - 1]!;
}
/** When the next variation may start: a random gap within the bounds after the last one ended. */
export const nextGapMs = (random: number) => Math.round(MIN_GAP_MS + random * (MAX_GAP_MS - MIN_GAP_MS));
/** A ZigiFrame for the figure: the variant's files, with the APNG where asked for. */
export const variantFrame = (v: IdleVariant, apng: boolean, base: {x1: string; x2: string}) => ({poster: {x1: v.files['1x'] ?? base.x1, x2: v.files['2x'] ?? base.x2}, animated: (apng ? v.files.animatedFallback : v.files.animated) ?? null, own: true});
export type {ExtraClip};
