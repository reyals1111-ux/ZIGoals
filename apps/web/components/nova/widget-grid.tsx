'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Suspense, lazy, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ComponentType, type KeyboardEvent, type PointerEvent, type MouseEvent, type ReactNode, type RefObject} from 'react';
import {LoadBoundary} from '../load-boundary';
import {BENTO_SPAN, HOLO_ROWS, ROWS as ROWS_AK, MAX_LEAN, dropPlace, holoRowsFit, holoUnit, phoneColumn, placeOrbit, placeWords, rowsFit, swapPartner, visibleFor, wideSides, type HudLook, type Placed} from '../../lib/nova/layout';
import {settleDelay} from '../../lib/nova/orb';
import {WIDGET_SIZES, type NovaLayout, type NovaWidget, type WidgetSize} from '../../lib/nova/store';
import {widgetSpec} from '../../lib/nova/widgets/catalog';
import {NovaIcon} from './icons';
import {openWithMorph} from './holo/morph';
import {useOffscreenMark} from './holo/use-hud-motion';
import './widgets/widgets.css';

/** Each widget's body is its own chunk, loaded only while that widget is on the stage. */
type Body = ComponentType<{size: WidgetSize}>;
const BODIES: Record<string, Body> = {
  orbit: lazy(() => import('./widgets/orbit')), next: lazy(() => import('./widgets/next')), tasks: lazy(() => import('./widgets/tasks')), glance: lazy(() => import('./widgets/glance')),
  water: lazy(() => import('./widgets/water')), focus: lazy(() => import('./widgets/focus')), 'now-playing': lazy(() => import('./widgets/now-playing')),
  money: lazy(() => import('./widgets/money')), 'goal-pace': lazy(() => import('./widgets/goal-pace')), sleep: lazy(() => import('./widgets/sleep')),
  briefs: lazy(() => import('./widgets/briefs')), notes: lazy(() => import('./widgets/notes')), markets: lazy(() => import('./widgets/markets')),
  // Session AL Part 11 (lane L8): the holographic HUD's instruments (in both looks; drawn as neon instruments).
  'health-hud': lazy(() => import('./widgets/health-hud')), 'habits-hud': lazy(() => import('./widgets/habits-hud')), 'goals-hud': lazy(() => import('./widgets/goals-hud')),
  'wealth-hud': lazy(() => import('./widgets/wealth-hud')), 'agenda-clock': lazy(() => import('./widgets/agenda-clock')),
};
/** Session AL Part 11 (lane L8): the Holo look of earlier widgets where an instrument says more (holo/skins.tsx); the rest keep their bodies. */
const skin = (name: 'HoloWater' | 'HoloSleep' | 'HoloOrbit' | 'HoloNext' | 'HoloTasks' | 'HoloNotes'): Body => lazy(() => import('./holo/skins').then(m => ({default: m[name]})));
const HOLO_BODIES: Record<string, Body> = {water: skin('HoloWater'), sleep: skin('HoloSleep'), orbit: skin('HoloOrbit'), next: skin('HoloNext'), tasks: skin('HoloTasks'), notes: skin('HoloNotes')};
const SIZE_WORD: Record<WidgetSize, string> = {S: 'Small', M: 'Medium', L: 'Large'};
/**
 * Review fixes (lane L8d, NOVA_HUD_REVIEW B1): how a Holo panel fits its height. An instrument ("rows") drops whole rows
 * to fit (holo-parts.css container queries) and is never faded or cropped; a list ("scroll") scrolls inside its panel,
 * every row reachable with the pointer and the keyboard. Either way a panel is never cut by a fade.
 */
const SCROLL_PANELS = new Set(['tasks', 'next', 'notes', 'goal-pace', 'glance', 'briefs', 'money', 'focus', 'now-playing', 'markets']);

export type GridActions = {move: (id: string, to: number) => void; nudge: (id: string, by: -1 | 1) => void; resize: (id: string, size: WidgetSize) => void; remove: (id: string) => void;
  /** Session AL Part 11 (lane L8): a Holo panel's quick actions (the dashboard opens them in NOVA's sheet). */
  quick?: (id: string) => void;
  /** Review m9 (lane L8d): two panels trade places (Left/Right on a grip: the other column), and where a moved panel is now. */
  swap?: (a: string, b: string) => void; announce?: (words: string) => void};
