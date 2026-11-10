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
import {useOrbitDay} from './use-orbit-day';
import {NovaEmpty, NovaReading} from './empty';

/**
 * "Day at a glance": the day in a few lines, from the person's own records only — the orbit, last night, water, meals,
 * contributions due, a bill close by, focus this week. No weather and nothing fetched. A part that could not be read is
 * left out, never shown as zero (lib/nova/widgets/words.ts).
 */
export default function GlanceWidget() {
  const orbit = useOrbitDay(), health = useHealth(), bills = useDeviceRecord(BILLS), focus = useDeviceRecord(FOCUS_SESSIONS), today = useLocalToday();
  const ready = !!orbit.summary && health.loaded && bills.loaded && focus.loaded;
  const lines = useMemo(() => {
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
    return glanceLines(facts);
  }, [ready, orbit.summary, health.data, health.error, bills.data, bills.unreadable, focus.data, focus.unreadable, today]);
  if (!lines) return <NovaReading/>;
  if (!lines.length) return <NovaEmpty pillar="orbit">Your day at a glance fills in from your own records: a habit, a glass of water, a night of sleep, a bill.</NovaEmpty>;
  return <ul className="nova-glance">{lines.map(line => <li key={line}>{line}</li>)}</ul>;
}
