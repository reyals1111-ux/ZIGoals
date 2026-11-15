'use client';
import {useMemo} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useHealth} from '../../health/use-health';
import {useLocalToday} from '../../use-local-today';
import {waterToday} from '../../../lib/health-daily';
import {dailySeries} from '../../../lib/sleep/engine';
import {BILLS} from '../../../lib/bills/schema';
import {billOccurrences} from '../../../lib/bills/store';
import {FOCUS_SESSIONS} from '../../../lib/focus-sessions/schema';
import {gardenOf} from '../../../lib/focus-sessions/engine';
import {daysBetween, glanceLines, type GlanceFacts} from '../../../lib/nova/widgets/words';
import type {WidgetSize} from '../../../lib/nova/store';
import {HoloFigure, TickRing} from '../holo/parts';
import {useOrbitDay} from './use-orbit-day';
import {NovaEmpty, NovaReading} from './empty';

/**
 * "Day at a glance": the day in a few lines, from the person's own records only — the orbit, last night, water, meals,
 * contributions due, a bill close by, focus this week. No weather and nothing fetched. A part that could not be read is
 * left out, never shown as zero (lib/nova/widgets/words.ts).
 * Session AM-2: the day's orbit is a small ring gauge beside the lines (the same count as its line), and each line is a
 * row with a lit node.
 */
export default function GlanceWidget({size}: {size?: WidgetSize}) {
  const orbit = useOrbitDay(), health = useHealth(), bills = useDeviceRecord(BILLS), focus = useDeviceRecord(FOCUS_SESSIONS), today = useLocalToday();
  const ready = !!orbit.summary && health.loaded && bills.loaded && focus.loaded;
  const glance = useMemo(() => {
    if (!ready) return null;
    const s = orbit.summary!, facts: GlanceFacts = {orbit: null, water: null, meals: null, nextBill: null, focusMinutes: null, sleepMinutes: null, contributionsDue: s.contributionsDue};
    if (s.source !== 'none') facts.orbit = {done: s.done, total: s.total, unit: s.source === 'checklist' ? 'planet' : 'habit'};
    if (!health.error) try {
      const water = waterToday(health.data), day = water.day; // Session AL: L2's one water source
      facts.water = {ml: water.millilitres, targetMl: water.targetMl, unit: water.unit};
      facts.meals = health.data.diary.filter(e => e.date === day).length;
      if (health.data.sleep) facts.sleepMinutes = dailySeries(health.data.sleep, today, 1)[0]?.asleep ?? null;
    } catch { /* an unreadable part is left out */ }
    if (!bills.unreadable) { const next = billOccurrences(bills.data, today, 7)[0]; if (next) facts.nextBill = {title: next.title, days: daysBetween(today, next.due)}; }
    if (!focus.unreadable) facts.focusMinutes = gardenOf(focus.data, today).weekMinutes;
    return {lines: glanceLines(facts), orbit: facts.orbit};
  }, [ready, orbit.summary, health.data, health.error, bills.data, bills.unreadable, focus.data, focus.unreadable, today]);
  if (!glance) return <NovaReading/>;
  const {lines, orbit: o} = glance;
  if (!lines.length) return <NovaEmpty pillar="orbit" ghost="rows">Your day at a glance fills in from your own records: a habit, a glass of water, a night of sleep, a bill.</NovaEmpty>;
  return <div className="hw-glance" data-size={size}>
    {/* Round 3: the ring is always there — unlit, with "—", while nothing is counted on the day's orbit yet (never a zero). */}
    <TickRing share={o && o.total > 0 ? o.done / o.total : null} small={size === 'S'} className="hw-mini-ring"><span aria-hidden="true"><HoloFigure text={o && o.total > 0 ? `${o.done}/${o.total}` : '—'} className="holo-num-ring"/></span></TickRing>
    <ul className="nova-glance hw-rows">{lines.map(line => <li key={line} className="hw-row">{line}</li>)}</ul>
  </div>;
}
