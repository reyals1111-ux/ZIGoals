'use client';
import {Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {milestoneState, nextStep, normalisePath, orbitOffset, pathSegments, pathSteps, sectionProgress, snakeOffset, stepIntent, zigiAnchor, type PathModel, type PathStep, type PlacedMilestone, type StepIntent} from '../../lib/path/model';
import {entranceAllowed} from '../use-entrance';
import {PATH_COLOURS} from '../../lib/path/colours';
import {OrbitFinale, PathChest} from './path-milestone';
import {PathDot} from './path-dot';
import {PathLine} from './path-line';
import {FlowLine} from '../orbit-path/flow-line';
import {sidesFor, type FlowNode} from '../../lib/path/flow-geometry';
import {PathBanner} from './path-section';
import {OrbitBanner} from '../orbit-path/orbit-banner';
import {planetDesigns} from '../../lib/path/planet-pick';
import {PLANET_DESIGNS} from '../../lib/path/planet-designs';
import {PathZigi, ZIGI_PATH_STATES} from './path-zigi';
import {usePathGeometry, type PathGeometry} from './use-path-geometry';
import {phoneLanes, type Lane} from '../../lib/path/phone-lanes';
import './path.css';

/**
 * The shared path renderer (Session AF, ADR-028; P7.4–P7.11): any `PathModel` drawn as large glowing dots in their own
 * colours, joined by the footer's neon flow line, grouped in orbits with banners, with reward chests, ZIGi beside the next
 * dot and a "Jump to next" bubble. The Checklist, the Earn lane's Start-here path and the Academy's mini path draw with it
 * unchanged. It never decides a state: the caller derives every step from the real record and handles `onStep`.
 *
 * - `onStep(step, intent)`: pressing a dot; `intent` is tick, open (a link step, after navigation starts) or value.
 * - `panelFor` / `renderPanel`: the caller's inline panel (the value stepper, a done dot's details) under one step.
 * - `zigi`: false hides ZIGi; `state` overrides the mood's state (e.g. sleepy late at night); `say` is a short line.
 * Motion is one-time per occurrence: a dot that has just become done fills and bursts, its line lights along its length,
 * a chest that has just been reached opens, ZIGi cheers for a moment. Nothing loops. Reduced motion and Motion Off show
 * every final state at once (CSS). Keyboard: the dots are buttons in path order; Home/End and the arrow keys move
 * between them; the bubble scrolls the next dot into view and focuses it. The bubble takes no layout space and shows
 * only while the next dot is off screen and the bubble itself sits whole on the screen, inside the path, over no banner,
 * chest or open panel (critique round 2).
 *
 * Session AF (L3b): `variant="orbit"` is the Checklist's full-screen, learning-path look (its CSS is
 * components/path/path-orbit.css, which only the Checklist imports): the S winds every six dots, the next dot carries an
 * orbit ring, a gentle pulse and a START / NEXT bubble, a tick bursts into sparks and sends a comet along the line to the
 * next dot, an orbit's banner fills its own bar and celebrates once when the orbit is complete, chests sit on the path,
 * the day's end is a trophy planet, and ZIGi is a large figure beside the next dot. The owner allowed that motion inside
 * the Checklist only; reduced motion and Motion Off still show every final state at once. The default look (Earn's
 * Start-here path and Academy) is unchanged.
 *
 * Round 3 (a learning path's density): each planet's name and the next one's NEXT bubble stand beside it, off the line,
 * on the side toward the path's middle; ZIGi stands on the other side, and cheers (arms up, hops, sparkles) beside a
 * planet just ticked; a chest rides its orbit's last planet instead of taking a row; the comet runs on from the planet
 * just ticked to the next one, and that stretch then breathes softly. `jumpDock`: an element of the caller's to hold the
 * "Jump to next" button (the full-screen Checklist's own bottom bar on a phone or tablet), where it never covers the path.
 * The "is the next dot on screen" reading leaves out the scroller's own scroll padding (a sticky bar's height).
 */
export type PathProps = {
  model: PathModel;
  ariaLabel: string;
  layout?: 'snake' | 'straight';
  density?: 'full' | 'compact';
  onStep?: (step: PathStep, intent: StepIntent) => void;
  panelFor?: string | null;
  renderPanel?: (step: PathStep) => ReactNode;
  zigi?: false | {state?: string; say?: string};
  jumpLabel?: string;
  className?: string;
  /** 'orbit': the Checklist's full-screen path (see above). Default: the shared look. */
  variant?: 'default' | 'orbit';
  /** Where the "Jump to next" button goes instead of riding the path (see above). */
  jumpDock?: HTMLElement | null;
};

/** The orbit look's finale node: where the line ends (Session AG). */
const FINALE_POINT = 'finale:end';
const JUST_MS = 1100, CHEER_MS = 1600, ORBIT_CHEER_MS = 1500;
/** After a tick that completes an orbit, the path glides on to the next planet once the orbit's celebration has played. */
const ORBIT_LAND_AFTER_MS = 1400;
/** The element that scrolls the path (the full-screen Checklist's own layer), or null for the page. */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p; }
  return null;
}
const sideOf = (offset: number): 'left' | 'right' => offset > 0 ? 'left' : 'right';
/** Rounds 4–6 (the orbit look): the names alternate sides planet by planet, as a learning path's do — a name that has no
 *  room on its turn's side (the wave's far ends; a long name on a phone) takes the other. Round 6: the sides come from the
 *  path alone — never from which planet is next, nor from where ZIGi stands — so a tick moves no name and no chest (the
 *  room each name needs includes the step out it takes while its planet is next). The room is read from the path's measured
 *  geometry (the planets' own size, not the next one's larger drawing) once it is there; before that, from the wave alone.
 *  ZIGi's side beside the next planet is the one without its name. */
