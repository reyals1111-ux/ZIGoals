'use client';
import type {ReactNode} from 'react';
import {REASON_WORDS, type UnavailableReason} from '../../lib/earn/live/envelope';
import type {LiveAnswer, LiveState} from '../../lib/earn/client';
import {STALE_AFTER_MS, updatedAgo} from '../../lib/earn/format';
import {formatDateTime} from '../../lib/visual-format';

/**
 * Session AF (L1, non-negotiable 4): every number on the Earn page is a live figure with its source and age ("updated 3
 * min ago"), or the word "unavailable" with the reason. Never a guess, never zero for unknown. `data-live-figure` and
 * `data-reason` are what the browser tests and the hosted verifier's Earn stage read.
 */
export type Reason = UnavailableReason | 'NOT_IN_THIS_BUILD';
export const reasonWords = (reason: Reason) => reason === 'NOT_IN_THIS_BUILD' ? 'this build of ZIGoals does not read it yet' : REASON_WORDS[reason];
/** A figure: shown, still loading, or unavailable with its reason. */
export type Shown = {kind: 'ok'; value: ReactNode; answer: LiveAnswer<unknown>} | {kind: 'loading'} | {kind: 'unavailable'; reason: Reason};
/** The figure that `pick` reads from a family's state; `pick` returns null when the answer lacks it (then unavailable). */
export function shown<T>(state: LiveState<T>, pick: (data: T) => ReactNode | {unavailable: Reason} | null): Shown {
  if (state.phase === 'loading') return {kind: 'loading'};
  if (state.phase === 'unavailable') return {kind: 'unavailable', reason: state.reason};
  let value: ReactNode | {unavailable: Reason} | null;
  try { value = pick(state.answer.data); } catch { value = {unavailable: 'MALFORMED'}; }
  if (value === null || value === undefined) return {kind: 'unavailable', reason: 'MALFORMED'};
  if (typeof value === 'object' && 'unavailable' in (value as object)) return {kind: 'unavailable', reason: (value as {unavailable: Reason}).unavailable};
  return {kind: 'ok', value: value as ReactNode, answer: state.answer};
}
export function Unavailable({reason, short = false}: {reason: Reason; short?: boolean}) {
  return <span className="earn-unavailable" data-reason={reason}>unavailable{short ? '' : <> <span className="earn-reason">({reasonWords(reason)})</span></>}</span>;
}
/** Where a figure came from and how old it is. */
export function SourceLine({answer, now, third = false}: {answer: LiveAnswer<unknown>; now: number; third?: boolean}) {
  const old = answer.stale || now - Date.parse(answer.fetchedAt) > STALE_AFTER_MS;
  return <small className="earn-source" data-stale={old || undefined}>
    {third && !/third party/i.test(answer.source.name) ? <><b>third party</b> · </> : null}{answer.source.name}{answer.height ? <> · block {answer.height}</> : null} · <span className="earn-age">{old ? updatedAgo(answer.fetchedAt, now).replace('updated', 'last read') : updatedAgo(answer.fetchedAt, now)}</span>
    {/* Session AF chunk 2: every figure says "as of": the block's time when the source has blocks, else the time of the read. */}
    <> · as of <time dateTime={answer.observedAt ?? answer.fetchedAt}>{formatDateTime(answer.observedAt ?? answer.fetchedAt)}</time></>
    {answer.stale && answer.reason ? <> · the latest read failed: {reasonWords(answer.reason)}</> : null}
  </small>;
}
export function LiveFigure({label, figure, now, hint, third = false, id, big = false}: {label: ReactNode; figure: Shown; now: number; hint?: ReactNode; third?: boolean; id?: string; big?: boolean}) {
  return <div className="earn-figure" data-live-figure={id ?? true} data-state={figure.kind} data-reason={figure.kind === 'unavailable' ? figure.reason : undefined} data-big={big || undefined} aria-busy={figure.kind === 'loading' || undefined}>
    <dt>{label}</dt>
    <dd>
      {figure.kind === 'ok' ? <strong className="earn-value">{figure.value}</strong> : figure.kind === 'loading' ? <span className="earn-reading">reading…</span> : <strong className="earn-value is-unavailable"><Unavailable reason={figure.reason}/></strong>}
      {figure.kind === 'ok' && <SourceLine answer={figure.answer} now={now} third={third}/>}
      {hint && <small className="earn-hint">{hint}</small>}
    </dd>
  </div>;
}
