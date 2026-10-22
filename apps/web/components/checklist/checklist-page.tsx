'use client';
import {Suspense, lazy, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {NebulaFlow} from '../nebula-flow';
import {GlassBar} from '../progress/glass-progress';
import {zigiSignals} from '../zigi/bus';
import {pushToastLayer} from '../ui/undo-toast';
import {formatDate} from '../../lib/visual-format';
import {CHECKLIST_ROUTE} from '../../lib/af-checklist-keys';
import {PATH_COLOURS} from '../../lib/path/colours';
import {checklistDisplayColours} from '../../lib/checklist/display-colours';
import {pathBefore} from '../../lib/checklist/return-path';
import {checklistPath} from '../../lib/checklist/derive';
import {planetDesigns} from '../../lib/path/planet-pick';
import {PLANET_DESIGNS} from '../../lib/path/planet-designs';
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


/** Round 3: below 1180 px the Checklist keeps a bar of its own at the foot (the timers' button, the toast, "Jump to next"),
 *  which the path never runs under; the jump button moves into it there. */
const NARROW = '(max-width: 1179.98px)', PHONE = '(max-width: 767.98px)';
const useMedia = (query: string) => useSyncExternalStore(useCallback((l: () => void) => { const m = window.matchMedia?.(query); m?.addEventListener('change', l); return () => m?.removeEventListener('change', l); }, [query]), () => !!window.matchMedia?.(query).matches, () => false);

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
  const router = useRouter(), dialog = useRef<HTMLDialogElement>(null), toastSlot = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<'edit' | 'options' | 'about' | null>(null), [history, setHistory] = useState(false), [celebrate, setCelebrate] = useState(false);
  const narrow = useMedia(NARROW), phone = useMedia(PHONE), [jumpSlot, setJumpSlot] = useState<HTMLDivElement | null>(null);

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
  // Session AG Polish (ADR-030 J5; owner Part 6a): the day's celebration always plays once the day is complete, however it
  // was completed — a tap, the value stepper, a timer, the List, ZIGi, or Today's card and a habit's page while the
  // Checklist was closed (then the next time it opens that day) — once per day on this device (`checklist.celebratedOn`
  // in the UI preferences). Undoing the last tick and ticking it again the same day does not replay it; the menu's
  // "Replay today's celebration" does. Read only once everything has loaded, so a store still loading never plays it.
  const shownFor = useRef<string | null>(null), [replay, setReplay] = useState(false);
  const complete = !!summary && summary.total > 0 && summary.done === summary.total;
  useEffect(() => {
    if (!loaded || !state.prefsLoaded || !state.date || !summary || summary.total === 0) return;
    if (complete && prefs.celebratedOn !== state.date && shownFor.current !== state.date) {
      shownFor.current = state.date; setReplay(false); setCelebrate(true);
      state.setPrefs({celebratedOn: state.date});
    }
    // Undo of the last tick from the celebration's toast: the day is not complete any more, so the celebration closes.
    if (!complete) setCelebrate(false);
  }, [loaded, state.prefsLoaded, state.date, summary, complete, prefs.celebratedOn, state]);

  const total = summary?.total ?? 0, done = summary?.done ?? 0, empty = loaded && state.dots.length === 0;
  const streakDays = streak?.current ?? 0;
  const progressText = loaded ? total ? `${done} of ${total} ${total === 1 ? 'planet' : 'planets'} today` : 'No planets counted today' : 'Loading your path…';
  const day = state.date ? formatDate(state.date, {weekday: true, year: false}) : '';
  const [menu, setMenu] = useState(false);
  const open = (name: 'edit' | 'options' | 'about') => { setMenu(false); setSheet(s => s === name ? null : name); };
  useEscapeLayer(menu, () => setMenu(false));
  // ZIGi's poses on the path need the frames the launcher's small "alive" chunk publishes; the launcher sits behind the
  // Checklist, so the Checklist starts that chunk itself once the browser is idle (it starts once per page, wherever).
  useEffect(() => {
    let cancelled = false;
    const load = () => { if (!cancelled) void import('../zigi/alive').then(m => { if (!cancelled) m.startZigiAlive(); }).catch(() => undefined); };
    const idle = typeof window.requestIdleCallback === 'function', handle = idle ? window.requestIdleCallback(load, {timeout: 1500}) : window.setTimeout(load, 600);
    return () => { cancelled = true; if (idle) window.cancelIdleCallback(handle as number); else window.clearTimeout(handle as number); };
  }, []);

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
    {/* The top bar (Session AG, pointer 12): close, the title, today's progress and date, the view, the streak, the menu — no XP. */}
    <div className="checklist-topbar checklist-head">
      <div className="checklist-topbar-row">
        <button type="button" className="checklist-close" aria-label="Close the Checklist" onClick={leave}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/></svg></button>
        <div className="checklist-title"><h1 id="checklist-title"><NebulaFlow identity="checklist-title">Your orbit</NebulaFlow></h1></div>
        <div className="checklist-progress">
          <GlassBar identity="checklist-progress" ready={loaded} className="checklist-progress-bar" value={total ? done / total : 0} role="progressbar" aria-label="Planets lit today" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-valuetext={progressText}><Shine at={done}/><span className="checklist-progress-spark" aria-hidden="true"/></GlassBar>
          <p className="checklist-progress-line"><strong>{progressText}</strong>{summary?.perfect && <span className="checklist-perfect"> · Perfect orbit</span>}{day && <span className="eyebrow"> · {day}</span>}</p>
        </div>
        <div className="checklist-view-switch" role="group" aria-label="View">
          <button type="button" aria-label="Path" aria-pressed={prefs.view === 'path'} onClick={() => state.setPrefs({view: 'path'})}><ViewMark name="path"/></button>
          <button type="button" aria-label="List" aria-pressed={prefs.view === 'list'} onClick={() => state.setPrefs({view: 'list'})}><ViewMark name="list"/></button>
        </div>
        <p className="checklist-streak" role="img" data-lit={streak?.todayComplete || undefined} aria-label={`${streakDays}-day streak${streak?.todayComplete ? ', today complete' : ''}`}><FlameMark lit={!!streak?.todayComplete}/><CountUp value={streakDays}/></p>
        <div className="checklist-menu-wrap">
          <button type="button" className="checklist-menu-button" aria-label="Checklist menu" aria-expanded={menu} onClick={() => setMenu(m => !m)}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/></svg></button>
          {menu && <div className="checklist-menu" role="group" aria-label="Checklist menu">
            {/* Round 4: on a phone the top bar is one row, so the view lives here (the bar's own switch is hidden there). */}
            {phone && <div className="checklist-menu-view" role="group" aria-label="View">
              <button type="button" aria-pressed={prefs.view === 'path'} onClick={() => { setMenu(false); state.setPrefs({view: 'path'}); }}><ViewMark name="path"/>Path</button>
              <button type="button" aria-pressed={prefs.view === 'list'} onClick={() => { setMenu(false); state.setPrefs({view: 'list'}); }}><ViewMark name="list"/>List</button>
            </div>}
            <button type="button" aria-expanded={sheet === 'edit'} onClick={() => open('edit')}><ToolMark name="edit"/>Edit path</button>
            <button type="button" aria-expanded={sheet === 'options'} onClick={() => open('options')}><ToolMark name="options"/>Options</button>
            <button type="button" aria-expanded={sheet === 'about'} onClick={() => open('about')}><ToolMark name="about"/>How it works</button>
            {complete && <button type="button" onClick={() => { setMenu(false); setReplay(true); setCelebrate(true); }}><ToolMark name="replay"/>Replay today’s celebration</button>}
          </div>}
        </div>
      </div>
    </div>
    {menu && <span className="checklist-menu-scrim" aria-hidden="true" onClick={() => setMenu(false)}/>}

    <div className="checklist-shell">
      <section className="checklist-stage" aria-labelledby="checklist-title" aria-busy={!loaded || undefined}>
        {!loaded ? <div className="checklist-loading" aria-hidden="true">{Array.from({length: 6}, (_, i) => <span key={i} style={{'--i': i} as CSSProperties}/>)}</div>
          : state.unreadable ? <section className="panel checklist-empty" role="alert"><h2>Your Checklist could not be read.</h2><p>{CHECKLIST_UNREADABLE_MESSAGE} Your habits, Health and Goals are untouched on their pages.</p></section>
          : empty ? <section className="panel checklist-empty"><GhostPath/><p className="eyebrow">A new path</p><h2>Your path is empty.</h2><p>Star what you do every day and it appears here as a glowing planet.</p><button type="button" className="primary" onClick={() => setSheet('edit')}>Edit path</button></section>
          : prefs.view === 'list' ? <ListView state={state} onAdd={() => setSheet('edit')}/> : <PathView state={state} jumpDock={narrow ? jumpSlot : null}/>}
      </section>

      <aside className="checklist-side" aria-label="Timers and history">
        {loaded && !state.unreadable && <CornerTimers state={state}/>}
        {/* Round 4: on a computer the twelve weeks stand open under the timers (the column's room); below that, a fold. */}
        {loaded && !empty && !state.unreadable && !narrow && state.date && <section className="checklist-history-open" aria-labelledby="checklist-history-title">
          <h2 id="checklist-history-title" className="checklist-history-title">Orbit consistency · last 12 weeks</h2>
          <Suspense fallback={<p role="status">Loading the history…</p>}><HistoryHeatmap days={state.days.data} today={state.date} todaySummary={summary ? {total: summary.total, done: summary.done, perfect: !!summary.perfect} : null}/></Suspense>
        </section>}
        {loaded && !empty && !state.unreadable && (narrow || !state.date) && <details className="checklist-history-fold" onToggle={e => setHistory((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>Orbit consistency<span className="checklist-history-span"> · last 12 weeks</span></summary>
          {history && state.date && <Suspense fallback={<p role="status">Loading the history…</p>}><HistoryHeatmap days={state.days.data} today={state.date} todaySummary={summary ? {total: summary.total, done: summary.done, perfect: !!summary.perfect} : null}/></Suspense>}
        </details>}
      </aside>
    </div>

    {sheet === 'options' && <Sheet onClose={() => setSheet(null)}><Suspense fallback={<p role="status">Opening options…</p>}><OptionsSheet state={state} onClose={() => setSheet(null)}/></Suspense></Sheet>}
    {sheet === 'edit' && !state.unreadable && <Sheet onClose={() => setSheet(null)} wide><Suspense fallback={<p role="status">Opening Edit path…</p>}><EditPath state={state} onClose={() => setSheet(null)}/></Suspense></Sheet>}
    {sheet === 'about' && <Sheet onClose={() => setSheet(null)}><About onClose={() => setSheet(null)}/></Sheet>}
    {celebrate && state.date && <Suspense fallback={null}><DayCelebration streak={streakDays} grew={!replay} perfect={!!summary?.perfect} total={total} {...celebrationBodies(state)} onClose={() => { setCelebrate(false); setReplay(false); }}/></Suspense>}
    {/* The foot bar (phones and tablets): an opaque band the path never runs under, holding the timers' button (the timers
        place it), the toast and "Jump to next". On a computer the toast sits under the timers at the side instead. */}
    <div className="checklist-dock" aria-hidden="true"/>
    <div ref={setJumpSlot} className="checklist-jump-slot"/>
    <div ref={toastSlot} className="checklist-toast-slot"/>
    <p className="sr-only" role="status" aria-live="polite">{state.announce}</p>
  </dialog>;
}

/** The celebration's bodies: an orb for every item done today in its node's colour, and the day's orbit planets — the
 *  same designs the path shows (lib/path/planet-pick.ts, by each orbit's first node). */
function celebrationBodies(state: ReturnType<typeof useChecklist>) {
  const c = checklistDisplayColours(state.record.data, state.dots), colour = (d: (typeof state.dots)[number]) => c.get(d.id) ?? d.colour;
  const model = checklistPath(state.record.data, state.dots.map(d => ({...d, colour: colour(d)})), []);
  const planets = planetDesigns(model.sections.filter(s => s.steps.length).map(s => s.steps[0]!.colour), model.id).flatMap(id => id ? [PLANET_DESIGNS[id]] : []);
  return {colours: state.dots.filter(d => d.counted && d.state === 'done').map(d => PATH_COLOURS[colour(d)].hex), planets};
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

function ToolMark({name}: {name: 'edit' | 'options' | 'about' | 'replay'}) {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{name === 'edit' ? <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/> : name === 'options' ? <path d="M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4"/> : name === 'replay' ? <path d="M12 3.5l1.9 5.3 5.6.2-4.4 3.5 1.6 5.4L12 14.8l-4.7 3.1 1.6-5.4L4.5 9l5.6-.2zM19 3v3M17.5 4.5h3"/> : <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.8h.01"/>}</svg>;
}
function ViewMark({name}: {name: 'path' | 'list'}) {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{name === 'path' ? <><circle cx="8" cy="5" r="2.6"/><circle cx="16" cy="12" r="2.6"/><circle cx="8" cy="19" r="2.6"/><path d="M10.2 6.4 13.8 10.6M13.8 13.4 10.2 17.6"/></> : <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>}</svg>;
}

/** Session AF (crit1): the empty path's picture: five faint dots in the path's own colours on a dashed flow line, so an
 *  empty Checklist shows what it becomes. Decorative only (aria-hidden), still, the same in every theme. */
const GHOST_DOTS: [number, number, string][] = [[24, 62, 'var(--pillar-habits, #23eaff)'], [92, 26, 'var(--brand-blue, #459dff)'], [160, 46, 'var(--brand-magenta, #f06dff)'], [228, 70, 'var(--pillar-goals, #9273ff)'], [296, 32, 'var(--ring-emerald, #26e8bd)']];
function GhostPath() {
  const id = useId().replace(/:/g, '');
  return <svg className="checklist-ghost-path" viewBox="0 0 320 96" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}-flow`} x1="0" x2="1" y1="0" y2="0">{GHOST_DOTS.map(([, , colour], i) => <stop key={i} offset={i / (GHOST_DOTS.length - 1)} stopColor={colour}/>)}</linearGradient></defs>
    <path className="checklist-ghost-line" d="M24 62 Q58 22 92 26 Q126 30 160 46 Q194 62 228 70 Q262 78 296 32" stroke={`url(#${id}-flow)`}/>
    {GHOST_DOTS.map(([x, y, colour], i) => <g key={i} style={{color: colour}}><circle className="checklist-ghost-halo" cx={x} cy={y} r="13"/><circle className="checklist-ghost-dot" cx={x} cy={y} r="7"/></g>)}
  </svg>;
}
