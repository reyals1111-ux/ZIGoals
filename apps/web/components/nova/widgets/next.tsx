'use client';
import Link from 'next/link';
import {PillarMark} from '../../pillars';
import type {Pillar} from '../../../lib/pillar-route';
import {nextItems, type NextItem} from '../../../lib/nova/holo/agenda';
import {formatClock} from '../../../lib/visual-format';
import {useAgendaToday} from '../holo/use-agenda-today';
import {NovaEmpty, NovaReading} from './empty';

const WHEN: Record<NextItem['when'], (time: string | null) => string> = {next: t => `at ${t}`, later: t => `at ${t}`, earlier: t => `earlier, ${t}`, anytime: () => 'any time today'};
const PILLARS = new Set(['goals', 'habits', 'health', 'wealth']);
/**
 * "Next three": the next three things in the day, across every source. Session AL Part 11 (lane L8; P-LA-14, LA-023): from
 * the Agenda's own day (habits at their times, tasks with their times, contributions, bills, workouts, meals, events), by
 * time; the orbit's candidates had no habit times and no tasks.
 */
export default function NextWidget() {
  const {items, now} = useAgendaToday();
  if (!items) return <NovaReading/>;
  const next = nextItems(items, now, 3);
  if (!next.length) return <NovaEmpty pillar="habits" ghost="rows" href="/app/habits" action="Add a habit">{items.length ? 'Nothing else is due today. A calm orbit.' : 'Nothing is planned yet. A habit, a task or a bill shows up here at its time.'}</NovaEmpty>;
  return <ol className="nova-next" aria-label="Next in your day">{next.map(item => <li key={item.id} data-pillar={item.pillar}>
    {PILLARS.has(item.pillar) ? <PillarMark pillar={item.pillar as Pillar} size={14}/> : <span aria-hidden="true"/>}
    {item.href ? <Link href={item.href} prefetch={false}>{item.title}</Link> : <span>{item.title}</span>}
    <small>{WHEN[item.when](item.time ? formatClock(item.time) : null)}</small>
  </li>)}</ol>;
}
