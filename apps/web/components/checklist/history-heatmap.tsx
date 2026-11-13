'use client';
import {addDays} from '../../lib/zone-time';
import {formatDate, formatWeekday} from '../../lib/visual-format';
import {useState} from 'react';
import type {ChecklistDays} from '../../lib/checklist/schema';
import {canFillDay, fillableDays} from '../../lib/checklist/past-day';
import {PastDay} from './past-day';
import type {ChecklistState} from './use-checklist';

/**
 * The history (P7.15): twelve weeks of days, Monday to Sunday, each cell one sealed day — nothing on the path, partly
 * done, every dot lit, or a Perfect orbit. Today shows as it stands. A grid of images with one name each, plus a list for
 * screen readers of the days that have a result. Session AG (owner Part 6, reference 12): "Orbit consistency" — rounded
 * squares with gaps, the weekdays on the left and the weeks below ("12w … Now"). Session AG Polish (owner pointer 11): in our
 * nebula colour flow, not the four-colour palette — each week's hue comes from the nebula gradient flowing across the grid
 * (cyan on the oldest weeks → blue → violet → magenta on "Now"), and the state sets the intensity: nothing a faint glass
 * cell, some planets dim, all planets full, a Perfect orbit full with a soft glow. The legend shows the four the same way.
 * Session AG Polish 2 (ADR-031 K14; owner Part 8, D-path 6): the nebula flow made the legend and the cells disagree, so each
 * state now has one fixed neon colour — Nothing an empty glass cell with a faint teal outline, Some planets purple, All
 * planets cyan, a Perfect orbit magenta with a soft glow — the same in every theme, and each legend swatch IS a cell of its
 * state (the same element and classes), so the legend always matches.
 * Session AG Polish 3 (owner Part 5 and amendment 1, reference 03 pointer 10): three states on one row — "Nothing" (none of
 * the day's items done; an empty cell), "Some orbits" (at least one done but not all; purple) and "All orbits" (every item
 * done; cyan) — a Perfect orbit counts as All. The legend, each cell's title and the screen-reader list say the same words.
 * Session AL fifth pass (LS-032 / C-LS-35): with `state`, a square of the last 7 days opens that day's own items to fill
 * in (components/checklist/past-day.tsx). The squares stay one picture for screen readers and are too small to be touch
 * targets of their own, so the same days are also buttons under the legend.
 */
type Level = 'none' | 'some' | 'all';
type Cell = {date: string; level: Level | 'future'; label: string};
/** The legend's words, which each cell's title and the screen-reader list begin with. */
export const HEAT_WORDS: Record<Level, string> = {none: 'Nothing', some: 'Some orbits', all: 'All orbits'};
const WEEKS = 12;
function weekday(date: string) { const [y, m, d] = date.split('-').map(Number); return (new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay() + 6) % 7; }
export function HistoryHeatmap({days, today, todaySummary, state}: {days: ChecklistDays; today: string; todaySummary: {total: number; done: number; perfect: boolean} | null; state?: ChecklistState}) {
  const [picked, setPicked] = useState<string | null>(null), fillable = state ? fillableDays(today) : [];
  const end = addDays(today, 6 - weekday(today)), start = addDays(end, -(WEEKS * 7 - 1));
  const cells: Cell[] = Array.from({length: WEEKS * 7}, (_, i) => {
    const date = addDays(start, i), day = date === today ? todaySummary : days.days[date] ? {...days.days[date]!, perfect: !!days.days[date]!.perfect} : null;
    if (date > today) return {date, level: 'future', label: `${formatDate(date)}: ahead`};
    if (!day || day.total === 0) return {date, level: 'none', label: `${formatDate(date)}: ${HEAT_WORDS.none} — nothing on the path`};
    // Session AO (D-086): one word for one thing: the header counts "planets", so the day line does too (it said "items").
    const level: Level = day.done >= day.total ? 'all' : day.done > 0 ? 'some' : 'none', items = day.total === 1 ? 'planet' : 'planets';
    const said = level === 'all' ? (day.total === 1 ? 'its one planet done' : `all ${day.total} planets done`) : level === 'some' ? `${day.done} of ${day.total} ${items} done` : `none of ${day.total} ${items} done`;
    return {date, level, label: `${formatDate(date)}: ${HEAT_WORDS[level]} — ${said}${date === today ? ' so far' : ''}`};
  });
  const results = cells.filter(c => c.level !== 'none' && c.level !== 'future');
  return <div className="checklist-history">
    {/* Session AK P6 (axe scrollable-region-focusable, 2.1.1): it scrolls sideways on a narrow screen, so it is a named stop the keyboard can scroll. */}
    <div className="checklist-heat" role="region" aria-label={`Checklist history, the last ${WEEKS} weeks`} tabIndex={0}>
      <ol className="checklist-heat-days" aria-hidden="true">{Array.from({length: 7}, (_, i) => <li key={i}>{formatWeekday(addDays(start, i))}</li>)}</ol>
      {/* (A pointer taps a square of the last 7 days; the keyboard and a screen reader use the day buttons below.) */}
      <div className="checklist-heat-grid" role="img" aria-label={`The last ${WEEKS} weeks: ${results.length} ${results.length === 1 ? "day" : "days"} with some or all orbits`} onClick={state ? e => { const date = (e.target as HTMLElement).closest<HTMLElement>('[data-fill]')?.dataset.date; if (date && canFillDay(today, date)) setPicked(p => p === date ? null : date); } : undefined}>
        {cells.map(c => { const fill = state && canFillDay(today, c.date); return <span key={c.date} className="checklist-heat-cell" data-level={c.level} data-today={c.date === today || undefined} data-date={c.date} data-fill={fill ? '' : undefined} data-picked={picked === c.date || undefined} title={fill ? `${c.label}. Tap to fill in this day` : c.label}/>; })}
      </div>
      <ol className="checklist-heat-weeks" aria-hidden="true">{Array.from({length: WEEKS}, (_, i) => <li key={i}>{i === 0 ? `${WEEKS}w` : i === WEEKS - 1 ? 'Now' : i === WEEKS / 2 ? `${WEEKS / 2}w` : ''}</li>)}</ol>
    </div>
    <ul className="checklist-heat-legend">{(['none', 'some', 'all'] as const).map(level => [level, HEAT_WORDS[level]] as const).map(([level, words]) => <li key={level} data-level={level}><span className="checklist-heat-cell checklist-heat-swatch" data-level={level} aria-hidden="true"/>{words}</li>)}</ul>
    {/* Session AL fourth pass (D-086): one meaning for the three words the Checklist uses. */}
    <p className="fine checklist-heat-note">A planet is one item on your path: the counts above and here are your planets, and an orbit is complete when all its planets are lit.</p>
    {state && <div className="checklist-heat-fill" role="group" aria-label="Fill in a missed day">
      <span className="fine">Fill in a day:</span>
      {[...fillable].reverse().map(date => <button key={date} type="button" className="quiet" aria-expanded={picked === date} aria-label={`Fill in ${formatDate(date, {weekday: true})}`} onClick={() => setPicked(p => p === date ? null : date)}>{formatWeekday(date)} {Number(date.slice(8))}</button>)}
    </div>}
    {state && picked && <PastDay state={state} date={picked} onClose={() => setPicked(null)}/>}
    <ul className="sr-only">{results.map(c => <li key={c.date}>{c.label}</li>)}</ul>
  </div>;
}
