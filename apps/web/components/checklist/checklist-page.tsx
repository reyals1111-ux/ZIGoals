'use client';
import {Suspense, lazy, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {NebulaFlow} from '../nebula-flow';
import {GlassBar} from '../progress/glass-progress';
import {zigiSignals} from '../zigi/bus';
import {pushToastLayer} from '../ui/undo-toast';
import {useAlphaFacts} from '../alpha/alpha-facts';
import {formatDate} from '../../lib/visual-format';
import {xpEvents} from '../../lib/game/xp';
import {CHECKLIST_ROUTE} from '../../lib/af-checklist-keys';
import {PATH_COLOURS} from '../../lib/path/colours';
import {pathBefore} from '../../lib/checklist/return-path';
import {useChecklist} from './use-checklist';
import {PathView} from './path-view';
import {ListView} from './list-view';
import {CornerTimers} from './corner-timers';
import {ChecklistSky} from './checklist-sky';
import {CHECKLIST_UNREADABLE_MESSAGE} from './use-checklist-record';
import {FlameMark} from './checklist-marks';
import {escapeTop, useEscapeLayer} from './escape-layers';
import './checklist.css';

// Opened on request only: the editor, the options, the history and the day's celebration stay out of the first paint.
const EditPath = lazy(() => import('./edit-path').then(m => ({default: m.EditPath})));
const OptionsSheet = lazy(() => import('./options-sheet').then(m => ({default: m.OptionsSheet})));
const HistoryHeatmap = lazy(() => import('./history-heatmap').then(m => ({default: m.HistoryHeatmap})));
const DayCelebration = lazy(() => import('./day-celebration'));

/** The day's full-screen celebration plays once a day in this tab (a reload never replays it). */
const CELEBRATED = 'zigoals-checklist-celebrated';
const celebratedOn = (date: string) => { try { return sessionStorage.getItem(CELEBRATED) === date; } catch { return true; } };
const markCelebrated = (date: string) => { try { sessionStorage.setItem(CELEBRATED, date); } catch { /* it may play again in this tab */ } };

/**
 * Where the close goes: back through the app's own history when the Checklist was opened from a page in the app (the
 * browser's previous entry is that page), else to Today (opened directly: the Home Screen shortcut, a shared address).
 */
function cameFromTheApp(): boolean {
  const before = pathBefore(CHECKLIST_ROUTE);
  if (!before || !before.startsWith('/app') || before === CHECKLIST_ROUTE) return false;
  try {
    const nav = (window as unknown as {navigation?: {currentEntry?: {index?: number} | null; entries?: () => {url?: string | null}[]}}).navigation;
    const index = nav?.currentEntry?.index;
    if (nav?.entries && typeof index === 'number') {
      if (index < 1) return false;
      const url = nav.entries()[index - 1]?.url; if (!url) return false;
      const prev = new URL(url);
      return prev.origin === location.origin && prev.pathname.startsWith('/app') && prev.pathname !== CHECKLIST_ROUTE;
    }
  } catch { /* the trail decides */ }
  return true;
}

/**
 * /app/checklist (Session AF, L3 → L3b; P7.1–P7.24 and the owner's full-screen brief): the Checklist as a stand-alone daily
 * app. It opens as a modal dialog in the browser's top layer over everything (sidebar, header, footer banner, tab bar,
 * launchers), so the rest of the app is inert behind it and focus stays inside; X and Escape return to where the person
 * was. A top bar holds the close, today's progress (a fill with a shine), the streak's flame and today's XP; under it the
 * path of glowing planets in its orbits (or the List), with the corner timers always in reach (a dock on phones). The
 * background is a slowly drifting star system in Nebula, a calm white mist in Light, black with a subtle mist in Dark.
 * Finishing the day plays a full-screen celebration once a day. The address stays /app/checklist.
 */
export function ChecklistPage() {
  const state = useChecklist({commands: true}), {summary, streak, prefs, loaded} = state;
  const router = useRouter(), dialog = useRef<HTMLDialogElement>(null), toastSlot = useRef<HTMLDivElement>(null), facts = useAlphaFacts();
  const [sheet, setSheet] = useState<'edit' | 'options' | 'about' | null>(null), [history, setHistory] = useState(false), [celebrate, setCelebrate] = useState(false);

  // Into the top layer: the server's page carries the dialog open (so the first paint already shows only the Checklist);
  // once the page runs it becomes modal. Our own close here is not the person's close.
  const ownCloses = useRef(0), leaving = useRef(false), escaped = useRef(false);
  useLayoutEffect(() => {
    const d = dialog.current; if (!d) return;
    try { if (!d.matches(':modal')) { if (d.open) { ownCloses.current++; d.close(); } d.showModal(); } } catch { /* stays an open dialog in the page */ }
    // Focus starts on the Checklist itself (its name is read), not on the close button; Tab then walks its controls.
    d.focus({preventScroll: true});
    const releaseToast = toastSlot.current ? pushToastLayer(toastSlot.current) : () => undefined;
    return () => { releaseToast(); leaving.current = true; try { if (d.open) d.close(); } catch { /* gone */ } };
  }, []);
  const leave = useCallback(() => {
    if (leaving.current) return; leaving.current = true;
    if (cameFromTheApp()) router.back(); else router.replace('/app');
  }, [router]);
  const onEscape = useCallback(() => { if (!escapeTop()) leave(); }, [leave]);

  // A validated moment for ZIGi when half the dots, then all of them, are lit on this page (once each per day); the
  // moment all are lit by a tick here (never on opening a day already complete), the day's celebration, once a day.
  const moments = useRef<{date: string | null; half: boolean; all: boolean}>({date: null, half: false, all: false});
  useEffect(() => {
    if (!summary || !state.date || summary.total === 0) return;
    if (moments.current.date !== state.date) moments.current = {date: state.date, half: summary.done * 2 >= summary.total, all: summary.done === summary.total};
    else {
      if (!moments.current.half && summary.done * 2 >= summary.total) { moments.current.half = true; zigiSignals.emitValidated('checklist_half'); }
      if (!moments.current.all && summary.done === summary.total) {
        moments.current.all = true; zigiSignals.emitValidated('checklist_complete');
        if (!celebratedOn(state.date)) { markCelebrated(state.date); setCelebrate(true); }
      }
      // Undo of the last tick from the celebration's toast: the day is not complete any more, so the celebration closes.
      if (summary.done < summary.total) setCelebrate(false);
    }
  }, [summary, state.date]);

  const total = summary?.total ?? 0, done = summary?.done ?? 0, empty = loaded && state.dots.length === 0;
  const streakDays = streak?.current ?? 0;
  // Today's XP, the game layer's own count from today's records (only while the game layer is on).
  const {habits, health, platform} = state.stores;
  const xpToday = useMemo(() => {
    if (!state.gameOn || !state.date || !summary) return null;
    try { return xpEvents({habits: habits.data, health: health.data, platform: platform.data, checklist: state.days.data, checklistToday: {date: state.date, total: summary.total, done: summary.done, ...(summary.perfect ? {perfect: true} : {})}}, state.date).filter(e => e.day === state.date).reduce((n, e) => n + e.xp, 0); } catch { return null; }
  }, [state.gameOn, state.date, summary, habits.data, health.data, platform.data, state.days.data]);
  const progressText = loaded ? total ? `${done} of ${total} ${total === 1 ? 'dot' : 'dots'} today` : 'No dots counted today' : 'Loading your path…';
  const toggle = (name: 'edit' | 'options' | 'about') => setSheet(s => s === name ? null : name);

  return <dialog ref={dialog} open tabIndex={-1} className="checklist-overlay checklist-page" aria-labelledby="checklist-title" data-view={prefs.view} data-loaded={loaded || undefined} data-sheet={sheet ?? undefined}
    onKeyDown={e => { if (e.key !== 'Escape' || e.defaultPrevented) return; e.preventDefault(); escaped.current = true; window.setTimeout(() => { escaped.current = false; }, 0); onEscape(); }}
    onCancel={e => { e.preventDefault(); if (!escaped.current) onEscape(); }}
    onClose={() => {
      if (ownCloses.current > 0) { ownCloses.current--; return; }
      if (leaving.current) return;
      // The browser closed it anyway (Escape twice without a tap between): stay if an inner layer took the Escape.
      const d = dialog.current; if (escaped.current && d) { try { d.showModal(); } catch { /* stays closed */ } return; }
      leave();
    }}>
    <ChecklistSky/>
    <div className="checklist-topbar">
      <div className="checklist-topbar-row">
        <button type="button" className="checklist-close" aria-label="Close the Checklist" onClick={leave}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/></svg></button>
        <div className="checklist-progress">
          <GlassBar identity="checklist-progress" ready={loaded} className="checklist-progress-bar" value={total ? done / total : 0} role="progressbar" aria-label="Dots done today" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-valuetext={progressText}><Shine at={done}/></GlassBar>
          <p className="checklist-progress-line"><strong>{progressText}</strong>{summary?.perfect && <span className="checklist-perfect"> · Perfect orbit</span>}</p>
        </div>
        <p className="checklist-streak" role="img" data-lit={streak?.todayComplete || undefined} aria-label={`${streakDays}-day streak${streak?.todayComplete ? ', today complete' : ''}`}><FlameMark lit={!!streak?.todayComplete}/><CountUp value={streakDays}/></p>
        {xpToday !== null && <p className="checklist-xp" role="img" aria-label={`${xpToday} XP today`}><XpMark/><CountUp value={xpToday}/><small aria-hidden="true">XP</small></p>}
      </div>
    </div>

    <div className="checklist-shell">
      <header className="checklist-head">
        <p className="eyebrow">Checklist{state.date ? ` · ${formatDate(state.date, {weekday: true, year: false})}` : ''}</p>
        <h1 id="checklist-title"><NebulaFlow identity="checklist-title">Your orbit</NebulaFlow></h1>
        <div className="checklist-tools">
          <div className="checklist-view-switch" role="group" aria-label="View">
            <button type="button" aria-pressed={prefs.view === 'path'} onClick={() => state.setPrefs({view: 'path'})}>Path</button>
            <button type="button" aria-pressed={prefs.view === 'list'} onClick={() => state.setPrefs({view: 'list'})}>List</button>
          </div>
          <button type="button" className="checklist-tool" aria-expanded={sheet === 'edit'} onClick={() => toggle('edit')}><ToolMark name="edit"/>{sheet === 'edit' ? 'Close Edit path' : 'Edit path'}</button>
          <button type="button" className="checklist-tool" aria-expanded={sheet === 'options'} onClick={() => toggle('options')}><ToolMark name="options"/><span className="checklist-tool-text">Options</span></button>
          <button type="button" className="checklist-tool checklist-tool-about" aria-expanded={sheet === 'about'} aria-label="How the Checklist works" onClick={() => toggle('about')}><span aria-hidden="true">?</span></button>
        </div>
      </header>

      <section className="checklist-stage" aria-labelledby="checklist-title" aria-busy={!loaded || undefined}>
        {!loaded ? <div className="checklist-loading" aria-hidden="true">{Array.from({length: 6}, (_, i) => <span key={i} style={{'--i': i} as CSSProperties}/>)}</div>
          : state.unreadable ? <section className="panel checklist-empty" role="alert"><h2>Your Checklist could not be read.</h2><p>{CHECKLIST_UNREADABLE_MESSAGE} Your habits, Health and Goals are untouched on their pages.</p></section>
          : empty ? <section className="panel checklist-empty"><GhostPath/><p className="eyebrow">A new path</p><h2>Your path is empty.</h2><p>Star what you do every day and it appears here as a glowing planet.</p><button type="button" className="primary" onClick={() => setSheet('edit')}>Edit path</button></section>
          : prefs.view === 'list' ? <ListView state={state} onAdd={() => setSheet('edit')}/> : <PathView state={state}/>}
      </section>

      <aside className="checklist-side" aria-label="Timers and history">
        {loaded && !state.unreadable && <CornerTimers state={state}/>}
        {loaded && !empty && !state.unreadable && <details className="checklist-history-fold" onToggle={e => setHistory((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>Your last twelve weeks</summary>
          {history && state.date && <Suspense fallback={<p role="status">Loading the history…</p>}><HistoryHeatmap days={state.days.data} today={state.date} todaySummary={summary ? {total: summary.total, done: summary.done, perfect: !!summary.perfect} : null}/></Suspense>}
        </details>}
      </aside>
      {/* The shell's honesty label stays with the Checklist while it covers the shell (ADR-028 H67's reason). */}
      {facts && <p className="checklist-alpha">{facts.network.label}</p>}
    </div>

    {sheet === 'options' && <Sheet onClose={() => setSheet(null)}><Suspense fallback={<p role="status">Opening options…</p>}><OptionsSheet state={state} onClose={() => setSheet(null)}/></Suspense></Sheet>}
    {sheet === 'edit' && !state.unreadable && <Sheet onClose={() => setSheet(null)} wide><Suspense fallback={<p role="status">Opening Edit path…</p>}><EditPath state={state} onClose={() => setSheet(null)}/></Suspense></Sheet>}
    {sheet === 'about' && <Sheet onClose={() => setSheet(null)}><About onClose={() => setSheet(null)}/></Sheet>}
    {celebrate && state.date && <Suspense fallback={null}><DayCelebration streak={streakDays} xp={xpToday} perfect={!!summary?.perfect} total={total} colours={state.dots.filter(d => d.counted).map(d => PATH_COLOURS[d.colour].hex)} onClose={() => setCelebrate(false)}/></Suspense>}
    <div ref={toastSlot} className="checklist-toast-slot"/>
    <p className="sr-only" role="status" aria-live="polite">{state.announce}</p>
  </dialog>;
}

/** A sheet over the path (Edit path, Options, About): a panel from the side on a computer, from the foot on a phone; the
 *  path stays behind it. Focus moves into it and back to its button when it closes; Escape closes it first. */
function Sheet({onClose, wide = false, children}: {onClose: () => void; wide?: boolean; children: ReactNode}) {
  const panel = useRef<HTMLDivElement>(null);
  useEscapeLayer(true, onClose);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    panel.current?.focus({preventScroll: true});
    return () => { if (back?.isConnected) back.focus({preventScroll: true}); };
  }, []);
  return <div className="checklist-sheet" data-wide={wide || undefined}>
    <span className="checklist-sheet-scrim" aria-hidden="true" onClick={onClose}/>
    <div ref={panel} className="checklist-sheet-panel" tabIndex={-1}>{children}</div>
  </div>;
}

/** "?": how the Checklist works, in a few lines, kept off the path itself. */
function About({onClose}: {onClose: () => void}) {
  return <section className="panel checklist-about" aria-labelledby="checklist-about-title">
    <div className="checklist-options-head"><h2 id="checklist-about-title">How it works</h2><button type="button" className="quiet" onClick={onClose}>Done</button></div>
    <ul>
      <li><strong>Tap a planet</strong> to tick it. Its real record lands on its own page; Undo takes it back.</li>
      <li><strong>Any order counts.</strong> Light every planet today to keep your streak, even late at night.</li>
      <li><strong>Perfect orbit</strong>: every planet in path order.</li>
      <li><strong>Sleep, Meditate, Fast</strong>: one tap starts, the next ends, saved on Health.</li>
      <li><strong>Edit path</strong> adds, removes and reorders your planets, or makes an item a habit.</li>
    </ul>
    <p className="fine checklist-limits">Your Checklist stays on this device: favourites, your own items and the day history are not synced yet, so another device starts with an empty path.</p>
  </section>;
}

/** A number that counts up to its new value when it grows (the first value shows at once; reduced motion: at once). */
function CountUp({value}: {value: number}) {
  const [shown, setShown] = useState(value), from = useRef(value), [pop, setPop] = useState(0);
  useEffect(() => {
    const start = from.current; from.current = value;
    if (value <= start || !motionOk()) { setShown(value); return; }
    setPop(p => p + 1);
    let frame = 0; const t0 = performance.now(), ms = 650;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms); setShown(Math.round(start + (value - start) * (1 - (1 - k) ** 3))); if (k < 1) frame = requestAnimationFrame(step); };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="checklist-count" data-pop={pop % 2 ? 'a' : pop ? 'b' : undefined} aria-hidden="true">{shown}</span>;
}
const motionOk = () => { try { return document.documentElement.dataset.appMotion !== 'off' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

/** The bar's shine: one sweep each time the count grows (never on the first paint). */
function Shine({at}: {at: number}) {
  const seen = useRef<number | null>(null), [run, setRun] = useState(0);
  useEffect(() => { if (seen.current !== null && at > seen.current) setRun(r => r + 1); seen.current = at; }, [at]);
  return run ? <span key={run} className="checklist-progress-shine" aria-hidden="true"/> : null;
}

function XpMark() {
  return <svg className="checklist-xp-mark" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M13.2 2.5 5 13.4h6l-1.2 8.1L19 10.4h-6.1z" fill="#ffd27a" stroke="#f0a24b" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
}
function ToolMark({name}: {name: 'edit' | 'options'}) {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{name === 'edit' ? <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/> : <path d="M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4"/>}</svg>;
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
