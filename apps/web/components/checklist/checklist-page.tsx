'use client';
import {Suspense, lazy, useEffect, useId, useRef, useState, type CSSProperties} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {GlassBar} from '../progress/glass-progress';
import {zigiSignals} from '../zigi/bus';
import {formatDate} from '../../lib/visual-format';
import {useChecklist} from './use-checklist';
import {PathView} from './path-view';
import {ListView} from './list-view';
import {CornerTimers} from './corner-timers';
import {ChecklistSky} from './checklist-sky';
import {CHECKLIST_UNREADABLE_MESSAGE} from './use-checklist-record';
import {FlameMark} from './checklist-marks';
import './checklist.css';

// Opened on request only: the editor, the options and the history stay out of the first paint.
const EditPath = lazy(() => import('./edit-path').then(m => ({default: m.EditPath})));
const OptionsSheet = lazy(() => import('./options-sheet').then(m => ({default: m.OptionsSheet})));
const HistoryHeatmap = lazy(() => import('./history-heatmap').then(m => ({default: m.HistoryHeatmap})));

/**
 * /app/checklist (Session AF, L3; P7.1–P7.24): the day as one path of glowing dots, full-bleed inside the app shell (the
 * shell keeps its navigation and safety labels, ADR-028 H67). The header holds today's progress (one fill the first time
 * it is seen, then a glide), the streak's flame and count, the Path/List switch, Edit path and Options; the corner timers
 * stay in reach; the path or the list; the history behind a fold. Empty, loading and unreadable states say what is true.
 */
