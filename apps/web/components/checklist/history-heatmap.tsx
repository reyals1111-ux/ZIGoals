'use client';
import type {CSSProperties} from 'react';
import {addDays} from '../../lib/zone-time';
import {formatDate, formatWeekday} from '../../lib/visual-format';
import type {ChecklistDays} from '../../lib/checklist/schema';

/**
 * The history (P7.15): twelve weeks of days, Monday to Sunday, each cell one sealed day — nothing on the path, partly
 * done, every dot lit, or a Perfect orbit. Today shows as it stands. A grid of images with one name each, plus a list for
 * screen readers of the days that have a result. Session AG (owner Part 6, reference 12): "Orbit consistency" — rounded
 * squares with gaps, the weekdays on the left and the weeks below ("12w … Now"). Session AG Polish (owner pointer 11): in our
 * nebula colour flow, not the four-colour palette — each week's hue comes from the nebula gradient flowing across the grid
 * (cyan on the oldest weeks → blue → violet → magenta on "Now"), and the state sets the intensity: nothing a faint glass
 * cell, some planets dim, all planets full, a Perfect orbit full with a soft glow. The legend shows the four the same way.
 */
const FLOW: readonly [number, number, number][] = [[0x23, 0xea, 0xff], [0x45, 0x9d, 0xff], [0x92, 0x73, 0xff], [0xf0, 0x6d, 0xff]];
/** The nebula flow's colour at t (0 … 1) along the grid, as a hex colour. */
export function flowColour(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (FLOW.length - 1), i = Math.min(FLOW.length - 2, Math.floor(x)), k = x - i, a = FLOW[i]!, b = FLOW[i + 1]!;
  return `#${a.map((v, j) => Math.round(v + (b[j]! - v) * k).toString(16).padStart(2, '0')).join('')}`;
}
type Cell = {date: string; level: 'none' | 'some' | 'all' | 'perfect' | 'future'; label: string};
const WEEKS = 12;
function weekday(date: string) { const [y, m, d] = date.split('-').map(Number); return (new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay() + 6) % 7; }
export function HistoryHeatmap({days, today, todaySummary}: {days: ChecklistDays; today: string; todaySummary: {total: number; done: number; perfect: boolean} | null}) {
  const end = addDays(today, 6 - weekday(today)), start = addDays(end, -(WEEKS * 7 - 1));
  const cells: Cell[] = Array.from({length: WEEKS * 7}, (_, i) => {
    const date = addDays(start, i), day = date === today ? todaySummary : days.days[date] ? {...days.days[date]!, perfect: !!days.days[date]!.perfect} : null;
    if (date > today) return {date, level: 'future', label: `${formatDate(date)}: ahead`};
    if (!day || day.total === 0) return {date, level: 'none', label: `${formatDate(date)}: nothing on the path`};
    const level = day.done >= day.total ? (day.perfect ? 'perfect' : 'all') : day.done > 0 ? 'some' : 'none';
    return {date, level, label: `${formatDate(date)}: ${day.done} of ${day.total} dots${level === 'perfect' ? ', a Perfect orbit' : ''}${date === today ? ' so far' : ''}`};
  });
  const results = cells.filter(c => c.level !== 'none' && c.level !== 'future');
  return <div className="checklist-history">
    <div className="checklist-heat">
      <ol className="checklist-heat-days" aria-hidden="true">{Array.from({length: 7}, (_, i) => <li key={i}>{formatWeekday(addDays(start, i))}</li>)}</ol>
      <div className="checklist-heat-grid" role="img" aria-label={`The last ${WEEKS} weeks: ${results.length} days with planets lit`}>
        {cells.map((c, i) => <span key={c.date} className="checklist-heat-cell" data-level={c.level} data-today={c.date === today || undefined} title={c.label} style={{'--c': flowColour(Math.floor(i / 7) / (WEEKS - 1))} as CSSProperties}/>)}
      </div>
      <ol className="checklist-heat-weeks" aria-hidden="true">{Array.from({length: WEEKS}, (_, i) => <li key={i}>{i === 0 ? `${WEEKS}w` : i === WEEKS - 1 ? 'Now' : i === WEEKS / 2 ? `${WEEKS / 2}w` : ''}</li>)}</ol>
    </div>
    <ul className="checklist-heat-legend" style={{'--c': flowColour(.62)} as CSSProperties}><li data-level="none">Nothing</li><li data-level="some">Some planets</li><li data-level="all">All planets</li><li data-level="perfect">Perfect orbit</li></ul>
    <ul className="sr-only">{results.map(c => <li key={c.date}>{c.label}</li>)}</ul>
  </div>;
}
