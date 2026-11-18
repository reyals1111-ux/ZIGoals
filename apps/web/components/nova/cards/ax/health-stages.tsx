'use client';
import type {CSSProperties} from 'react';
import type {FastsView, StagesView, TimesView} from '../../../../lib/nova/cards/ax/health-stages';
import {formatClock} from '../../../../lib/visual-format';
import {axIndex} from './kit';
import './health.css';

/**
 * Session AS (ADR-042 Part 2, family: stage bars): upright bars, one a night or a fast, on one shared scale.
 * Arrives: the bars settle into place from above, the newest last. Alive: one soft sheen drifts up the newest bar (the
 * bars themselves, their parts and their target marks stay still). Decoration: each widget's table says every bar.
 */
const pct = (share: number) => `${Math.max(0, Math.min(100, share * 100)).toFixed(2)}%`;

/** Sleep stages: each night a stacked bar — deep at the foot, then REM, then core. A night without stages is an unlit dashed bar at its time asleep. */
export function AxhStages({view}: {view: StagesView}) {
  const n = view.nights.length;
  return <div className="axh-bars" data-bars="stages" aria-hidden="true" style={{'--axh-n': n} as CSSProperties}>
    <div className="axh-bars-plot">
      {view.nights.map((night, i) => {
        const total = night.staged ? (night.deep ?? 0) + (night.rem ?? 0) + (night.core ?? 0) : night.asleep;
        return <span key={night.date} className="axh-col" data-last={i === n - 1 ? '' : undefined} style={axIndex(i)} title={night.words}>
          <i className="axh-bar" data-none={night.staged ? undefined : ''} style={{'--axh-h': pct(total / view.max)} as CSSProperties}>
            {night.staged && ([['deep', night.deep], ['rem', night.rem], ['core', night.core]] as const).map(([stage, minutes]) => minutes ? <b key={stage} data-stage={stage} style={{flexGrow: minutes}}/> : null)}
            {i === n - 1 && night.staged && <u className="axh-sheen"/>}
          </i>
        </span>;
      })}
    </div>
    <div className="axh-bars-labels">{view.nights.map(night => <span key={night.date}>{night.label}</span>)}</div>
  </div>;
}

/** Sleep times: each night a floating bar from bedtime to wake time on a 24-hour scale that runs from noon (top) to noon; the person's own bedtime window is a faint band across. */
const HOURS = [['18:00', 360], ['00:00', 720], ['06:00', 1080]] as const;
export function AxhTimes({view}: {view: TimesView}) {
  const n = view.nights.length;
  return <div className="axh-bars" data-bars="times" aria-hidden="true" style={{'--axh-n': n} as CSSProperties}>
    <div className="axh-bars-plot">
      {HOURS.map(([clock, at]) => <span key={clock} className="axh-hour" style={{top: pct(at / 1440)}}><em>{formatClock(clock)}</em></span>)}
      {view.window && <span className="axh-window" style={{top: pct(view.window.from / 1440), height: pct((view.window.to - view.window.from) / 1440)}}/>}
      {view.nights.map((night, i) => <span key={night.date} className="axh-col" data-last={i === n - 1 ? '' : undefined} style={axIndex(i)} title={`${night.bedText} to ${night.wakeText}`}>
        <i className="axh-bar" data-float="" style={{'--axh-top': pct(night.bed / 1440), '--axh-h': pct((night.wake - night.bed) / 1440)} as CSSProperties}>{i === n - 1 && <u className="axh-sheen"/>}</i>
      </span>)}
    </div>
    <div className="axh-bars-labels">{view.nights.map(night => <span key={night.date}>{night.label}</span>)}</div>
  </div>;
}

/** Fasting windows: each fast a bar of its hours, with its own target as a mark across it; a fast that reached its target wears a lit cap. A fast that is running is a dashed bar filled to its share so far. */
export function AxhFasts({view}: {view: FastsView}) {
  const run = view.card.running, n = view.bars.length + (run ? 1 : 0), max = Math.max(view.max, run?.targetHours ?? 0);
  return <div className="axh-bars" data-bars="fasts" aria-hidden="true" style={{'--axh-n': Math.max(n, 5)} as CSSProperties}>
    <div className="axh-bars-plot">
      {view.bars.map((bar, i) => <span key={bar.id} className="axh-col" data-last={i === view.bars.length - 1 && !run ? '' : undefined} style={axIndex(i)} title={bar.words}>
        <i className="axh-bar" data-reached={bar.reached ? '' : undefined} style={{'--axh-h': pct(bar.hours / max)} as CSSProperties}>{i === view.bars.length - 1 && !run && <u className="axh-sheen"/>}</i>
        <span className="axh-target" style={{bottom: pct(bar.targetHours / max)}}/>
      </span>)}
      {run && <span className="axh-col" data-last="" style={axIndex(n - 1)}>
        <i className="axh-bar" data-run="" style={{'--axh-h': pct(run.share * run.targetHours / max)} as CSSProperties}><u className="axh-sheen"/></i>
        <span className="axh-target" style={{bottom: pct(run.targetHours / max)}}/>
      </span>}
    </div>
    <div className="axh-bars-labels">{view.bars.map(bar => <span key={bar.id}>{bar.label}</span>)}{run && <span>Now</span>}</div>
  </div>;
}