/** Session AK P3 (ND-1): the stage area's own height (its content box), read before paint and on every resize. */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
function useStageHeight(ref: RefObject<HTMLElement | null>): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useIsoLayoutEffect(() => {
    const area = ref.current?.parentElement;
    if (!area) return;
    const read = () => { const css = getComputedStyle(area); setHeight(area.clientHeight - (parseFloat(css.paddingTop) || 0) - (parseFloat(css.paddingBottom) || 0)); };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(read); observer.observe(area);
    return () => observer.disconnect();
  }, [ref]);
  return height;
}

/**
 * Session AK (owner follow-up 2 N2, follow-up 3 N12; lane NA): the widgets floating on the orbit rings around the star.
 * Orbit: two columns beside the star whose panels lean in along a circle (lib/nova/layout.ts), the rest on the outer band
 * under it. Bento: a dense grid with the star as its hero tile. Focus: the star and the first three. Minimal: the star
 * alone. While arranging, each panel has Move earlier / Move later, its size and Remove as buttons, and a grip that
 * drags it (pointer) or moves it with the arrow keys (keyboard): the same change three ways.
 */
export function WidgetGrid({layout, widgets, stage, editing, opening, actions, look = 'classic', phone = false}: {layout: NovaLayout; widgets: NovaWidget[]; stage: ReactNode; editing: boolean; opening: boolean; actions: GridActions; look?: HudLook; phone?: boolean}) {
  const shown = phone ? phoneColumn(layout, widgets) : visibleFor(layout, widgets), order = shown.map(w => w.id), holo = look === 'holo';
  const [drag, setDrag] = useState<{id: string; target: string | null; dx: number; dy: number} | null>(null);
  const start = useRef<{x: number; y: number}>({x: 0, y: 0}), box = useRef<HTMLDivElement>(null), stageHeight = useStageHeight(box);
  // Review fixes (lane L8d, B1, M2): the Holo look's own rows — S one unit, M two, L four — as many as the stage holds, the
  // unit grown to fill its height; AK's cards keep their rows and caps.
  const fit = holo ? holoRowsFit(stageHeight) : rowsFit(stageHeight), unit = holo ? holoUnit(stageHeight, fit) : 0;
  const placed = layout === 'orbit' && !phone ? placeOrbit(shown, fit, holo ? HOLO_ROWS : ROWS_AK) : [];
  // Review m9: after a move from the keyboard, the status line says where the panel is now ("2 of 9, right column").
  const moved = useRef<string | null>(null), announce = actions.announce;
  useEffect(() => {
    const id = moved.current;
    if (!id || !announce) return;
    moved.current = null;
    const words = placed.length ? placeWords(placed, id) : `${order.indexOf(id) + 1} of ${order.length}`;
    if (words) announce(`${widgetSpec(id)?.title ?? 'The widget'} is now ${words}.`);
  }, [order.join(' '), announce]); // eslint-disable-line react-hooks/exhaustive-deps
  const grip = (w: NovaWidget) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); start.current = {x: e.clientX, y: e.clientY}; setDrag({id: w.id, target: null, dx: 0, dy: 0}); },
    onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
      if (drag?.id !== w.id) return;
      const under = document.elementsFromPoint(e.clientX, e.clientY).map(el => el.closest<HTMLElement>('[data-widget]')).find(el => el && el.dataset.widget !== w.id);
      setDrag({id: w.id, target: under?.dataset.widget ?? null, dx: e.clientX - start.current.x, dy: e.clientY - start.current.y});
    },
    onPointerUp: () => { if (drag?.id === w.id) { const to = dropPlace(order, w.id, drag.target); if (to >= 0 && drag.target) actions.move(w.id, to); } setDrag(null); },
    onPointerCancel: () => setDrag(null),
    // Review m9 (lane L8d): spatial keys. Up and Down move one place earlier or later; on the orbit, Left and Right trade
    // places with the panel level with it in the other column (elsewhere they move one place, as before).
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      const across = e.key === 'ArrowLeft' || e.key === 'ArrowRight', partner = across && actions.swap ? swapPartner(placed, w.id) : null;
      const sideOf = placed.find(p => p.id === w.id)?.side;
      if (partner && actions.swap && ((e.key === 'ArrowLeft' && sideOf === 'right') || (e.key === 'ArrowRight' && sideOf === 'left'))) { e.preventDefault(); moved.current = w.id; actions.swap(w.id, partner); return; }
      if (across && partner) { e.preventDefault(); announce?.(`${widgetSpec(w.id)?.title ?? 'The widget'} is already in the ${sideOf} column.`); return; }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); moved.current = w.id; actions.nudge(w.id, -1); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); moved.current = w.id; actions.nudge(w.id, 1); }
    },
  });
  const frame = (w: NovaWidget, index: number, style: CSSProperties, place?: Placed) => <WidgetFrame key={w.id} widget={w} index={index} count={shown.length} style={style} side={place?.side}
    editing={editing} opening={opening} dragging={drag?.id === w.id ? drag : null} dropTarget={drag?.target === w.id} grip={grip(w)} actions={actions} holo={holo}/>;
  const unitStyle = holo ? {'--holo-u': `${unit}px`} as CSSProperties : undefined, fitMark = (kind: 'orbit' | 'bento' | 'focus') => holo ? kind : undefined;
  // Session AL Part 11 (lane L8): a phone in Holo shows the star, then the same panels in one column (the layout's own set).
  if (phone) return <div ref={box} className="holo-phone-column">{stage}{shown.map((w, i) => frame(w, i, {}))}</div>;
  if (layout === 'orbit') {
    // Session AK P3 (ND-1, ND-2, ND-16): the star owns the stage's whole height (its middle is the window's optical middle);
    // the side columns hold what fits beside it, each centred on the star and sized to its content, and lean in by their
    // inner edge only (the outer edges stay in line); what does not fit rests on the outer band, below the fold.
    const band = placed.filter(p => p.side === 'band');
    const side = (which: 'left' | 'right') => placed.filter(p => p.side === which).map(p => frame(p, p.order, {'--inset': `${MAX_LEAN - p.lean}px`} as CSSProperties, p));
    return <div ref={box} className="nova-orbit" style={unitStyle} data-holo-fit={fitMark('orbit')}>
      <div className="nova-orbit-main" data-wide={holo ? wideSides(placed) : undefined}>
        <div className="nova-orbit-centre">{holo && <span className="holo-floor" aria-hidden="true"/>}{stage}</div>
        <div className="nova-orbit-side" data-side="left">{side('left')}</div>
        <div className="nova-orbit-side" data-side="right">{side('right')}</div>
      </div>
      {band.length > 0 && <div className="nova-orbit-band" role="group" aria-label="More on your orbit">
        <p className="nova-eyebrow nova-orbit-band-title" aria-hidden="true">More on your orbit</p>
        <div className="nova-orbit-band-grid">{band.map(p => frame(p, p.order, {}, p))}</div>
      </div>}
    </div>;
  }
  if (layout === 'bento') return <div ref={box} className="nova-bento" style={unitStyle} data-holo-fit={fitMark('bento')}><div className="nova-bento-hero">{stage}</div>{shown.map((w, i) => frame(w, i, {'--bc': BENTO_SPAN[w.size].cols, '--br': BENTO_SPAN[w.size].rows} as CSSProperties))}</div>;
  if (layout === 'focus') return <div ref={box} className="nova-focus-layout" style={unitStyle} data-holo-fit={fitMark('focus')}><div className="nova-focus-hero">{stage}</div><div className="nova-focus-row">{shown.map((w, i) => frame(w, i, {}))}</div></div>;
  return <div ref={box} className="nova-minimal">{stage}</div>;
}

