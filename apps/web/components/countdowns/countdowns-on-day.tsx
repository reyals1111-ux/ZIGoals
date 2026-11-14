'use client';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {COUNTDOWNS, countdownsOn} from '../../lib/countdowns/schema';
import {formatDate} from '../../lib/visual-format';
import './countdowns.css';

/**
 * Session AP ("Days until"): the person's countdowns on the Agenda's day of the event — read-only, from their own
 * record (zigoals:countdowns:v1); they are kept and removed on Today's "Days until" card. Nothing shows on other days.
 */
export function CountdownsOnDay({date, today}: {date: string; today: string}) {
  const record = useDeviceRecord(COUNTDOWNS);
  const items = useMemo(() => record.loaded && !record.unreadable ? countdownsOn(record.data, date) : [], [record.loaded, record.unreadable, record.data, date]);
  if (!items.length) return null;
  const when = date === today ? 'today' : date < today ? `was on ${formatDate(date, {weekday: true, year: false})}` : `on ${formatDate(date, {weekday: true, year: false})}`;
  return <ul className="agenda-countdowns" aria-label="Days until">{items.map(c => <li key={c.id} className="agenda-countdown" data-pillar="life">
    <span className="agenda-countdown-mark" aria-hidden="true">◎</span>
    <span><strong>{c.title}</strong> <small>Countdown · {when}{c.note ? ` · ${c.note}` : ''}</small></span>
  </li>)}</ul>;
}
