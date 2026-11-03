'use client';
import Link from 'next/link';
import {PillarMark} from '../../pillars';
import type {OrbitItem} from '../../../lib/orbit-card/summary';
import {useOrbitDay} from './use-orbit-day';
import {NovaEmpty, NovaReading} from './empty';

const WHEN: Record<OrbitItem['when'], (time: string | null) => string> = {next: t => `at ${t}`, later: t => `at ${t}`, earlier: t => `earlier, ${t}`, anytime: () => 'any time today'};
/** "Next three": the next three things in the day, across the pillars (the Daily orbit card's own list). */
export default function NextWidget() {
  const {summary} = useOrbitDay();
  if (!summary) return <NovaReading/>;
  if (!summary.next.length) return <NovaEmpty pillar="habits" href="/app/habits" action="Add a habit">{summary.total > 0 ? 'Nothing else is due today. A calm orbit.' : 'Nothing is planned yet. A habit or a Checklist planet shows up here at its time.'}</NovaEmpty>;
  return <ol className="nova-next" aria-label="Next in your day">{summary.next.map(item => <li key={item.key} data-pillar={item.pillar}>
    <PillarMark pillar={item.pillar} size={14}/><Link href={item.href} prefetch={false}>{item.label}</Link><small>{WHEN[item.when](item.time)}</small>
  </li>)}</ol>;
}
