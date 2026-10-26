'use client';
import {createContext, useContext, useRef, type KeyboardEvent, type TouchEvent} from 'react';
import {addLocalDays} from '../../lib/local-date';
import {useSearchParams} from 'next/navigation';
import {dayHint, dayName, journalDay} from '../../lib/health-day';
import './health-day.css';

/**
 * Session AH Part 17 (owner addition, pre-approved): the Journal date drives the whole Health page. The page provides
 * the chosen day; every day-based card reads it, shows that day, and logs to it ("Logging for Thu 22 Oct"). The future
 * cannot be chosen or logged.
 */
export type HealthDay = {date: string; today: string};
const HealthDayContext = createContext<HealthDay | null>(null);
export const HealthDayProvider = HealthDayContext.Provider;

/** The chosen day, or `today` outside the Health page (the full Sleep, Meditation and Workouts views read `?date=`). */
export function useHealthDay(today: string): HealthDay & {past: boolean} {
  const day = useContext(HealthDayContext) ?? {date: today, today};
  return {...day, past: day.date < day.today};
}

/** The day a full view (Sleep, Meditation, Workouts) logs to: its `?date=` link, or today. */
export function useLinkedDay(today: string): string { const params = useSearchParams(); return journalDay(params.get('date'), today); }

/** One line under the date bar on a past day. */
export function LoggingFor({date, today}: HealthDay) {
  return date < today ? <p className="health-logging-for" role="note">Logging for <strong>{dayName(date, today)}</strong></p> : null;
}

/** A card's line for a past day: what that day holds, and a way to log for it. */
export function PastDayLine({date, today, children}: HealthDay & {children: React.ReactNode}) {
  return date < today ? <p className="health-past-day"><strong>{dayName(date, today)}</strong> · {children}</p> : null;
}

/**
 * The date bar: ← and → (44 px, nebula), the day as "Thu 22 Oct" with "3 days ago", tapping it opens the date picker;
 * a "Today" pill once another day is chosen; a swipe on a phone and the ← / → keys while the bar has focus move a day.
 * The day's name animates once when it changes (never with reduced motion or Motion Off).
 */
export function HealthDateBar({date, today, onChoose}: HealthDay & {onChoose: (day: string) => void}) {
  const input = useRef<HTMLInputElement>(null), touch = useRef<{x: number; y: number} | null>(null), first = useRef(date);
  const isToday = date >= today;
  const step = (days: number) => { const next = addLocalDays(date, days); if (next >= '1900-01-01' && next <= today) onChoose(next); };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target === input.current || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); } else if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  };
  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => { const t = event.touches[0]; touch.current = t ? {x: t.clientX, y: t.clientY} : null; };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const from = touch.current, to = event.changedTouches[0]; touch.current = null;
    if (!from || !to) return;
    const dx = to.clientX - from.x, dy = to.clientY - from.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx > 0 ? -1 : 1);
  };
  return <div className="health-date health-date-bar" role="group" aria-label="Journal day" tabIndex={0} onKeyDown={onKey} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
    <button type="button" className="health-date-step" aria-label="Previous day" disabled={date <= '1900-01-01'} onClick={() => step(-1)}><span aria-hidden="true">←</span></button>
    <label className="health-date-pick">
      <span key={date} className={`health-date-text${date !== first.current ? ' is-new' : ''}`}><strong>{dayName(date, today)}</strong><small id="health-date-hint">{dayHint(date, today)}</small></span>
      <input ref={input} type="date" aria-label="Journal date" aria-describedby="health-date-hint" min="1900-01-01" max={today} value={date}
        onClick={event => { try { event.currentTarget.showPicker?.(); } catch { /* the browser opens its own picker */ } }}
        onChange={event => { const value = event.target.value; if (value >= '1900-01-01' && value <= today) onChoose(value); }}/>
    </label>
    <button type="button" className="health-date-step" aria-label="Next day" disabled={isToday} onClick={() => step(1)}><span aria-hidden="true">→</span></button>
    {!isToday && <button type="button" className="health-date-today" onClick={() => onChoose(today)}>Today</button>}
  </div>;
}