function WidgetFrame({widget, index, count, style, side, editing, opening, dragging, dropTarget, grip, actions, holo}: {
  widget: NovaWidget; index: number; count: number; style: CSSProperties; side?: Placed['side']; editing: boolean; opening: boolean;
  dragging: {dx: number; dy: number} | null; dropTarget: boolean; grip: Record<string, unknown>; actions: GridActions; holo: boolean;
}) {
  const spec = widgetSpec(widget.id), id = useId(), Body = (holo ? HOLO_BODIES[widget.id] : undefined) ?? BODIES[widget.id], router = useRouter();
  const panel = useRef<HTMLElement>(null);
  useOffscreenMark(panel, holo);
  // Session AK P3 (ND-2): a card ends where its content ends, up to its size's height; content past it fades out softly
  // (the full view is one tap away, on the header's link).
  const body = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null), [cut, setCut] = useState(false);
  useEffect(() => {
    const outer = body.current, content = inner.current;
    if (!outer || !content || typeof ResizeObserver === 'undefined') return;
    const read = () => setCut(content.scrollHeight > outer.clientHeight + 2);
    read();
    const observer = new ResizeObserver(read); observer.observe(outer); observer.observe(content);
    return () => observer.disconnect();
  }, []);
  if (!spec || !Body) return null;
  const fitKind = holo ? (SCROLL_PANELS.has(widget.id) ? 'scroll' : 'rows') : undefined;
  // Review M11 (lane L8d): a small Holo panel's page link is an arrow-only 44 px target (its name stays for assistive
  // technology and as its tooltip), so the header never wraps over the panel's body.
  const arrowOnly = holo && widget.size === 'S';
  const css = {...style, '--settle': `${opening ? settleDelay(index, count) : 0}ms`, ...(holo ? {'--sheen-delay': `${(index * 2.3) % 14}s`} : {}), ...(dragging ? {'--dx': `${dragging.dx}px`, '--dy': `${dragging.dy}px`} : {})} as CSSProperties;
  // Session AL Part 11 (lane L8): the widget → page morph. A plain click opens the page with the panel growing into it
  // (Full) or fading (Calm); a modified click (a new tab) and Motion Off keep the link's own behaviour.
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); openWithMorph(panel.current, spec.href, href => router.push(href));
  };
  // Tapping the instrument itself opens the quick actions too (the header's button is the keyboard's way); a tap on a
  // link, button or field inside it does what that control does.
  const tap = holo && !editing && actions.quick ? (e: MouseEvent<HTMLDivElement>) => { if (!(e.target as Element).closest('a, button, input, textarea, select, label, summary')) actions.quick!(widget.id); } : undefined;
  return <article ref={panel} className="nova-widget" data-widget={widget.id} data-size={widget.size} data-pillar={spec.pillar} data-side={side} data-holo={holo ? '' : undefined} data-fit={fitKind} data-dragging={dragging ? '' : undefined} data-drop={dropTarget ? '' : undefined} data-cut={cut && !editing ? '' : undefined} style={css} aria-labelledby={`${id}-t`}>
    <span className="nova-widget-planet" aria-hidden="true"/>
    {holo && <><span className="holo-brackets" aria-hidden="true"/><span className="holo-ruler" aria-hidden="true"/><span className="holo-sheen" aria-hidden="true"/></>}
    <header className="nova-widget-head">
      <h3 id={`${id}-t`}>{spec.title}</h3>
      {editing ? <button type="button" className="nova-grip" aria-label={`Move ${spec.title}: drag, or use the arrow keys`} {...grip}><NovaIcon name="grip" size={18}/></button>
        : <>{holo && actions.quick && <button type="button" className="holo-act" aria-haspopup="dialog" aria-label={`Quick actions: ${spec.title}`} title="Quick actions" onClick={() => actions.quick!(widget.id)}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg></button>}
          {arrowOnly ? <Link className="nova-widget-open nova-widget-open-arrow" href={spec.href} prefetch={false} onClick={open} aria-label={spec.open} title={spec.open}><span aria-hidden="true">→</span></Link>
            : <Link className="nova-widget-open" href={spec.href} prefetch={false} onClick={open}>{spec.open}<span aria-hidden="true"> →</span></Link>}</>}
    </header>
    <div ref={body} className={`nova-widget-body${tap ? ' holo-instrument' : ''}`} onClick={tap}><div ref={inner} className="nova-widget-inner"><LoadBoundary quiet><Suspense fallback={<p className="nova-reading">Reading…</p>}><Body size={widget.size}/></Suspense></LoadBoundary></div></div>
    {editing && <div className="nova-widget-edit" role="group" aria-label={`Arrange ${spec.title}`}>
      <button type="button" className="nova-mini-btn" onClick={() => actions.nudge(widget.id, -1)} disabled={index === 0} aria-label={`Move ${spec.title} earlier`}><NovaIcon name="up" size={18}/></button>
      <button type="button" className="nova-mini-btn" onClick={() => actions.nudge(widget.id, 1)} disabled={index === count - 1} aria-label={`Move ${spec.title} later`}><NovaIcon name="down" size={18}/></button>
      <span className="nova-sizes" role="group" aria-label={`Size of ${spec.title}`}>{WIDGET_SIZES.map(size => <button key={size} type="button" aria-pressed={widget.size === size} className="nova-size" onClick={() => actions.resize(widget.id, size)} aria-label={SIZE_WORD[size]}>{size}</button>)}</span>
      <button type="button" className="nova-mini-btn nova-remove" onClick={() => actions.remove(widget.id)} aria-label={`Remove ${spec.title} from NOVA`}><NovaIcon name="close" size={18}/></button>
    </div>}
  </article>;
}
