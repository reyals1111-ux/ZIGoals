'use client';
import {dayLine} from '../../lib/nova/day-line';
import {useLocalToday} from '../use-local-today';
import {useOrbitDay} from './widgets/use-orbit-day';
import type {NovaCounts} from './use-counts';

/**
 * Session AK P3 (NOVA_DESIGN_REVIEW.md ND-3): the line under the greeting that says what the person's day holds, built on
 * this device from their own records (today's orbit, as Today's Daily orbit card reads it, and NOVA's live counts). Not
 * typed and not a live region: it is read once with the stage; it fades in at the end of the opening (nova.css), and under
 * Calm, Off and reduced motion it is simply there. Its own chunk, so the stage's first paint does not wait for it.
 */
export default function NovaDayLine({counts}: {counts: NovaCounts}) {
  const {summary} = useOrbitDay(), today = useLocalToday();
  const line = dayLine({
    next: summary ? summary.next[0]?.label ?? '' : null, planned: summary ? summary.total : null,
    habitsLeft: counts.habitsLeft, waterToGoMl: counts.waterToGoMl, waterUnit: counts.waterUnit,
    bill: counts.nextBill ? {title: counts.nextBill.title, due: counts.nextBill.due} : null, today,
  });
  return <p className="nova-dayline" data-ready={line ? '' : undefined} title={line ?? undefined}>{line ?? ' '}</p>;
}
