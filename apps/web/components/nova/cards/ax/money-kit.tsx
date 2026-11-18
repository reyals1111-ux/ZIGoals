'use client';
import type {CSSProperties, ReactNode} from 'react';
import {Fact} from '../kit';
import {AxHead} from './kit';
import './money.css';

/**
 * Session AS (ADR-042 Part 2, Wealth and Goals): the parts the instruments of this group share. Every class of this group
 * starts with `axm-` and lives in money.css. An instrument is decoration over words (`aria-hidden`): the widget's table
 * states every figure it draws. It takes its height from the panel (`--axm-h`, container units of `holo-body`), so in a
 * short panel it shrinks or its list drops whole rows; nothing is cut.
 */
export type AxmRows = readonly (readonly [string, string])[];
/** The answer in a figure and words (the kit's `AxHead`); a long figure (money with its cents) is set smaller so its words keep their room. */
export function AxmHead(props: Parameters<typeof AxHead>[0]) {
  return <div className="axm-head" data-long={props.figure.length > 8 ? '' : undefined}><AxHead {...props}/></div>;
}
/** An instrument beside (wide panel) or above (narrow panel) its list. `rows`: how many list rows stand under it, so the drawing leaves them room. */
export function AxmSplit({rows = 0, stack = false, children}: {rows?: number; /** Always one above the other (an instrument that takes the whole width). */ stack?: boolean; children: ReactNode}) {
  return <div className="axm-split" data-lay={stack ? 'stack' : undefined} style={{'--axm-rows': rows} as CSSProperties}>{children}</div>;
}
/** The list beside a drawing: a numbered node as on the drawing, the name, its figure and one more line of words. Whole rows only. */
export type AxmItem = {key: string; n?: number | string; name: string; value: string; sub?: string; tone?: 'watch'; unlit?: boolean};
export function AxmLegend({items, more}: {items: readonly AxmItem[]; more?: string | null}) {
  return <ol className="axm-legend" aria-hidden="true">
    {items.map((item, i) => <li key={item.key} className="axm-legend-row" data-tone={item.tone} data-unlit={item.unlit ? '' : undefined} style={{'--ax-i': i} as CSSProperties}>
      <i className="axm-legend-n">{item.n ?? i + 1}</i>
      <span className="axm-legend-name" title={item.name}>{item.name}</span>
      <span className="axm-legend-value">{item.value}</span>
      {item.sub ? <span className="axm-legend-sub">{item.sub}</span> : null}
    </li>)}
    {more ? <li className="axm-legend-more">{more}</li> : null}
  </ol>;
}
/** What each mark means, in words (never colour alone). */
export function AxmKey({items}: {items: readonly (readonly [mark: 'now' | 'before' | 'none' | 'today' | 'in' | 'out' | 'due', words: string])[]}) {
  return <p className="axm-key" aria-hidden="true">{items.map(([mark, words]) => <span key={mark}><i data-mark={mark}/>{words}</span>)}</p>;
}
/** One or two facts under an instrument at Large (hidden in a short panel: cards/tiers.css `[data-extra]`). */
export function AxmFacts({rows}: {rows: AxmRows}) {
  return rows.length ? <div className="nc-facts axm-facts" data-extra="">{rows.map(([label, value]) => <Fact key={label} label={label} value={value}/>)}</div> : null;
}
/** A style value as a CSS custom property. */
export const axmVar = (name: string, value: string | number): CSSProperties => ({[name]: value} as CSSProperties);
