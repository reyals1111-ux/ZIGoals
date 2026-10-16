'use client';
import {useEffect, useRef, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {habitYear, monthStarts, overviewYear, yearWeeks} from '../../lib/habits-extras/year';
import {habitRuleOn, type Habit} from '../../lib/habits';
import {formatDate} from '../../lib/visual-format';

const level = (status: string) => status === 'complete' ? 'full' : status === 'partial' ? 'part' : status === 'skipped' || status === 'planned-skip' ? 'skip' : status === 'failed' ? 'miss' : status === 'outside' ? 'out' : 'none';
const shareLevel = (share: number | null) => share === null ? 'none' : share >= 1 ? 'full' : share >= 0.5 ? 'part' : share > 0 ? 'low' : 'miss';
/**
 * H8: a full-year grid per habit and the all-habits overview, month labels along the top, one accessible summary per
 * grid (the cells are decorative; the summary and the counts carry the meaning for a screen reader).
 */
export function YearView({habits, today}: {habits: readonly Habit[]; today: string}) {
  const thisYear = Number(today.slice(0, 4)), active = habits.filter(h => habitRuleOn(h, today)?.state !== 'archived');
  const earliest = Math.min(thisYear, ...active.map(h => Number(h.startDate.slice(0, 4))));
  const [year, setYear] = useState(thisYear), [pick, setPick] = useState<'all' | string>('all');
  const weeks = yearWeeks(year), months = monthStarts(weeks, year);
  const habit = pick === 'all' ? null : active.find(h => h.id === pick) ?? null;
  const data = habit ? habitYear(habit, year, today) : null, overview = habit ? null : overviewYear(active, year, today);
  const summary = data?.summary ?? overview!.summary;
  // Gate C (design critique): where the grid scrolls (phones), this year opens on its recent weeks, today near the right
  // edge, not on empty January; other years open at their start.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (year !== thisYear) { el.scrollLeft = 0; return; }
    const start = Date.UTC(thisYear, 0, 1), now = Date.parse(`${today}T00:00:00Z`), share = Math.min(1, Math.max(0, (now - start) / (366 * 86_400_000)));
    el.scrollLeft = Math.max(0, share * el.scrollWidth - el.clientWidth + 48);
  }, [year, thisYear, today, pick]);
  return <section className="panel habit-year" aria-labelledby="habit-year-title">
    <div className="habit-section-heading habit-year-head"><div><p className="eyebrow">The long view</p><h2 id="habit-year-title"><NebulaFlow identity="habit-year-title">Year view</NebulaFlow></h2></div><div className="habit-year-controls"><label className="field habit-year-pick"><span className="visually-hidden">Habit</span><select value={pick} onChange={e => setPick(e.target.value)}><option value="all">All habits</option>{active.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select></label><div className="habit-year-nav"><button type="button" className="quiet" aria-label="Previous year" disabled={year <= earliest} onClick={() => setYear(y => y - 1)}>←</button><strong>{year}</strong><button type="button" className="quiet" aria-label="Next year" disabled={year >= thisYear} onClick={() => setYear(y => y + 1)}>→</button></div></div></div>
    <p className="habit-year-summary" role="status">{summary}</p>
    <div className="habit-year-scroll" ref={scroller}><div className="habit-year-grid" role="img" aria-label={summary} style={{'--weeks': weeks.length} as React.CSSProperties}>
      <div className="habit-year-months" aria-hidden="true">{months.map(m => <span key={m.label} style={{gridColumnStart: m.week + 1}}>{m.label}</span>)}</div>
      <div className="habit-year-cells" aria-hidden="true">{(data?.weeks ?? overview!.weeks).map((week, w) => week.map((cell, d) => { const isData = 'status' in cell; const lvl = isData ? level(cell.status) : (cell.inYear && cell.date <= today ? shareLevel(cell.share) : 'out'); const title = isData ? `${cell.date}: ${cell.status === 'outside' ? '' : cell.status}` : cell.due ? `${cell.date}: ${cell.done} of ${cell.due}` : cell.date; return <i key={`${w}-${d}`} data-level={lvl} title={title.trim()} style={{gridColumn: w + 1, gridRow: d + 1}} />; }))}</div>
    </div></div>
    {data ? <p className="habit-map-legend"><span><i className="filled" /> Complete {data.counts.complete}</span><span><i data-level="part" /> Partial {data.counts.partial}</span><span><i data-level="skip" /> Skipped {data.counts.skipped}</span><span><i data-level="miss" /> Missed {data.counts.failed}</span></p>
      : <p className="habit-map-legend"><span><i className="filled" /> Every habit done ({overview!.fullDays})</span><span><i data-level="part" /> Half or more</span><span><i data-level="low" /> Some</span><span><i data-level="miss" /> None</span></p>}
    <p className="fine">Weeks run top to bottom, Monday first; {formatDate(`${year}-01-01`, {year: false})} sits in the first column. Days before a habit started and days ahead stay blank.</p>
  </section>;
}
