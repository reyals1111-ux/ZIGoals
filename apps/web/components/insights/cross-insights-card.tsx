'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {CELEBRATIONS} from '../../lib/celebrations';
import {zigiSignals} from '../zigi/bus';
import {useDeviceRecord} from '../ai/use-device-record';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {dismissInsight, hiddenInsights, readInsights} from '../../lib/insights/store';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import {CROSS_MIN_PER_SIDE, LABEL_WORDS, crossPillarInsights, hoursMinutes, whyText, type CrossUnclear} from '../../lib/insights/cross-pillar';
import {ENERGY} from '../../lib/energy/schema';
import {WORKOUTS} from '../../lib/workouts/schema';
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
  // Session AJ (item 10, D14): the daily check-in's energy and the workouts join the pairings (each only when kept).
  const energyRecord = useDeviceRecord(ENERGY), workoutsRecord = useDeviceRecord(WORKOUTS);
  const energy = energyRecord.loaded && !energyRecord.unreadable ? energyRecord.data : null, workouts = workoutsRecord.loaded && !workoutsRecord.unreadable ? workoutsRecord.data : null;
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => { try { return hiddenInsights(readInsights(localStorage).data, today); } catch { return new Set(); } });
  const [note, setNote] = useState('');
  const {ready, pending, unclear} = useMemo(() => crossPillarInsights({habits, health, today, spending, hidden, energy, workouts}), [habits, health, today, spending, hidden, energy, workouts]);
  // Session AJ (item 10; P4 moment 5): a pairing that first turns consistent makes ZIGi show an insight, once per pairing and
  // at most one a day (the celebrations record keeps it; it is not a celebration).
  const celebrations = useDeviceRecord(CELEBRATIONS);
  useEffect(() => {
    if (compact || !celebrations.loaded || celebrations.unreadable) return;
    if (Object.entries(celebrations.data.seen).some(([k, d]) => k.startsWith('insight:') && d === today)) return;
    const fresh = ready.find(i => i.label === 'consistent' && !celebrations.data.seen[`insight:${i.id}:consistent`]);
    if (!fresh) return;
    try { celebrations.update(n => ({...n, seen: {...n.seen, [`insight:${fresh.id}:consistent`]: today}})); zigiSignals.emit('hint_insight'); zigiSignals.emitValidated('insight_consistent'); /* Session AK Part 12: the Studio-4 reaction, once its art lands */ } catch { /* it plays another day */ }
  }, [compact, celebrations, ready, today]);
  const dismiss = (id: string, title: string) => { try { setHidden(hiddenInsights(dismissInsight(localStorage, id, today), today)); setNote(`“${title}” is hidden for 28 days.`); } catch (cause) { setNote(cause instanceof Error ? cause.message : 'This pairing could not be hidden on this device.'); } };
  return <section className={`panel cross-insights${compact ? ' is-compact' : ''}`} aria-labelledby={compact ? 'cross-insights-today' : 'cross-insights-title'}>
    <SectionHeading id={compact ? 'cross-insights-today' : 'cross-insights-title'} eyebrow="Across your life · last 90 days" title="On the same days" level={compact ? 3 : 2} action={compact ? <Link className="text-link" href="/app/review#cross-insights-title">Life review →</Link> : undefined} />
    {ready.length ? <ul className="cross-list">{(compact ? ready.slice(0, 1) : ready).map(i => <li key={i.id}>
      <strong>{i.title}</strong> <span className={`cross-label is-${i.label}`}>{LABEL_WORDS[i.label].label}</span>
      <p>{i.sentence}</p>
      <small>{i.withA.days} and {i.withoutA.days} days compared.</small>
      {!compact && <details className="cross-why"><summary>Why?</summary><p className="fine">{whyText(i)}</p></details>}
      {!compact && <button type="button" className="text-link" onClick={() => dismiss(i.id, i.title)}>Hide “{i.title}” for 28 days</button>}
    </li>)}</ul> : <p className="cross-empty">Not enough data yet. A pairing shows once each side has {CROSS_MIN_PER_SIDE} days of your own records.</p>}
    {compact && ready.length > 1 && <p className="cross-more">{ready.length - 1} more {ready.length === 2 ? 'pairing' : 'pairings'} in your Life review.</p>}
    {!compact && unclear.length > 0 && <details className="cross-pending cross-unclear">
      <summary>No clear difference so far</summary>
      <ul>{unclear.map(u => <li key={u.id}><span>{u.title}</span><span>{unclearLine(u)}</span></li>)}</ul>
      <p className="fine">Each has {CROSS_MIN_PER_SIDE} days a side or more, but the two sides are close: not a finding.</p>
    </details>}
    {pending.length > 0 && (!compact || !ready.length) && <details className="cross-pending" open={!ready.length && !compact ? true : undefined}>
      <summary>{ready.length ? 'Still collecting' : 'What each pairing has so far'}</summary>
      <ul>{pending.map(p => <li key={p.id}><span>{p.title}</span><span>{Math.min(p.withA, p.need)} of {p.need} days with · {Math.min(p.withoutA, p.need)} of {p.need} without</span></li>)}</ul>
    </details>}
    {note && <p role="status" className="fine">{note}</p>}
    <p className="fine">A pairing in your own records, not a cause and not advice. Nothing here leaves this device.</p>
  </section>;
}
/** Session AJ: the two sides of a pairing with no clear difference, in its own unit. */
function unclearLine(u: CrossUnclear): string {
  const v = (x: number) => u.unit === '%' ? `${Math.round(x * 100)}%` : u.unit === 'min' ? hoursMinutes(x) : `${x.toFixed(1)} of 5`;
  return `${v(u.withA.value)} with (${u.withA.days} days) · ${v(u.withoutA.value)} without (${u.withoutA.days} days)`;
}
