'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ComponentType, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject} from 'react';
import {LoadBoundary} from '../load-boundary';
import {BENTO_SPAN, MAX_LEAN, dropPlace, placeOrbit, rowsFit, visibleFor, type Placed} from '../../lib/nova/layout';
import {settleDelay} from '../../lib/nova/orb';
import {WIDGET_SIZES, type NovaLayout, type NovaWidget, type WidgetSize} from '../../lib/nova/store';
import {widgetSpec} from '../../lib/nova/widgets/catalog';
import {NovaIcon} from './icons';
import './widgets/widgets.css';

/** Each widget's body is its own chunk, loaded only while that widget is on the stage. */
type Body = ComponentType<{size: WidgetSize}>;
const BODIES: Record<string, Body> = {
  orbit: lazy(() => import('./widgets/orbit')), next: lazy(() => import('./widgets/next')), tasks: lazy(() => import('./widgets/tasks')), glance: lazy(() => import('./widgets/glance')),
  water: lazy(() => import('./widgets/water')), focus: lazy(() => import('./widgets/focus')), 'now-playing': lazy(() => import('./widgets/now-playing')),
  money: lazy(() => import('./widgets/money')), 'goal-pace': lazy(() => import('./widgets/goal-pace')), sleep: lazy(() => import('./widgets/sleep')),
  briefs: lazy(() => import('./widgets/briefs')), notes: lazy(() => import('./widgets/notes')), markets: lazy(() => import('./widgets/markets')),
};
const SIZE_WORD: Record<WidgetSize, string> = {S: 'Small', M: 'Medium', L: 'Large'};

export type GridActions = {move: (id: string, to: number) => void; nudge: (id: string, by: -1 | 1) => void; resize: (id: string, size: WidgetSize) => void; remove: (id: string) => void};
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
export function WidgetGrid({layout, widgets, stage, editing, opening, actions}: {layout: NovaLayout; widgets: NovaWidget[]; stage: ReactNode; editing: boolean; opening: boolean; actions: GridActions}) {
  const shown = visibleFor(layout, widgets), order = shown.map(w => w.id);
  const [drag, setDrag] = useState<{id: string; target: string | null; dx: number; dy: number} | null>(null);
  const start = useRef<{x: number; y: number}>({x: 0, y: 0}), box = useRef<HTMLDivElement>(null), stageHeight = useStageHeight(box);
  const grip = (w: NovaWidget) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); start.current = {x: e.clientX, y: e.clientY}; setDrag({id: w.id, target: null, dx: 0, dy: 0}); },
    onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
      if (drag?.id !== w.id) return;
      const under = document.elementsFromPoint(e.clientX, e.clientY).map(el => el.closest<HTMLElement>('[data-widget]')).find(el => el && el.dataset.widget !== w.id);
      setDrag({id: w.id, target: under?.dataset.widget ?? null, dx: e.clientX - start.current.x, dy: e.clientY - start.current.y});
    },
    onPointerUp: () => { if (drag?.id === w.id) { const to = dropPlace(order, w.id, drag.target); if (to >= 0 && drag.target) actions.move(w.id, to); } setDrag(null); },
    onPointerCancel: () => setDrag(null),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); actions.nudge(w.id, -1); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); actions.nudge(w.id, 1); }
    },
  });
  const frame = (w: NovaWidget, index: number, style: CSSProperties, place?: Placed) => <WidgetFrame key={w.id} widget={w} index={index} count={shown.length} style={style} side={place?.side}
    editing={editing} opening={opening} dragging={drag?.id === w.id ? drag : null} dropTarget={drag?.target === w.id} grip={grip(w)} actions={actions}/>;
  if (layout === 'orbit') {
    // Session AK P3 (ND-1, ND-2, ND-16): the star owns the stage's whole height (its middle is the window's optical middle);
    // the side columns hold what fits beside it, each centred on the star and sized to its content, and lean in by their
    // inner edge only (the outer edges stay in line); what does not fit rests on the outer band, below the fold.
    const placed = placeOrbit(shown, rowsFit(stageHeight)), band = placed.filter(p => p.side === 'band');
    const side = (which: 'left' | 'right') => placed.filter(p => p.side === which).map(p => frame(p, p.order, {'--inset': `${MAX_LEAN - p.lean}px`} as CSSProperties, p));
    return <div ref={box} className="nova-orbit">
      <div className="nova-orbit-main">
        <div className="nova-orbit-centre">{stage}</div>
        <div className="nova-orbit-side" data-side="left">{side('left')}</div>
        <div className="nova-orbit-side" data-side="right">{side('right')}</div>
      </div>
      {band.length > 0 && <div className="nova-orbit-band" role="group" aria-label="More on your orbit">
        <p className="nova-eyebrow nova-orbit-band-title" aria-hidden="true">More on your orbit</p>
        <div className="nova-orbit-band-grid">{band.map(p => frame(p, p.order, {}, p))}</div>
      </div>}
    </div>;
  }
  if (layout === 'bento') return <div ref={box} className="nova-bento"><div className="nova-bento-hero">{stage}</div>{shown.map((w, i) => frame(w, i, {'--bc': BENTO_SPAN[w.size].cols, '--br': BENTO_SPAN[w.size].rows} as CSSProperties))}</div>;
  if (layout === 'focus') return <div ref={box} className="nova-focus-layout"><div className="nova-focus-hero">{stage}</div><div className="nova-focus-row">{shown.map((w, i) => frame(w, i, {}))}</div></div>;
  return <div ref={box} className="nova-minimal">{stage}</div>;
}

