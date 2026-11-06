'use client';
import {useEffect, useMemo, useState} from 'react';
import {useAgenda} from '../../agenda/use-agenda';
import {buildAgenda} from '../../../lib/agenda/build';
import {eventAgendaItems, taskAgendaItems, withExtras} from '../../../lib/agenda/time-items';
import {deviceDay} from '../../../lib/tasks/device';
import {wallClock} from '../../../lib/zone-time';
import {everyHalfMinute} from '../../half-minute';
import type {ClockInput} from '../../../lib/nova/holo/agenda';

/**
 * Session AL Part 11 (lane L8; P-LA-14): today's agenda exactly as the Agenda page's day view builds it — every record
 * through its page's hook (components/agenda/use-agenda.ts), buildAgenda for today, then the tasks and imported events
 * (lib/agenda/time-items.ts), with the person's own hidden sources left out — and the wall clock, kept every half minute.
 */
export function useAgendaToday(): {items: ClockInput[] | null; now: string; today: string; unreadable: string[]} {
  const {loaded, input, today, record, unreadable, tasks, calendars, zone} = useAgenda();
  const [now, setNow] = useState('00:00');
  useEffect(() => { const tick = () => { try { setNow(wallClock(Date.now(), zone).clock); } catch { /* keeps the last time */ } }; tick(); return everyHalfMinute(tick); }, [zone]);
  const items = useMemo(() => {
    if (!loaded || !input) return null;
    const hidden = record.unreadable ? [] : record.data.hidden ?? [], hiddenExtra = record.unreadable ? [] : record.data.hiddenExtra ?? [];
    const day = buildAgenda(input, today, today).map(d => ({date: d.date, items: d.items.filter(i => !hidden.includes(i.source))}));
    const extra = [...(tasks.loaded && !tasks.unreadable ? taskAgendaItems(tasks.data, today, today, today, deviceDay) : []), ...(calendars.loaded && !calendars.unreadable ? eventAgendaItems(calendars.data, today, today, zone) : [])];
    const all = withExtras(day, extra, hiddenExtra)[0]?.items ?? [];
    return all.map(i => ({id: i.id, source: i.source, pillar: i.pillar, title: i.title, time: i.time, href: i.href, state: i.state}));
  }, [loaded, input, today, record.unreadable, record.data, tasks.loaded, tasks.unreadable, tasks.data, calendars.loaded, calendars.unreadable, calendars.data, zone]);
  return {items, now, today, unreadable};
}
