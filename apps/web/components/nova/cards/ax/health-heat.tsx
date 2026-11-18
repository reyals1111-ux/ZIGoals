'use client';
import type {CSSProperties} from 'react';
import type {HeatView, MoodMapView} from '../../../../lib/nova/cards/ax/health-heat';
import {moodWord} from '../../../../lib/nova/cards/ax/health-heat';
import './health.css';

/**
 * Session AS (ADR-042 Part 2, family: heat): days as cells whose light says how much.
 * Steps heat: thirteen weeks as columns (Monday at the top), a cell a day lit in four steps; a day with nothing logged is
 * an unlit dashed cell, a day still to come a faint one; today is ringed. Mood map: a month of numbered days, each lit by
 * the step of the mood kept that day (the key names the five steps in words); a day without a mood is unlit.
 * Arrives: the cells come in as a wave from the oldest corner. Alive: one ring pings out from today's cell.
 * Decoration: each widget's table says the days in words.
 */
const wave = (i: number): CSSProperties => ({'--ax-i': i} as CSSProperties);
const DAYS = ['M', '', 'W', '', 'F', '', 'S'] as const;
export function AxhHeat({view}: {view: HeatView}) {
  return <div className="axh-heat" aria-hidden="true">
    <div className="axh-heat-months">{view.months.map(m => <span key={m.week} style={{gridColumnStart: m.week + 2}}>{m.label}</span>)}</div>
    <div className="axh-heat-grid">
      <div className="axh-heat-days">{DAYS.map((d, i) => <span key={i}>{d}</span>)}</div>
      {view.weeks.map((week, w) => <div className="axh-heat-week" key={week[0]!.date}>
        {week.map((c, d) => <i key={c.date} className="axh-cell" data-state={c.state} data-level={c.level || undefined} data-today={c.today ? '' : undefined} style={wave(w + d)} title={c.words}>{c.today && <u className="axh-ping"/>}</i>)}
      </div>)}
    </div>
  </div>;
}
export function AxhMoodMap({view}: {view: MoodMapView}) {
  const cal = view.view;
  return <div className="axh-mood" data-weeks={cal.weeks.length} aria-hidden="true">
    <div className="axh-mood-head">{cal.weekdays.map((d, n) => <span key={n}>{d}</span>)}</div>
    <div className="axh-mood-grid">
      {cal.weeks.map((week, w) => <div className="axh-mood-week" key={week[0]!.date}>{week.map((cell, d) => {
        const step = cell.inPeriod && cell.value !== null ? cell.value : null;
        return <i key={cell.date} className="axh-mood-cell" data-step={step ?? undefined} data-state={cell.state} data-today={cell.today ? '' : undefined} data-dim={cell.inPeriod ? undefined : ''} style={wave(w + d)}
          title={step !== null ? `${cell.words.split(':')[0]}: ${moodWord(step)}` : cell.words}><b>{cell.day}</b>{cell.today && <u className="axh-ping"/>}</i>;
      })}</div>)}
    </div>
  </div>;
}