function WidgetFrame({widget, index, count, style, side, editing, opening, dragging, dropTarget, grip, actions}: {
  widget: NovaWidget; index: number; count: number; style: CSSProperties; side?: Placed['side']; editing: boolean; opening: boolean;
  dragging: {dx: number; dy: number} | null; dropTarget: boolean; grip: Record<string, unknown>; actions: GridActions;
}) {
  const spec = widgetSpec(widget.id), id = useId(), Body = BODIES[widget.id];
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
  const css = {...style, '--settle': `${opening ? settleDelay(index, count) : 0}ms`, ...(dragging ? {'--dx': `${dragging.dx}px`, '--dy': `${dragging.dy}px`} : {})} as CSSProperties;
  return <article className="nova-widget" data-widget={widget.id} data-size={widget.size} data-pillar={spec.pillar} data-side={side} data-dragging={dragging ? '' : undefined} data-drop={dropTarget ? '' : undefined} data-cut={cut && !editing ? '' : undefined} style={css} aria-labelledby={`${id}-t`}>
    <span className="nova-widget-planet" aria-hidden="true"/>
    <header className="nova-widget-head">
      <h3 id={`${id}-t`}>{spec.title}</h3>
      {editing ? <button type="button" className="nova-grip" aria-label={`Move ${spec.title}: drag, or use the arrow keys`} {...grip}><NovaIcon name="grip" size={18}/></button>
        : <Link className="nova-widget-open" href={spec.href} prefetch={false}>{spec.open}<span aria-hidden="true"> →</span></Link>}
    </header>
    <div ref={body} className="nova-widget-body"><div ref={inner} className="nova-widget-inner"><LoadBoundary quiet><Suspense fallback={<p className="nova-reading">Reading…</p>}><Body size={widget.size}/></Suspense></LoadBoundary></div></div>
    {editing && <div className="nova-widget-edit" role="group" aria-label={`Arrange ${spec.title}`}>
      <button type="button" className="nova-mini-btn" onClick={() => actions.nudge(widget.id, -1)} disabled={index === 0} aria-label={`Move ${spec.title} earlier`}><NovaIcon name="up" size={18}/></button>
      <button type="button" className="nova-mini-btn" onClick={() => actions.nudge(widget.id, 1)} disabled={index === count - 1} aria-label={`Move ${spec.title} later`}><NovaIcon name="down" size={18}/></button>
      <span className="nova-sizes" role="group" aria-label={`Size of ${spec.title}`}>{WIDGET_SIZES.map(size => <button key={size} type="button" aria-pressed={widget.size === size} className="nova-size" onClick={() => actions.resize(widget.id, size)} aria-label={SIZE_WORD[size]}>{size}</button>)}</span>
      <button type="button" className="nova-mini-btn nova-remove" onClick={() => actions.remove(widget.id)} aria-label={`Remove ${spec.title} from NOVA`}><NovaIcon name="close" size={18}/></button>
    </div>}
  </article>;
}
