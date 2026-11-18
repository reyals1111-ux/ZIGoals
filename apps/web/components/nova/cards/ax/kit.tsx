'use client';
import {useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject} from 'react';
import type {WidgetParams} from '../../../../lib/nova/stage/record';
import type {WidgetSize} from '../../../../lib/nova/store';
import {HoloFigure} from '../../holo/parts';
import '../../holo/holo-parts.css';
import '../cards.css';
import '../tiers.css';
import './ax.css';

/**
 * Session AS (ADR-042 Part 2): the answer instruments' shared parts. An answer widget is the answer drawn: one figure
 * that says it in words (`AxHead`), one instrument that shows it (a calendar, ranked bars, a scanner, …), then the foot
 * with its source and as-of (the kit's `CardFoot`) and a table for assistive technology (`HoloTable`).
 *
 * Motion (art direction §6, AM-2 E; O5): an instrument arrives once when its widget is made (transform, opacity and one
 * dash only) and keeps one quiet ornament alive while NOVA is watched. All of it hangs on the frame's own marks
 * (`.nova-frame[data-hud-motion=full|calm]`, `.nova-widget[data-made=fresh]`, `:not([data-off])`), so it stops when the
 * tab is hidden or the widget is off screen, and with Motion Off or reduced motion the instrument is simply there,
 * complete (cards.css stills everything inside `.nc-body`). Nothing follows the pointer.
 */
/** What an answer widget's body receives: its size, and the answer's own record and period where it was made by one. */
export type AxProps = {size: WidgetSize; params?: WidgetParams};
export function AxBody({kind, size, children, lay}: {kind: string; size: WidgetSize; children: ReactNode; lay?: 'row' | 'stack'}) {
  const body = useRef<HTMLDivElement>(null);
  useAxFit(body, children);
  return <div ref={body} className="nc-body ax-body" data-ax={kind} data-size={size} data-lay={lay}>{children}</div>;
}
/**
 * Session AS (Part 2, the fit check at 1440: a hero 280 px wide wraps its figure's words onto four or five lines, and the
 * instruments' height budgets (`100cqh` less a fixed allowance for the head and the foot) pushed the foot, with its
 * source and as-of, out of the panel). When the content is taller than the panel, the excess is handed to every
 * instrument's budget as `--ax-over` (ax.css and the families' sheets subtract it), measured again until it fits or the
 * instruments are at their smallest; what still does not fit marks the body `data-over`: first the optional parts (keys,
 * chips, notes) step aside, then the instrument (the panel shows the answer in its compact form; the table keeps every fact). Measured when the body renders and when its panel changes size: no timer, no animation.
 */
function useAxFit(ref: RefObject<HTMLDivElement | null>, content: ReactNode) {
  useLayoutEffect(() => {
    const el = ref.current, panel = el?.parentElement?.closest<HTMLElement>('.nova-widget-body') ?? el?.parentElement ?? null;
    if (!el || !panel || typeof ResizeObserver === 'undefined') return;
    const fit = () => { measure(); el.dataset.axFit = String(Number(el.dataset.axFit ?? 0) + 1); };
    const measure = () => {
      el.style.setProperty('--ax-over', '0px'); delete el.dataset.over;
      let over = 0;
      for (let i = 0; i < 4; i++) {
        const excess = el.scrollHeight - el.clientHeight;
        if (excess <= 1) return;
        over += excess; el.style.setProperty('--ax-over', `${over}px`);
      }
      // Still too tall: first the optional parts step aside; then the instrument itself, so the panel shows the answer's
      // figure, its words, source and as-of (its compact form) rather than a clipped drawing or a foot out of sight.
      if (el.scrollHeight - el.clientHeight > 1) el.dataset.over = 'parts';
      if (el.scrollHeight - el.clientHeight > 1) el.dataset.over = 'all';
    };
    fit();
    // The panel changes size (a new arrangement), or a part inside renders again on its own (a reading that arrives late):
    // either way the sizes it reports settle after one fit, so this runs once per change, not every frame.
    let width = panel.clientWidth, height = panel.clientHeight, need = el.scrollHeight;
    const watch = new ResizeObserver(() => { if (panel.clientWidth === width && panel.clientHeight === height && el.scrollHeight === need) return; width = panel.clientWidth; height = panel.clientHeight; fit(); need = el.scrollHeight; });
    watch.observe(panel);
    for (const part of el.children) watch.observe(part);
    return () => watch.disconnect();
  }, [ref, content]);
}
/** The answer in a figure and words: "2" · "days not done" · "Meditate · this month". */
export function AxHead({figure, unit, label, note, tone}: {figure: string; unit?: string; label: string; note?: ReactNode; tone?: 'clear' | 'watch'}) {
  return <div className="ax-head" data-tone={tone}>
    <p className="ax-head-figure"><HoloFigure text={figure} className="ax-head-num"/>{unit ? <span className="ax-head-unit">{unit}</span> : null}</p>
    <div className="ax-head-words"><p className="ax-head-label" title={label}>{label}</p>{note ? <p className="ax-head-note">{note}</p> : null}</div>
  </div>;
}
/** The key under an instrument: what each mark means, in words (never colour alone). */
export function AxKey({items}: {items: readonly (readonly [mark: string, words: string])[]}) {
  return <p className="ax-key" aria-hidden="true">{items.map(([mark, words]) => <span key={mark}><i data-mark={mark}/>{words}</span>)}</p>;
}
export const axIndex = (i: number): CSSProperties => ({'--ax-i': i} as CSSProperties);
