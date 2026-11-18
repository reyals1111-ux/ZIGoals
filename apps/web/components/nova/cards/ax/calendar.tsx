'use client';
import {isLit, type CalendarView, type Lit} from '../../../../lib/nova/cards/ax/calendar';
import type {Track} from '../../../../lib/ai/local-answers/exact/track';
import {axIndex} from './kit';

/**
 * Session AS (ADR-042 Part 2, family 1): the month calendar — every day of the period as a cell, the days the answer is
 * about lit. A missed day is a lit cell with a halo; a skipped day a dashed ring (marked so by the person, never counted
 * as missed); a day below a target a half-lit cell; a day with nothing logged an unlit dashed cell (unknown, never zero);
 * today is ringed and, while it is still open, not lit. Days outside the period are dimmed.
 * Arrives: the cells come up in reading order, then the lit ones flare once. Alive: the lit cells' halos breathe and one
 * thin scan line crosses the month. The drawing is decoration: the widget's table says each lit day in words.
 */
export function AxCalendar({view, lit = 'not-done', kind}: {view: CalendarView; lit?: Lit; kind: Track['kind']}) {
  let i = 0;
  return <div className="ax-cal" data-weeks={view.weeks.length} aria-hidden="true">
    <div className="ax-cal-head">{view.weekdays.map((d, n) => <span key={n}>{d}</span>)}</div>
    <div className="ax-cal-grid">
      {view.weeks.map(week => <div className="ax-cal-week" key={week[0]!.date}>{week.map(cell => {
        const on = cell.inPeriod && (!cell.today || (lit === 'done' && cell.state === 'done')) && isLit(cell.state, lit, kind);
        return <i key={cell.date} className="ax-cal-cell" data-state={cell.state} data-lit={on ? '' : undefined} data-today={cell.today ? '' : undefined} data-dim={cell.inPeriod ? undefined : ''} style={axIndex(i++)} title={cell.words}><b>{cell.day}</b></i>;
      })}</div>)}
      <span className="ax-cal-scan"/>
    </div>
  </div>;
}
