import {habitDay, type Habit} from '../habits';
import {addLocalDays} from '../local-date';

/**
 * Session AV lane 2 (r4-mind; LEDGER #327, Atoms' start small, then step up): a habit's small version ("one page") beside
 * its full one (the habit as it is), and the next step the person wrote ("two pages"). Which one they are doing now is
 * theirs to choose. With the step-up card switched on (off by default), after four weeks done on most due days one quiet
 * card offers the next size up; after two thin weeks it offers the small version again. The person decides; nothing
 * changes by itself, and "Not now" rests the card for two weeks. Kept in the loose habit extras as `stepUp`, {habitId:
 * {small?, next?, now?, since?, card?, later?}} (TIER 3 (stored format)); read with plain checks, a value this build
 * cannot read is left out, and fields it does not know are kept. Pure.
 */
export const STEP_MAX = 60, UP_DAYS = 28, THIN_DAYS = 14, REST_DAYS = 14, UP_SHARE = 0.8, THIN_SHARE = 0.5, MIN_DUE = 4;
export const SIZES = ['small', 'full', 'next'] as const;
export type Size = (typeof SIZES)[number];
export type StepUp = {small?: string; next?: string; now: Size; since?: string; card: boolean; later?: string};
const DAY = /^\d{4}-\d{2}-\d{2}$/, PLAIN = /^[^\u0000-\u001f\u007f]*$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const words = (v: unknown) => typeof v === 'string' && v.trim() && v.length <= STEP_MAX && PLAIN.test(v) ? v.trim() : undefined;
export const cleanStep = (text: string) => text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, STEP_MAX).trim();
/** A habit's sizes as this build reads them (the full one when nothing is set). */
export function stepUpOf(extras: unknown, habitId: string): StepUp {
  const all = isObj(extras) && isObj(extras.stepUp) ? extras.stepUp : {}, v = Object.hasOwn(all, habitId) && isObj(all[habitId]) ? all[habitId] as Record<string, unknown> : {};
  const small = words(v.small), next = words(v.next);
  let now: Size = (SIZES as readonly unknown[]).includes(v.now) ? v.now as Size : 'full';
  if ((now === 'small' && !small) || (now === 'next' && !next)) now = 'full';
  return {...(small ? {small} : {}), ...(next ? {next} : {}), now, ...(typeof v.since === 'string' && DAY.test(v.since) ? {since: v.since} : {}), card: v.card === true, ...(typeof v.later === 'string' && DAY.test(v.later) ? {later: v.later} : {})};
}
/** Writes one habit's entry: the fields given change, the rest (a later build's too) stay; an empty entry is removed. */
export function setStepUp<T extends object>(extras: T, habitId: string, change: {small?: string | null; next?: string | null; now?: Size; since?: string; card?: boolean; later?: string | null}): T {
  if (!habitId || habitId === '__proto__') throw new Error('This habit could not be found.');
  const all = isObj((extras as {stepUp?: unknown}).stepUp) ? {...(extras as {stepUp: Record<string, unknown>}).stepUp} : {};
  const v: Record<string, unknown> = isObj(all[habitId]) ? {...all[habitId] as Record<string, unknown>} : {};
  for (const k of ['small', 'next'] as const) if (k in change) { const t = cleanStep(change[k] ?? ''); if (t) v[k] = t; else delete v[k]; }
  if (change.now) { v.now = change.now; v.since = change.since ?? v.since; }
  if ('card' in change) { if (change.card) v.card = true; else delete v.card; }
  if ('later' in change) { if (change.later) v.later = change.later; else delete v.later; }
  const read = stepUpOf({stepUp: {[habitId]: v}}, habitId);
  if (change.now === 'small' && !read.small) throw new Error('Write the small version first.');
  if (change.now === 'next' && !read.next) throw new Error('Write the next step first.');
  if (v.now === 'full') delete v.now;
  if (Object.keys(v).filter(k => k !== 'since').length) all[habitId] = v; else delete all[habitId];
  const {stepUp: _drop, ...rest} = extras as T & {stepUp?: unknown}; void _drop;
  return (Object.keys(all).length ? {...rest, stepUp: all} : rest) as T;
}
/** What the habit is now, in words: the small version, the habit itself, or the next step. */
export const sizeWords = (habit: Pick<Habit, 'title'>, s: StepUp, size: Size = s.now) => size === 'small' ? s.small ?? habit.title : size === 'next' ? s.next ?? habit.title : habit.title;

/** Due days and done days in the `days` days ending yesterday (today is still open), from `since` on. */
export function dueDone(habit: Habit, today: string, days: number, since?: string): {due: number; done: number; from: string} {
  const start = addLocalDays(today, -days), from = since && since > start ? since : start;
  let due = 0, done = 0;
  for (let d = from; d < today; d = addLocalDays(d, 1)) {
    const s = habitDay(habit, d, today).status;
    if (s === 'complete') { due++; done++; } else if (s === 'due' || s === 'partial' || s === 'failed') due++;
  }
  return {due, done, from};
}
export type Offer = {kind: 'up'; to: 'full' | 'next'; words: string; done: number; due: number} | {kind: 'down'; words: string; done: number; due: number};
/**
 * The quiet card's offer, or null: only with the card on and not resting. Up: four full weeks at this size, done on at
 * least 80 % of at least four due days, and a size above (full from small; the next step from full, once written). Down:
 * the last two weeks done on under half of at least four due days, at a size above the small version (once written).
 */
export function stepOffer(habit: Habit, s: StepUp, today: string): Offer | null {
  if (!s.card || (s.later && s.later > today)) return null;
  const sinceOk = !s.since || addLocalDays(s.since, UP_DAYS) <= today;
  const up = dueDone(habit, today, UP_DAYS, s.since), thin = dueDone(habit, today, THIN_DAYS, s.since);
  if (s.now !== 'small' && s.small && thin.due >= MIN_DUE && thin.done / thin.due < THIN_SHARE) return {kind: 'down', words: s.small, done: thin.done, due: thin.due};
  if (sinceOk && up.due >= MIN_DUE && up.done / up.due >= UP_SHARE) {
    if (s.now === 'small') return {kind: 'up', to: 'full', words: habit.title, done: up.done, due: up.due};
    if (s.now === 'full' && s.next) return {kind: 'up', to: 'next', words: s.next, done: up.done, due: up.due};
  }
  return null;
}
/** Every habit with an offer (the card shows the first; the rest wait their turn). */
export function stepOffers(habits: readonly Habit[], extras: unknown, today: string): {habit: Habit; offer: Offer; step: StepUp}[] {
  return habits.flatMap(h => { const step = stepUpOf(extras, h.id), offer = stepOffer(h, step, today); return offer ? [{habit: h, offer, step}] : []; });
}
/** "Not now": the card rests for two weeks. */
export const restUntil = (today: string) => addLocalDays(today, REST_DAYS);
