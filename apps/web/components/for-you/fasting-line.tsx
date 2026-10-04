'use client';
import Link from 'next/link';
import {elapsedMs, formatFast} from '../../lib/fasting/engine';
import type {FastingSession} from '../../lib/fasting/schema';

/** Today's one-line card while a fast is running (HE6): the clock and a link to Health. */
export function FastingLine({running, now}: {running: FastingSession; now: Date}) {
  const {ms} = elapsedMs(running, now), target = running.targetHours * 3_600_000;
  return <section className="panel for-you-card fasting-line" aria-label="Fasting">
    <p className="fasting-line-text"><strong>{ms >= target ? 'Target reached' : 'Fasting'} · {formatFast(Math.min(ms, target))} of {running.targetHours} h</strong></p>
    <Link className="text-link" href="/app/health#fasting">Open Health →</Link>
  </section>;
}
