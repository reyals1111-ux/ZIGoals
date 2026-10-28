'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {dismissInsight, hiddenInsights, readInsights} from '../../lib/insights/store';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import {CROSS_MIN_PER_SIDE, crossPillarInsights} from '../../lib/insights/cross-pillar';
import {SectionHeading} from '../ui/section-heading';
import '../life-review/life-review.css';

/**
 * Cross-pillar insights (Session AA-Cloud Part 5, S3): what happened together on the same days, from the person's own
 * records. Ready pairings say it in counts; the others say how many days they have so far ("not enough data yet").
 * The card always says it is a pairing, not a cause. On Today (For you: the strongest one, the rest in the Life review)
 * and in the Life review.
 */
export function CrossInsightsCard({habits, health, today, compact = false}: {habits: HabitData; health: HealthData; today: string; compact?: boolean}) {
  // Session AI (feature 4): spending and mood join the pairings; a pairing can be dismissed for 28 days (the Insights key).
  const spending = useDeviceRecord(MONEY_LOG).data;
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => { try { return hiddenInsights(readInsights(localStorage).data, today); } catch { return new Set(); } });
  const [note, setNote] = useState('');
  const {ready, pending} = useMemo(() => crossPillarInsights({habits, health, today, spending, hidden}), [habits, health, today, spending, hidden]);
  const dismiss = (id: string, title: string) => { try { setHidden(hiddenInsights(dismissInsight(localStorage, id, today), today)); setNote(`“${title}” is hidden for 28 days.`); } catch (cause) { setNote(cause instanceof Error ? cause.message : 'This pairing could not be hidden on this device.'); } };
  return <section className={`panel cross-insights${compact ? ' is-compact' : ''}`} aria-labelledby={compact ? 'cross-insights-today' : 'cross-insights-title'}>
    <SectionHeading id={compact ? 'cross-insights-today' : 'cross-insights-title'} eyebrow="Across your life · last 90 days" title="On the same days" level={compact ? 3 : 2} action={compact ? <Link className="text-link" href="/app/review#cross-insights-title">Life review →</Link> : undefined} />
    {ready.length ? <ul className="cross-list">{(compact ? ready.slice(0, 1) : ready).map(i => <li key={i.id}>
      <strong>{i.title}</strong>
      <p>{i.sentence}</p>
      <small>{i.withA.days} and {i.withoutA.days} days compared.</small>
      {!compact && <details className="cross-why"><summary>Why?</summary><p className="fine">From your own records, {i.window.start} to {i.window.end}: {i.withA.days} days with and {i.withoutA.days} days without, paired by date. A pairing shows only once each side has {CROSS_MIN_PER_SIDE} days. It says what happened on the same days, never why; it is not advice, and only you decide what to do with it.</p></details>}
      {!compact && <button type="button" className="text-link" onClick={() => dismiss(i.id, i.title)}>Hide “{i.title}” for 28 days</button>}
    </li>)}</ul> : <p className="cross-empty">Not enough data yet. A pairing shows once each side has {CROSS_MIN_PER_SIDE} days of your own records.</p>}
    {compact && ready.length > 1 && <p className="cross-more">{ready.length - 1} more {ready.length === 2 ? 'pairing' : 'pairings'} in your Life review.</p>}
    {pending.length > 0 && (!compact || !ready.length) && <details className="cross-pending" open={!ready.length && !compact ? true : undefined}>
      <summary>{ready.length ? 'Still collecting' : 'What each pairing has so far'}</summary>
      <ul>{pending.map(p => <li key={p.id}><span>{p.title}</span><span>{Math.min(p.withA, p.need)} of {p.need} days with · {Math.min(p.withoutA, p.need)} of {p.need} without</span></li>)}</ul>
    </details>}
    {note && <p role="status" className="fine">{note}</p>}
    <p className="fine">A pairing in your own records, not a cause and not advice. Nothing here leaves this device.</p>
  </section>;
}
