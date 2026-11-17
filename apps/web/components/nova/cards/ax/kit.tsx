'use client';
import type {CSSProperties, ReactNode} from 'react';
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
  return <div className="nc-body ax-body" data-ax={kind} data-size={size} data-lay={lay}>{children}</div>;
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