export function ChecklistPage() {
  const state = useChecklist({commands: true}), {summary, streak, prefs, loaded} = state;
  const [editing, setEditing] = useState(false), [options, setOptions] = useState(false), [history, setHistory] = useState(false);
  // A validated moment for ZIGi when half the dots, then all of them, are lit on this page (once each per day).
  const moments = useRef<{date: string | null; half: boolean; all: boolean}>({date: null, half: false, all: false});
  useEffect(() => {
    if (!summary || !state.date || summary.total === 0) return;
    if (moments.current.date !== state.date) moments.current = {date: state.date, half: summary.done * 2 >= summary.total, all: summary.done === summary.total};
    else {
      if (!moments.current.half && summary.done * 2 >= summary.total) { moments.current.half = true; zigiSignals.emitValidated('checklist_half'); }
      if (!moments.current.all && summary.done === summary.total) { moments.current.all = true; zigiSignals.emitValidated('checklist_complete'); }
    }
  }, [summary, state.date]);

  const total = summary?.total ?? 0, done = summary?.done ?? 0, empty = loaded && state.dots.length === 0;
  const streakDays = streak?.current ?? 0;
  const progressText = loaded ? total ? `${done} of ${total} ${total === 1 ? 'dot' : 'dots'} today` : 'No dots counted today' : 'Loading your path…';
  return <div className="checklist-page" data-view={prefs.view} data-loaded={loaded || undefined}>
    <ChecklistSky/>
    <header className="checklist-head">
      <p className="eyebrow">Checklist{state.date ? ` · ${formatDate(state.date, {weekday: true, year: false})}` : ''}</p>
      <h1 id="checklist-title"><NebulaFlow identity="checklist-title">Your orbit</NebulaFlow></h1>
      <div className="checklist-progress">
        <GlassBar identity="checklist-progress" ready={loaded} className="checklist-progress-bar" value={total ? done / total : 0} role="progressbar" aria-label="Dots done today" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-valuetext={progressText}/>
        <p className="checklist-progress-line"><strong>{progressText}</strong>{summary?.perfect && <span className="checklist-perfect"> · Perfect orbit: every dot, in order</span>}</p>
        <p className="checklist-streak" role="img" data-lit={streak?.todayComplete || undefined} aria-label={`${streakDays}-day streak${streak?.todayComplete ? ', today complete' : ''}`}><FlameMark lit={!!streak?.todayComplete}/><span aria-hidden="true">{streakDays}</span><small aria-hidden="true">{streakDays === 1 ? 'day' : 'days'}</small></p>
      </div>
      <div className="checklist-tools">
        <div className="checklist-view-switch" role="group" aria-label="View">
          <button type="button" aria-pressed={prefs.view === 'path'} onClick={() => state.setPrefs({view: 'path'})}>Path</button>
          <button type="button" aria-pressed={prefs.view === 'list'} onClick={() => state.setPrefs({view: 'list'})}>List</button>
        </div>
        <button type="button" className="secondary" aria-expanded={editing} onClick={() => { setEditing(e => !e); setOptions(false); }}>{editing ? 'Close Edit path' : 'Edit path'}</button>
        <button type="button" className="quiet" aria-expanded={options} onClick={() => { setOptions(o => !o); setEditing(false); }}>Options</button>
      </div>
    </header>

    {loaded && !state.unreadable && <CornerTimers state={state}/>}
    {options && <Suspense fallback={<p role="status">Opening options…</p>}><OptionsSheet state={state} onClose={() => setOptions(false)}/></Suspense>}
    {editing && !state.unreadable && <Suspense fallback={<p role="status">Opening Edit path…</p>}><EditPath state={state} onClose={() => setEditing(false)}/></Suspense>}

    <section className="checklist-stage" aria-labelledby="checklist-title" aria-busy={!loaded || undefined}>
      {!loaded ? <div className="checklist-loading" aria-hidden="true">{Array.from({length: 6}, (_, i) => <span key={i} style={{'--i': i} as CSSProperties}/>)}</div>
        : state.unreadable ? <section className="panel checklist-empty" role="alert"><h2>Your Checklist could not be read.</h2><p>{CHECKLIST_UNREADABLE_MESSAGE} Your habits, Health and Goals are untouched on their pages.</p></section>
        : empty ? <section className="panel checklist-empty"><GhostPath/><p className="eyebrow">A new path</p><h2>Your path is empty.</h2><p>Star what you do every day — a habit, a glass of water, a goal step — and it appears here as a glowing dot.</p><button type="button" className="primary" onClick={() => setEditing(true)}>Edit path</button></section>
        : prefs.view === 'list' ? <ListView state={state}/> : <PathView state={state}/>}
    </section>

    {loaded && !empty && !state.unreadable && <details className="checklist-history-fold" onToggle={e => setHistory((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>Your last twelve weeks</summary>
      {history && state.date && <Suspense fallback={<p role="status">Loading the history…</p>}><HistoryHeatmap days={state.days.data} today={state.date} todaySummary={summary ? {total: summary.total, done: summary.done, perfect: !!summary.perfect} : null}/></Suspense>}
    </details>}
    <p className="fine checklist-limits">Your Checklist stays on this device: favourites, your own items and the day history are not synced yet, so another device starts with an empty path. Ticking a dot writes its real record on its page.</p>
    <p className="sr-only" role="status" aria-live="polite">{state.announce}</p>
  </div>;
}

/** Session AF (crit1): the empty path's picture: five faint dots in the path's own colours on a dashed flow line, so an
 *  empty Checklist shows what it becomes. Decorative only (aria-hidden), still, the same in every theme. */
const GHOST_DOTS: [number, number, string][] = [[24, 62, 'var(--pillar-habits, #23eaff)'], [92, 26, 'var(--brand-blue, #459dff)'], [160, 46, 'var(--brand-magenta, #f06dff)'], [228, 70, 'var(--pillar-goals, #9273ff)'], [296, 32, 'var(--pillar-wealth, #ffd27a)']];
function GhostPath() {
  const id = useId().replace(/:/g, '');
  return <svg className="checklist-ghost-path" viewBox="0 0 320 96" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}-flow`} x1="0" x2="1" y1="0" y2="0">{GHOST_DOTS.map(([, , colour], i) => <stop key={i} offset={i / (GHOST_DOTS.length - 1)} stopColor={colour}/>)}</linearGradient></defs>
    <path className="checklist-ghost-line" d="M24 62 Q58 22 92 26 Q126 30 160 46 Q194 62 228 70 Q262 78 296 32" stroke={`url(#${id}-flow)`}/>
    {GHOST_DOTS.map(([x, y, colour], i) => <g key={i} style={{color: colour}}><circle className="checklist-ghost-halo" cx={x} cy={y} r="13"/><circle className="checklist-ghost-dot" cx={x} cy={y} r="7"/></g>)}
  </svg>;
}
