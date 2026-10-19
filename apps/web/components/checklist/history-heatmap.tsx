'use client';
import type {CSSProperties} from 'react';
import {addDays} from '../../lib/zone-time';
import {formatDate} from '../../lib/visual-format';
import {PATH_COLOURS} from '../../lib/path/colours';
import type {ChecklistDays} from '../../lib/checklist/schema';

/**
 * The history (P7.15): twelve weeks of days, Monday to Sunday, each cell one sealed day — nothing on the path, partly
 * done, every dot lit, or a Perfect orbit — in the path's own colours, the same in every theme. Today shows as it stands.
 * A grid of images with one name each, plus a list for screen readers of the days that have a result.
 */
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
  const style = {'--heat-some': PATH_COLOURS.blue.token, '--heat-all': PATH_COLOURS.cyan.token, '--heat-perfect': PATH_COLOURS.gold.token} as CSSProperties;
  const results = cells.filter(c => c.level !== 'none' && c.level !== 'future');
  return <div className="checklist-history">
    <div className="checklist-heat-grid" role="img" aria-label={`The last ${WEEKS} weeks: ${results.length} days with planets lit`} style={style}>
      {cells.map(c => <span key={c.date} className="checklist-heat-cell" data-level={c.level} data-today={c.date === today || undefined} title={c.label}/>)}
    </div>
    <ul className="checklist-heat-legend" style={style}><li data-level="none">Nothing</li><li data-level="some">Some planets</li><li data-level="all">All planets</li><li data-level="perfect">Perfect orbit</li></ul>
    <ul className="sr-only">{results.map(c => <li key={c.date}>{c.label}</li>)}</ul>
  </div>;
}
