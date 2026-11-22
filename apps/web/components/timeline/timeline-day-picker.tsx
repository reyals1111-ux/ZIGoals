'use client';
import {useId} from 'react';
import {addLocalDays} from '../../lib/local-date';

/**
 * Session AV lane 2 (r3-plan, LEDGER #258; Structured's timeline for any day): which day the Day Timeline shows — Today,
 * Tomorrow, or any day from the date field — so a day can be planned ahead. The timeline below keeps its layout; only
 * its day changes. Pressed state on the button of the day shown; 44 px targets.
 */
export function TimelineDayPicker({date, today, onPick}: {date: string; today: string; onPick: (date: string) => void}) {
  const id = useId(), tomorrow = addLocalDays(today, 1);
  return <div className="timeline-day-picker" role="group" aria-label="Day to show">
    <button type="button" className="secondary" aria-pressed={date === today} onClick={() => onPick(today)}>Today</button>
    <button type="button" className="secondary" aria-pressed={date === tomorrow} onClick={() => onPick(tomorrow)}>Tomorrow</button>
    <label className="field timeline-day-field" htmlFor={`${id}-day`}><span>Another day</span>
      <input id={`${id}-day`} type="date" value={date} onChange={e => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) onPick(e.target.value); }} /></label>
  </div>;
}
