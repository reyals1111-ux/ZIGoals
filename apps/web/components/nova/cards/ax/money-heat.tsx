'use client';
import type {BillDay} from '../../../../lib/nova/cards/ax/money-bills';
import type {HeatCell} from '../../../../lib/nova/cards/ax/money-spend';
import {axmVar} from './money-kit';
import './money.css';

/**
 * Session AS (ADR-042 Part 2, family: heat): thirteen weeks as columns, a cell a day (Monday at the top), lit by the
 * amount spent that day in four steps. A day with nothing logged is an unlit outline (unknown, never a zero); a day still
 * to come is a faint dot; today is ringed; the largest day carries a ring that pings.
 * Arrives: the weeks come up one after another, oldest first. Alive: the largest day's ring pings, slowly.
 */
export function AxmHeat({weeks, months, peak}: {weeks: readonly (readonly HeatCell[])[]; months: readonly {week: number; label: string}[]; peak: string | null}) {
  return <div className="axm-heat axm-inst" aria-hidden="true" style={axmVar('--axm-weeks', weeks.length)}>
    {/* A month's name needs three weeks of room: a month that only begins or ends the grid stands unnamed. */}
    <div className="axm-heat-months">{months.map((m, i) => { const end = months[i + 1]?.week ?? weeks.length; return end - m.week >= 3 ? <span key={m.week} style={{gridColumn: `${m.week + 1} / ${end + 1}`}}>{m.label}</span> : null; })}</div>
    <div className="axm-heat-days"><span>M</span><span>W</span><span>F</span></div>
    <div className="axm-heat-grid">{weeks.map((week, w) => week.map(cell => <i key={cell.date} className="axm-heat-cell" data-level={cell.level} data-ahead={cell.ahead ? '' : undefined} data-today={cell.today ? '' : undefined} data-peak={cell.date === peak ? '' : undefined} style={axmVar('--ax-i', w)} title={cell.words}/>))}</div>
  </div>;
}

/**
 * The next 31 days as a small grid (the month calendar never lights a day still to come, so the bills have their own):
 * weeks as rows, Monday first, the days a bill falls due lit; today ringed; the days outside the 31 dimmed.
 * Arrives: the rows unfold from the top. Alive: the due days' small tabs bob.
 */
export function AxmBillGrid({weekdays, weeks}: {weekdays: readonly string[]; weeks: readonly (readonly BillDay[])[]}) {
  return <div className="axm-bills axm-inst" aria-hidden="true" style={axmVar('--axm-weeks', weeks.length)}>
    <div className="axm-bills-head">{weekdays.map((d, i) => <span key={i}>{d}</span>)}</div>
    {weeks.map((week, w) => <div className="axm-bills-week" key={week[0]!.date} style={axmVar('--ax-i', w)}>
      {week.map(cell => <i key={cell.date} className="axm-bills-cell" data-due={cell.bills.length ? '' : undefined} data-today={cell.today ? '' : undefined} data-dim={cell.inRange ? undefined : ''} title={cell.words}><b>{cell.day}</b></i>)}
    </div>)}
  </div>;
}