type Side = 'left' | 'right';
const flip = (s: Side): Side => s === 'left' ? 'right' : 'left';
/** A name's width as drawn (its font, from the page), or null before the page can measure. */
let pen: CanvasRenderingContext2D | null | undefined;
function nameWidth(text: string, px: number): number | null {
  if (typeof document === 'undefined') return null;
  if (pen === undefined) { try { pen = document.createElement('canvas').getContext('2d'); } catch { pen = null; } }
  if (!pen) return null;
  pen.font = `750 ${px}px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
  return pen.measureText(text).width * 1.03;
}
function orbitSides(steps: {id: string; label: string}[], swing: (i: number) => number, nextAt: number, geo: PathGeometry | null): {labels: Side[]; full: boolean[]; zigi: Side} {
  // (The room a name has beside its planet, as the sheet gives it, and the step out it takes while its planet is next.)
  const phone = !!geo && geo.w < 560, wide = !!geo && geo.w >= 900, px = phone ? 14 : 15, maxW = phone ? 176 : 272, gap = phone ? 12 : 16, reserve = phone ? 0 : 28, slack = phone ? 8 : -6;
  const point = (i: number) => geo?.points[steps[i]?.id ?? ''];
  // (The room the sheet gives a name — less the step out it takes while its planet is next, unless it keeps the full room.)
  const space = (i: number, side: Side) => { const p = point(i); if (!geo || !p) return null; const r = p.r ?? 40; return (side === 'left' ? p.x - r : geo.w - p.x - r) - gap; };
  const room = (i: number, side: Side, full = false) => { const x = space(i, side); return x === null ? null : Math.min(maxW, x - (full ? 0 : reserve) + slack); };
  // (A name's lines at a width: one on a tablet or a computer, two at most on a phone, never a word cut; its longest line.)
  const wrap = (label: string, w: number): {lines: number; longest: number} | null => {
    const whole = nameWidth(label, px); if (whole === null) return null;
    if (!phone) return {lines: whole <= w ? 1 : 9, longest: whole};
    let lines = 1, line = 0, longest = 0; const space = nameWidth(' ', px) ?? 4;
    for (const word of label.split(/\s+/)) { const ww = nameWidth(word, px) ?? 0; if (ww > w) return {lines: 9, longest: ww}; if (!line) line = ww; else if (line + space + ww <= w) line += space + ww; else { longest = Math.max(longest, line); lines++; line = ww; } }
    return {lines, longest: Math.max(longest, line)};
  };
  // A name fits a side when it keeps to its lines in the room left after its step out as the next planet's. Failing that
  // (round 7: a long name on a phone), when it keeps to them in the full room and its longest line, stepped out, still ends
  // 4 px inside the screen: that name keeps the full room (`full`), so it never rewraps either way.
  const fit = (i: number, side: Side): {ok: boolean; full: boolean} => {
    const w = room(i, side), o = swing(i), label = steps[i]!.label;
    if (w === null) return {ok: Math.abs(o) < 1 || (o > 0) === (side === 'left'), full: false};
    const most = phone ? 2 : 1, cut = wrap(label, w);
    if (cut === null) return {ok: label.length * (phone ? 8.4 : 8.8) <= (phone ? w * 1.9 : w), full: false};
    if (cut.lines <= most) return {ok: true, full: false};
    const wf = room(i, side, true)!, whole = wrap(label, wf), edge = (space(i, side) ?? 0) + (side === 'left' ? geo?.inset?.left ?? 0 : geo?.inset?.right ?? 0) - 4;
    return whole && whole.lines <= most && whole.longest + reserve <= edge ? {ok: true, full: true} : {ok: false, full: false};
  };
  // (Round 7: ZIGi stands on the side away from the name, so that side must hold it: from the next planet's ring — a size
  // larger, its ring and moon — 13 px clear to 14 px from the edge, as wide as ZIGi at its smallest rest: 96 px tall on a
  // phone, 120 on a tablet, 140 on a computer.)
  const zigiRoom = (i: number, side: Side) => {
    const p = point(i); if (!geo || !p) return true;
    const r = (p.r ?? 40) * (phone ? 1.1 : 1.15) + (phone ? 13.2 : 23), need = 13 + (phone ? 96 : wide ? 140 : 120) * .838 + 10;
    return (side === 'left' ? p.x - r : geo.w - p.x - r) >= need;
  };
  const labels: Side[] = [], full: boolean[] = [];
  steps.forEach((_, i) => {
    const alt: Side = (labels[i - 1] ?? 'right') === 'left' ? 'right' : 'left', order: Side[] = [alt, flip(alt)];
    let side = order.find(s => fit(i, s).ok && zigiRoom(i, flip(s))) ?? order.find(s => fit(i, s).ok);
    if (!side) side = (room(i, 'left') ?? 0) >= (room(i, 'right') ?? 0) ? 'left' : 'right';
    labels.push(side); full.push(fit(i, side).full);
  });
  return {labels, full, zigi: nextAt >= 0 && nextAt < steps.length ? flip(labels[nextAt]!) : 'right'};
}

/** Session AG Polish (owner Part 2): the phone's own layout below 641 px (the orbit sheet's phone breakpoint). */
const PHONE_QUERY = '(max-width: 640px)';
const subscribePhone = (l: () => void) => { const m = typeof window === 'undefined' ? null : window.matchMedia?.(PHONE_QUERY); m?.addEventListener('change', l); return () => m?.removeEventListener('change', l); };
const usePhoneLayout = (on: boolean) => useSyncExternalStore(subscribePhone, () => on && !!window.matchMedia?.(PHONE_QUERY).matches, () => false);
/** A name tab's one-line width on a phone: the words (14 px, 750) plus the tab's padding and border and the check's room —
 *  the check is always counted, so a tick never moves a node. */
const phoneTabWidth = (label: string) => { const w = nameWidth(label, 14); return w === null ? label.length * 8.4 + 40 : Math.ceil(w) + 40; };
/** Where the orbit look lands the next planet: this share of the screen's height between its bars. */
const landAt = () => typeof window !== 'undefined' && window.innerWidth < 1180 ? .44 : .4;

/** Steps (and chests) that have just changed into done / reached since the last render, for their one-time motion. */
function useJust(ids: string[], key: string): Set<string> {
  const previous = useRef<Set<string> | null>(null), [just, setJust] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const now = new Set(ids), before = previous.current; previous.current = now;
    if (!before) return;
    const fresh = ids.filter(id => !before.has(id));
    if (!fresh.length) return;
    setJust(new Set(fresh));
    const t = window.setTimeout(() => setJust(new Set()), JUST_MS);
    return () => window.clearTimeout(t);
    // `key` carries the ids' identity; the array itself is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return just;
}

export function Path({model: raw, ariaLabel, layout = 'snake', density = 'full', onStep, panelFor = null, renderPanel, zigi = {}, jumpLabel = 'Jump to next', className, variant = 'default', jumpDock = null}: PathProps) {
  const orbit = variant === 'orbit', swingOf = orbit ? orbitOffset : snakeOffset;
  const model = useMemo(() => normalisePath(raw), [raw]);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, ''), stage = useRef<HTMLDivElement>(null);
  const steps = useMemo(() => pathSteps(model), [model]), segments = useMemo(() => pathSegments(model), [model]);
  const milestones = useMemo(() => milestoneState(model), [model]), next = nextStep(model), anchor = zigiAnchor(model);
  const doneIds = steps.filter(s => s.state === 'done').map(s => s.id), reachedIds = milestones.filter(m => m.reached).map(m => `m:${m.id}`);
  // The orbit look also celebrates an orbit the moment its last dot is done (once; `s:<id>`).
  const completeIds = orbit ? model.sections.filter(s => { const p = sectionProgress(s); return p.total > 0 && p.done === p.total; }).map(s => `s:${s.id}`) : [];
  const justIds = [...doneIds, ...reachedIds, ...completeIds];
  const just = useJust(justIds, justIds.join('|'));
  // Session AG Polish (owner Part 2): on a phone each node stands in a lane chosen so its tab fits on one line and ZIGi
  // has room on the other side (lib/path/phone-lanes.ts); the lanes come from the width and the names alone.
  const phoneLayout = usePhoneLayout(orbit), [laneKey, setLaneKey] = useState('');
  const geometryKey = `${layout}|${density}|${steps.map(s => s.id).join(',')}|${milestones.map(m => `${m.id}@${m.afterStepId}`).join(',')}|${panelFor ?? ''}|${laneKey}`;
  const geo = usePathGeometry(stage, geometryKey);
  const labelsKey = steps.map(s => s.label).join('\u0001'), stageW = geo?.w ?? 0;
  const lanes: Lane[] | null = useMemo(() => {
    if (!phoneLayout || !stageW) return null;
    // (ZIGi's width at rest on a phone: `--zigi-h: min(92px, 26cqi)` and its figure's 0.838 ratio.)
    return phoneLanes(labelsKey.split('\u0001').map(phoneTabWidth), {w: stageW, node: 62, zigi: Math.min(92, stageW * .26) * .838});
  }, [phoneLayout, stageW, labelsKey]);
  const nextLaneKey = lanes ? lanes.map(l => `${Math.round(l.x)}${l.side[0]}${l.wrap ? 'w' : ''}`).join(',') : '';
  useLayoutEffect(() => { if (nextLaneKey !== laneKey) setLaneKey(nextLaneKey); }, [nextLaneKey, laneKey]);

  // ZIGi cheers for a moment after a dot is done here, then returns to the path's mood. The orbit look cheers beside the
  // planet just ticked (celebrating when it completes an orbit), then goes on to stand by the next one.
  const [cheer, setCheer] = useState(false);
  const tickedId = steps.find(s => just.has(s.id))?.id ?? null, ticked = tickedId !== null;
  const [cheerAt, setCheerAt] = useState<{id: string; state: string} | null>(null);
  useEffect(() => { if (!ticked) return; setCheer(true); const t = window.setTimeout(() => setCheer(false), CHEER_MS); return () => window.clearTimeout(t); }, [ticked]);
  // (Its own timer: the tick's `just` mark ends sooner than the cheer, and must not cut the cheer short.)
  const cheerTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!orbit || !tickedId || !next) return;
    // Round 4: ZIGi cheers beside the planet just ticked (its waving greeting, hops, sparkles) — only where motion is allowed;
    // under reduced motion and Motion Off it stays beside the next planet, pointing at it.
    if (!entranceAllowed()) return;
    setCheerAt({id: tickedId, state: ZIGI_PATH_STATES.done});
    window.clearTimeout(cheerTimer.current);
    cheerTimer.current = window.setTimeout(() => setCheerAt(null), ORBIT_CHEER_MS);
    // the tick's identity is enough; `next` is read at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orbit, tickedId]);
  useEffect(() => () => window.clearTimeout(cheerTimer.current), []);
  const zigiState = zigi === false ? null : zigi.state ?? (cheer && anchor.mood !== 'done' ? ZIGI_PATH_STATES.tick : ZIGI_PATH_STATES[anchor.mood]);
  // (Round 7: the cheer starts with the very render that shows the tick — the state above is set a frame later, and for that
  // frame ZIGi stood by the next planet and then went back, a jump the iteration-6 frames caught.)
  const cheering = cheerAt ?? (orbit && tickedId && next && entranceAllowed() ? {id: tickedId, state: ZIGI_PATH_STATES.done} : null);
  const zigiAt = orbit ? cheering?.id ?? next?.id ?? null : next?.id ?? null;
  // Round 5 (the orbit look): at rest beside the next planet ZIGi points at it (`presenting`, art of its own) whatever the
  // day's mood — the half-way `proud` and `success` have no art of their own and wear the celebrate frame (hands on the
  // head) — and at the day's end it cheers at the trophy.
  const zigiNow = orbit && cheering ? cheering.state : orbit && zigiState ? (anchor.mood === 'done' ? ZIGI_PATH_STATES.done : 'presenting') : zigiState;

  // The orbit look lands on the next planet: on opening (at once), and after a tick that leaves it outside the comfortable
  // middle of the screen (a moment later, gliding unless motion is off), it is brought to about 40 % of the screen's height
  // (`landAt`; round 8: 44 % below 1180 px, where an orbit's chest keeps more room under its planet and the planets above the
  // next one would otherwise slip off the top).
  const landed = useRef(false), measured = geo !== null, orbitsDone = useRef<string[] | null>(null), orbitsKey = completeIds.join('|');
  useEffect(() => {
    if (!orbit || !measured || !next) return;
    // (Read here, in the same commit as the new next planet: the `just` marks only arrive a render later.)
    const before = orbitsDone.current, finished = before !== null && completeIds.some(id => !before.includes(id)); orbitsDone.current = completeIds;
    const el = stage.current?.querySelector<HTMLElement>(`[data-path-point="${CSS.escape(next.id)}"]`), s = stage.current; if (!el || !s) return;
    const scroller = scrollerOf(s);
    const go = (glide: boolean) => {
      // (The part of the scroller a sticky bar does not cover: its scroll-padding-top, as the browser's own scrolling reads it.)
      const box = scroller ? scroller.getBoundingClientRect() : {top: 0, height: window.innerHeight}, cs = scroller ? getComputedStyle(scroller) : null;
      const pad = cs ? parseFloat(cs.scrollPaddingTop) || 0 : 0, padBottom = cs ? parseFloat(cs.scrollPaddingBottom) || 0 : 0;
      const r = el.getBoundingClientRect(), view = {top: box.top + pad, height: box.height - pad - padBottom};
      const at = (r.top + r.height / 2 - view.top) / view.height;
      if (glide && at >= .12 && at <= .7) return;
      const top = (scroller ? scroller.scrollTop : window.scrollY) + (r.top + r.height / 2 - view.top) - view.height * landAt();
      (scroller ?? window).scrollTo({top: Math.max(0, top), behavior: glide && entranceAllowed() ? 'smooth' : 'auto'});
    };
    if (!landed.current) { landed.current = true; go(false); return; }
    // (A tick that completes an orbit waits for its celebration on the banner before the path moves on.)
    const t = window.setTimeout(() => go(true), finished ? ORBIT_LAND_AFTER_MS : 300); return () => window.clearTimeout(t);
  }, [orbit, measured, next?.id, orbitsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Jump to next": wanted while the next dot is out of view (always, where the browser cannot tell).
  const [nextVisible, setNextVisible] = useState(true), [nextAbove, setNextAbove] = useState(false);
  const nextId = next?.id ?? null;
  useEffect(() => {
    const el = nextId ? stage.current?.querySelector<HTMLElement>(`[data-path-point="${CSS.escape(nextId)}"]`) : null;
    if (!el) { setNextVisible(true); return; }
    if (typeof IntersectionObserver === 'undefined') { setNextVisible(false); return; }
    // (A sticky bar over the scroller is not "on screen": its scroll padding, top and bottom, is left out of the view.)
    const sc = stage.current ? scrollerOf(stage.current) : null, cs = sc ? getComputedStyle(sc) : null;
    const padTop = cs ? parseFloat(cs.scrollPaddingTop) || 0 : 0, padBottom = cs ? parseFloat(cs.scrollPaddingBottom) || 0 : 0;
    const io = new IntersectionObserver(entries => { for (const e of entries) { setNextVisible(e.isIntersecting); setNextAbove(e.boundingClientRect.top < padTop); } }, {threshold: .6, rootMargin: `-${padTop}px 0px -${padBottom}px 0px`});
    io.observe(el);
    return () => io.disconnect();
  }, [nextId, geometryKey]);
  // Critique round 2 (L5c): the bubble takes no room (it rides a zero-height sticky dock on a track laid over the stage) and
  // is shown only where it is whole on the screen, inside its own path, and over no orbit banner, chest, end or open
  // panel — so it never parks on the first banner's count, never hangs over the page around the path, and never leaves
  // an empty band at the path's end. Measured on scroll and resize, once a frame at most.
  const bubble = useRef<HTMLButtonElement>(null), [jumpClear, setJumpClear] = useState(false);
  const wantJump = !!next && !nextVisible, docked = !!jumpDock;
  useEffect(() => {
    if (!wantJump || docked) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const b = bubble.current, s = stage.current; if (!b || !s) return;
      const r = b.getBoundingClientRect(), box = s.getBoundingClientRect();
      const whole = r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight && r.top >= box.top && r.bottom <= box.bottom;
      const covers = [...s.querySelectorAll('.path-banner, .orbit-planet, .path-chest, .path-end, .path-panel')].some(el => { const o = el.getBoundingClientRect(); return o.left < r.right && o.right > r.left && o.top < r.bottom && o.bottom > r.top; });
      setJumpClear(whole && !covers);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    schedule();
    document.addEventListener('scroll', schedule, {passive: true, capture: true}); window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('scroll', schedule, {capture: true}); window.removeEventListener('resize', schedule); setJumpClear(false); };
  }, [wantJump, geometryKey, docked]);
  const jump = useCallback(() => {
    const el = next ? stage.current?.querySelector<HTMLElement>(`[data-path-point="${CSS.escape(next.id)}"]`) : null; if (!el) return;
    // (The orbit look brings it to the same place as its landing: about 40 % of the part of the screen its bars leave.)
    const sc = orbit && stage.current ? scrollerOf(stage.current) : null;
    if (sc) { const box = sc.getBoundingClientRect(), cs = getComputedStyle(sc), pad = parseFloat(cs.scrollPaddingTop) || 0, padB = parseFloat(cs.scrollPaddingBottom) || 0, r = el.getBoundingClientRect(); sc.scrollTo({top: Math.max(0, sc.scrollTop + r.top + r.height / 2 - box.top - pad - (box.height - pad - padB) * landAt()), behavior: entranceAllowed() ? 'smooth' : 'auto'}); }
    else el.scrollIntoView({block: 'center', behavior: entranceAllowed() ? 'smooth' : 'auto'});
    el.focus({preventScroll: true});
  }, [next, orbit]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const dots = [...(stage.current?.querySelectorAll<HTMLElement>('button.path-dot, a.path-dot') ?? [])], at = dots.indexOf(event.target as HTMLElement);
    if (at < 0) return;
    const to = event.key === 'Home' ? 0 : event.key === 'End' ? dots.length - 1 : event.key === 'ArrowDown' ? Math.min(dots.length - 1, at + 1) : event.key === 'ArrowUp' ? Math.max(0, at - 1) : -1;
    if (to < 0) return;
    event.preventDefault(); dots[to]?.focus();
  };

  const chestsAfter = new Map<string, PlacedMilestone[]>();
  for (const m of milestones) if (m.afterStepId) chestsAfter.set(m.afterStepId, [...(chestsAfter.get(m.afterStepId) ?? []), m]);
  const zigiAtEnd = zigiState && !next && steps.length > 0;
  // The orbit look: a comet runs along each line a tick has just lit, and from the dot just done on to the next one.
  // Round 3: the comet runs on from the planet just ticked to the next one; with no such stretch (the next is elsewhere), along
  // the stretch the tick lit.
  const onward = orbit ? segments.filter(s => just.has(s.from) && s.to === next?.id) : [];
  // Session AG Polish (owner Part 4): each orbit's planet, by the colour of the node it spawns (lib/path/planet-pick.ts).
  const planets = useMemo(() => orbit ? planetDesigns(model.sections.map(s => s.steps[0]?.colour ?? null), model.id).map(id => id ? PLANET_DESIGNS[id] : null) : [], [orbit, model]);
  const nextAt = next ? steps.findIndex(x => x.id === next.id) : -1;
  const sides = lanes && lanes.length === steps.length ? {labels: lanes.map(l => l.side), full: lanes.map(() => false), zigi: nextAt >= 0 ? (lanes[nextAt]!.zigi === 'above' ? lanes[nextAt]!.side : flip(lanes[nextAt]!.side)) : 'right' as Side}
    : orbit ? orbitSides(steps, swingOf, nextAt, geo) : null, labelSides = sides?.labels ?? null;
  // ZIGi measures its surroundings again whenever the path's layout or its own planet changes.
  const zigiFit = orbit && geo ? `${geometryKey}|${geo.w}|${geo.h}|${zigiAt ?? ''}|${cheering?.id ?? ''}` : undefined;
  const endTrophy = orbit && milestones.some(m => m.at === 'end' && m.afterStepId);
  // Session AG (owner pointers 1–5): the orbit look's one flowing line through every node in path order, in on each node's
  // name side and out on the other, on to the day's finale; a tick sends a light along the stretch it lit.
  const flow = orbit && geo ? (() => {
    // (An orbit's planet comes before its first node: the line flows into its top and out of its bottom — reference 03.)
    const opens = new Map(model.sections.map((sec, si) => [sec.steps[0]?.id ?? '', {sec, si}]));
    const nodes: FlowNode[] = steps.flatMap((st, i) => {
      const p = geo.points[st.id], gate = opens.get(st.id), out: FlowNode[] = [];
      if (gate && planets[gate.si]) { const q = geo.points[`planet:${gate.sec.id}`], pr = sectionProgress(gate.sec); if (q) out.push({id: `planet:${gate.sec.id}`, x: q.x, y: q.y, r: q.r ?? 40, inSide: 'top', outSide: 'bottom', colour: PATH_COLOURS[st.colour].token, done: pr.total > 0 && pr.done === pr.total}); }
      if (p) out.push({id: st.id, x: p.x, y: p.y, r: p.r ?? 40, ...sidesFor(labelSides?.[i] ?? 'right'), colour: PATH_COLOURS[st.colour].token, done: st.state === 'done'});
      return out;
    });
    const fin = geo.points[FINALE_POINT], last = nodes.at(-1);
    if (fin && last) nodes.push({id: FINALE_POINT, x: fin.x, y: fin.y, r: fin.r ?? 40, inSide: last.outSide, outSide: last.inSide, colour: PATH_COLOURS.purple.token, done: anchor.mood === 'done'});
    const travel = new Set(nodes.flatMap((n, i) => just.has(n.id) ? [nodes[i + 1] ? `${n.id}>${nodes[i + 1]!.id}` : `tail:${n.id}`] : []));
    const vw = typeof window === 'undefined' ? 1440 : window.innerWidth, swing = vw < 641 ? Math.min(60, geo.w * .165) : vw < 1180 ? Math.min(150, geo.w * .2) : Math.min(220, geo.w * .22);
    return {nodes, travel, swing, tailTo: fin ? geo.h - 4 : null};
  })() : null;
  let index = 0;
  return <div ref={stage} className={`path-stage${className ? ` ${className}` : ''}`} data-layout={layout} data-density={density} data-variant={orbit ? 'orbit' : undefined} role="group" aria-label={ariaLabel} onKeyDown={onKeyDown} data-path={model.id} data-measured={geo ? '' : undefined} data-lanes={lanes ? '' : undefined}>
    {geo && (flow ? <FlowLine w={geo.w} h={geo.h} nodes={flow.nodes} seed={model.id} swing={flow.swing} leadFrom={0} tailTo={flow.tailTo} travel={flow.travel}/> : <PathLine geo={geo} segments={segments}/>)}
    {model.sections.map((section, si) => {
      const p = sectionProgress(section), heading = `path-${uid}-${si}`;
      return <section key={section.id} className="path-section" data-section={section.id} data-colour={section.colour} aria-labelledby={heading}>
        {orbit ? <OrbitBanner section={section} done={p.done} total={p.total} headingId={heading} justComplete={just.has(`s:${section.id}`)} planet={planets[si] ?? null}/> : <PathBanner section={section} index={si} done={p.done} total={p.total} headingId={heading}/>}
        <ol className="path-steps">
          {section.steps.map(step => {
            const i = index++, lane = lanes?.[i] ?? null, offset = layout === 'snake' ? swingOf(i) : 0, side = labelSides ? labelSides[i]! : sideOf(offset), intent = stepIntent(step), isNext = next?.id === step.id;
            // (The name's room: toward the path's middle it has the wave's reach to spare, away from it the reach is lost.)
            const toward = !orbit || offset === 0 ? 0 : (offset > 0) === (side === 'left') ? 1 : -1;
            const all = chestsAfter.get(step.id) ?? [];
            // The orbit look: a chest rides this planet's node (no row of its own); the day's trophy keeps its row at the end.
            const riding = orbit ? all.filter(m => m.at !== 'end') : [], chests = orbit ? all.filter(m => m.at === 'end') : all;
            return <Fragment key={step.id}>
              <li className="path-step" data-state={step.state} data-next={isNext ? '' : undefined} data-counted={step.counted === false ? 'no' : undefined} data-chest={riding.length ? '' : undefined} style={{'--offset': offset, ...(orbit ? {'--reach': Math.abs(offset), '--toward': toward, '--step-colour': PATH_COLOURS[step.colour].token} : {}), ...(lane ? {'--lane-x': `${Math.round((lane.x - stageW / 2) * 10) / 10}px`} : {})} as CSSProperties}>
                <div className="path-node">
                  <PathDot step={step} intent={intent} just={just.has(step.id)} expanded={panelFor === step.id} onPress={intended => onStep?.(step, intended)} {...(orbit ? {orbit: {next: isNext, arrive: isNext && onward.length > 0}} : {})}/>
                  {/* Round 4: the next planet wears a one-word tag (a learning path's START); its name stays an ordinary name. */}
                  {orbit && isNext && <span className="path-next-tag" aria-hidden="true">{anchor.mood === 'start' ? 'Start' : 'Next'}</span>}
                  <span className={orbit ? 'path-label orbit-tab' : 'path-label'} data-side={side} data-room={sides?.full[i] ? 'full' : undefined} data-wrap={lane?.wrap || undefined} data-zigi-slot={lane && isNext ? lane.zigi : undefined} title={orbit ? step.label : undefined} style={orbit ? {'--node': PATH_COLOURS[step.colour].token, ...(lane ? {'--tab-max': `${Math.floor(lane.maxTab)}px`} : {})} as CSSProperties : undefined}><span className="path-label-text">{step.label}</span>{step.note && <span className="path-label-note">{step.note}</span>}{step.state === 'locked' && step.lockedReason && <span className="path-label-note">{step.lockedReason}</span>}</span>
                  {zigiNow && zigiAt === step.id && <PathZigi state={zigiNow} side={orbit && isNext && !cheering && sides ? sides.zigi : side === 'left' ? 'right' : 'left'} say={zigi === false || orbit ? undefined : zigi.say} alive={orbit} cheer={orbit && cheering?.id === step.id} fit={zigiFit}/>}
                  {riding.map(m => <PathChest key={m.id} milestone={m} just={just.has(`m:${m.id}`)} side={side} uid={uid} onPath={{offset, trophy: false, zigi: null, inline: true}}/>)}
                </div>
                {panelFor === step.id && renderPanel && <div className="path-panel">{renderPanel(step)}</div>}
              </li>
              {chests.map(m => {
                const after = layout === 'snake' ? swingOf(i + 1) : 0, around = offset + after;
                // The orbit look sets a chest on the path itself, half way between its two dots; the day's end is a trophy.
                const onPath = orbit ? {offset: m.at === 'end' ? 0 : Math.round((offset + after) / 2 * 100) / 100, trophy: m.at === 'end', zigi: m.at === 'end' && zigiAtEnd ? zigiNow : null, fit: zigiFit} : undefined;
                if (orbit && m.at === 'end') return <OrbitFinale key={m.id} milestone={m} just={just.has(`m:${m.id}`)} point={FINALE_POINT} zigi={onPath?.zigi ?? null} zigiSide={labelSides && labelSides.length ? (labelSides.at(-1) === 'left' ? 'right' : 'left') : 'right'}/>;
                return <PathChest key={m.id} milestone={m} just={just.has(`m:${m.id}`)} side={around >= 0 ? 'left' : 'right'} uid={uid} onPath={onPath}/>;
              })}
            </Fragment>;
          })}
        </ol>
      </section>;
    })}
    {zigiAtEnd && !endTrophy && <div className="path-end"><PathZigi state={zigiState} side="left" say={zigi === false || orbit ? undefined : zigi.say} alive={orbit}/></div>}
    {next && wantJump && (() => {
      // (Docked, it is the dock's own button and follows its theme; on the path it is the path's night bubble.)
      const button = <button ref={bubble} type="button" className={jumpDock ? 'path-dock-jump' : 'path-jump'} data-clear={(docked || jumpClear) || undefined} data-direction={nextAbove ? 'up' : 'down'} onClick={jump}><span>{jumpLabel}</span><span className="path-jump-arrow" aria-hidden="true">{nextAbove ? '↑' : '↓'}</span><span className="sr-only">: {next.label}</span></button>;
      return jumpDock ? createPortal(<div className="path-jump-docked">{button}</div>, jumpDock) : <div className="path-jump-track"><div className="path-jump-dock">{button}</div></div>;
    })()}
  </div>;
}
