import * as z from 'zod';

/**
 * Session AF (ADR-028 H17, H58; `TIER 3 (data formats)`): the live envelope, version 1, of every /api/earn/* answer, read
 * by the Earn page, the hosted verifier's Earn stage and scripts/earn/live-check.mjs.
 *
 *   {version: 1, status: 'ok', source, height?, observedAt?, fetchedAt, stale, reason?, data}
 *   {version: 1, status: 'unavailable', reason, source, fetchedAt, stale: false, data: null}
 *
 * A source that fails is a normal state: the route answers HTTP 200 with `status: 'unavailable'` and the reason, and the
 * page says "unavailable" with that reason, never a guess and never zero. `stale: true` is the last good answer served
 * after a failed refresh (with the reason it failed), at most a few minutes old as the route's cache allows; its
 * `fetchedAt` stays the time of the read it came from. `source.origin` names the host that answered: it is shown as
 * text, never as a link (outgoing links come only from the verified link registry). Amounts are decimal strings, in the
 * chain's base units unless a field says otherwise; rates are decimal fractions ("0.0574" is 5.74 %).
 */
export const LIVE_VERSION = 1 as const;
export const UNAVAILABLE_REASONS = ['UPSTREAM_DOWN', 'TIMEOUT', 'TOO_LARGE', 'MALFORMED', 'OUT_OF_RANGE', 'WRONG_NETWORK', 'PIN_MISMATCH', 'RATE_LIMITED', 'SOURCES_DISAGREE', 'NOT_PUBLISHED'] as const;
export type UnavailableReason = (typeof UNAVAILABLE_REASONS)[number];
/** The reason in plain words, for the page and the verifier. */
export const REASON_WORDS: Readonly<Record<UnavailableReason, string>> = Object.freeze({
  UPSTREAM_DOWN: 'the source did not answer just now',
  TIMEOUT: 'the source took too long to answer',
  TOO_LARGE: 'the answer was larger than ZIGoals accepts',
  MALFORMED: 'the answer was not in the shape ZIGoals checks for',
  OUT_OF_RANGE: 'a figure was outside the range ZIGoals accepts as sane',
  WRONG_NETWORK: 'the answer came from a different network',
  PIN_MISMATCH: 'the contract is not the version ZIGoals checked',
  RATE_LIMITED: 'too many reads just now; try again in a minute',
  SOURCES_DISAGREE: 'two independent sources disagree by more than 2 %',
  NOT_PUBLISHED: 'no public source publishes this figure',
});
export type LiveSource = {name: string; origin: string};
export type LiveOk<T> = {version: 1; status: 'ok'; source: LiveSource; height?: string; observedAt?: string; fetchedAt: string; stale: boolean; reason?: UnavailableReason; data: T};
export type LiveUnavailable = {version: 1; status: 'unavailable'; reason: UnavailableReason; source: LiveSource; fetchedAt: string; stale: false; data: null};
export type LiveEnvelope<T> = LiveOk<T> | LiveUnavailable;

export function liveOk<T>(source: LiveSource, data: T, {height, observedAt, fetchedAt}: {height?: string; observedAt?: string; fetchedAt: string}): LiveOk<T> {
  return {version: LIVE_VERSION, status: 'ok', source, ...(height ? {height} : {}), ...(observedAt ? {observedAt} : {}), fetchedAt, stale: false, data};
}
export function liveUnavailable(source: LiveSource, reason: UnavailableReason, fetchedAt: string): LiveUnavailable {
  return {version: LIVE_VERSION, status: 'unavailable', reason, source, fetchedAt, stale: false, data: null};
}
/** A per-figure answer inside `data` (one figure can be unavailable while the rest of the answer is fine). */
export type Figure<T> = ({status: 'ok'} & T) | {status: 'unavailable'; reason: UnavailableReason};

const stamp = z.iso.datetime({offset: true});
const source = z.strictObject({name: z.string().min(1).max(80), origin: z.string().regex(/^https:\/\/[a-z0-9.-]+$/)});
const reason = z.enum(UNAVAILABLE_REASONS);
/** The page's reader: an answer that is not this shape is treated as unavailable (MALFORMED), never shown. */
export function liveEnvelopeSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion('status', [
    z.strictObject({version: z.literal(1), status: z.literal('ok'), source, height: z.string().regex(/^\d{1,20}$/).optional(), observedAt: stamp.optional(), fetchedAt: stamp, stale: z.boolean(), reason: reason.optional(), data}),
    z.strictObject({version: z.literal(1), status: z.literal('unavailable'), reason, source, fetchedAt: stamp, stale: z.literal(false), data: z.null()}),
  ]);
}
