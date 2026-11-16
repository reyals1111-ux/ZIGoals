'use client';
import type {CSSProperties, ReactNode} from 'react';
import {Gauge, HeartTrace} from '../cards/kit';

/**
 * Session AM-2 (step 3, round 4): the instruments of the thirty widgets that show what the pages gained, each sized to
 * its panel (cards/connect-cards.css; the art direction's "one instrument per kind"). They are built on the kit
 * (cards/kit.tsx: the ring, the heartbeat), so a ring here has the kit's weight; what the kit does not hold (a lit 2 × 2
 * grid, an hour strip, a dot meter, ring cards) is drawn here in the same language. Everything in this file is
 * decoration over words beside it or a read-out with its own words: a widget's table for assistive technology keeps
 * every figure.
 */

/**
 * The dial of a card (round 7: a clean gradient arc on a dark tube, refs 12 and 27): one ring as large as the panel allows (the sheet sets its diameter in steps from the panel's
 * height), the figure inside it with a word under it. `share` null is an unlit ring (unknown, never zero).
 */
export function NxDial({share, figure, caption, tone, ticks, start, spin}: {share: number | null; figure: string; caption?: string | null; tone?: 'over'; ticks?: number; start?: number; spin?: boolean}) {
  return <Gauge share={share} size={100} thick={10} bezel ticks={ticks} start={start} spin={spin} tone={tone} decor className="nx-dial">
    <span className="nx-dial-figure" data-len={figure.length > 4 ? 'xl' : figure.length > 2 ? 'l' : undefined}><b>{figure}</b>{caption ? <small>{caption}</small> : null}</span>
  </Gauge>;
}

/** The words beside a dial: what it is (a tracked label), the figure in words, and one note. `pulse`: Health's heartbeat line under them (ornament). */
export function NxHead({label, title, note, tone, pulse, children}: {label: string; title: ReactNode; note?: ReactNode; tone?: 'watch'; pulse?: boolean; children?: ReactNode}) {
  return <div className="nx-head">
    <p className="nx-cap">{label}</p>
    <p className="nx-title">{title}</p>
    {note ? <p className="nx-note" data-tone={tone}>{note}</p> : null}
    {children}
    {pulse && <HeartTrace className="nx-pulse"/>}
  </div>;
}

/** Four lit boxes, two by two (the priority matrix): a count, the box's name, and the first task in it. The busiest box is the brightest. */
export function NxMatrix({boxes, label}: {boxes: readonly {key: string; count: number; title: string; task?: string | null; more?: number; lead?: boolean}[]; label: string}) {
  const most = Math.max(1, ...boxes.map(b => b.count));
  return <ul className="nx-matrix" aria-label={label}>{boxes.map((b, i) => <li key={b.key} className="nc-rise" data-lead={b.lead || undefined} data-none={b.count === 0 || undefined} style={{'--nx-lit': b.count / most, '--nc-i': i} as CSSProperties}>
    <b>{b.count}</b>
    <span className="nx-matrix-title">{b.title}</span>
    <span className="nx-matrix-task">{b.count === 0 ? 'None' : b.task ? `${b.task}${b.more ? ` · +${b.more}` : ''}` : ''}</span>
  </li>)}</ul>;
}

/**
 * A day as a strip of hours: one column an hour, one block for each item at that hour (up to `cap`; more is said in the
 * top block), the hour of now marked, and a label under every third hour, each whole. Decoration: the widget's table and
 * its words name every item.
 */
export function NxHours({hours, now, cap = 4}: {hours: readonly {hour: number; count: number | null}[]; now?: number | null; cap?: number}) {
  // Round 6: a lattice. Every hour is a column of `cap` cells, lit from the bottom for what sits in it (the top one hatched when there is more).
  return <div className="nx-hours" aria-hidden="true" style={{'--nx-n': hours.length, '--nx-cap': cap} as CSSProperties}>
    <div className="nx-hours-plot">{hours.map((h, i) => { const n = h.count ?? 0; return <span key={h.hour} className="nx-hour" data-now={now === i || undefined} data-empty={n === 0 || undefined}>
      {Array.from({length: cap}, (_, k) => k < Math.min(n, cap) ? <i key={k} className="nc-rise" data-on="" data-more={k === cap - 1 && n > cap ? '' : undefined} style={{'--nc-i': Math.min(i, 8)} as CSSProperties}/> : <i key={k}/>)}
    </span>; })}</div>
    <div className="nx-hours-axis">{hours.map((h, i) => h.hour % 3 === 0 && i <= hours.length - 2 ? <span key={h.hour} style={{gridColumn: `${i + 1} / span ${Math.min(3, hours.length - i)}`}}>{String(h.hour).padStart(2, '0')}</span> : null)}</div>
  </div>;
}

/** A dot meter: `lit` of `of` dots lit (a day that counts at three of its dots). Decoration beside the rule in words. */
export function NxDots({lit, of}: {lit: number; of: number}) {
  return <span className="nx-dots" aria-hidden="true" style={{'--nx-cols': of > 6 ? 4 : 3} as CSSProperties}>{Array.from({length: of}, (_, i) => <i key={i} data-on={i < lit || undefined}/>)}</span>;
}

/** One instrument with its read-out beside it (the day's two rules): the drawing, a tracked label, the value, one line under it. */
export function NxInstrument({art, label, value, sub}: {art: ReactNode; label: string; value: string; sub?: string | null}) {
  return <div className="nx-inst">
    {art}
    <p className="nx-readout"><span className="nx-readout-label">{label}</span><span className="nx-readout-value">{value}</span>{sub ? <span className="nx-readout-sub">{sub}</span> : null}</p>
  </div>;
}

/** Ring cards (savings challenges): a ring with its share inside, a name that stays whole, what it is and where it stands. */
export function NxRingCards({items, label}: {items: readonly {key: string; share: number | null; figure: string; name: string; kind: string; words: string}[]; label: string}) {
  return <ul className="nx-ringcards" aria-label={label}>{items.map((it, i) => <li key={it.key} className="nx-ringcard nc-rise" style={{'--nc-i': i} as CSSProperties}>
    <Gauge share={it.share} size={100} thick={10} bezel decor className="nx-ring"><span className="nx-dial-figure" data-len={it.figure.length > 2 ? 'l' : undefined}><b>{it.figure}</b></span></Gauge>
    <span className="nx-ringcard-words"><b>{it.name}</b><span className="nx-ringcard-kind">{it.kind}</span><span className="nx-ringcard-sub">{it.words}</span></span>
    <NxSegs share={it.share} n={20}/>
  </li>)}</ul>;
}

/**
 * Round 6: a segmented meter (the references' status rows): `n` cells, lit to the share, the leading cell white-hot.
 * `share` null is an unlit dashed track (unknown, never zero). Decoration: the words beside it carry the figure.
 */
export function NxSegs({share, n = 16, className = ''}: {share: number | null; n?: number; className?: string}) {
  const lit = share === null ? 0 : Math.max(share > 0 ? 1 : 0, Math.round(Math.min(1, Math.max(0, share)) * n));
  return <span className={`nx-segs ${className}`.trim()} aria-hidden="true" data-unknown={share === null || undefined} style={{'--nx-n': n} as CSSProperties}>{Array.from({length: n}, (_, i) => <i key={i} data-on={i < lit || undefined} data-lead={i === lit - 1 || undefined}/>)}</span>;
}

/** A lit state mark (a status row's lamp): 'on' is a ring with a lit core (waiting, planned), 'done' a lit disc with a tick (fired, taken), 'off' an unlit dashed ring. The row's words say the state. */
export function NxMark({state}: {state: 'on' | 'done' | 'off'}) {
  return <svg className="nx-mark" data-state={state} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle className="nx-mark-ring" cx="12" cy="12" r="9"/>
    {state === 'done' ? <path className="nx-mark-glyph" d="M7.6 12.4l3 3 5.8-6.6"/> : state === 'on' ? <circle className="nx-mark-core" cx="12" cy="12" r="3.6"/> : <path className="nx-mark-glyph" d="M8.5 12h7"/>}
  </svg>;
}

/** A row of lamps, one for each item in its state (up to `cap`): a tally that reads at a glance. Decoration beside the count in words. */
export function NxPips({items, cap = 10}: {items: readonly ('on' | 'done' | 'off')[]; cap?: number}) {
  return <span className="nx-pips" aria-hidden="true">{items.slice(0, cap).map((state, i) => <NxMark key={i} state={state}/>)}</span>;
}

/** A scale: a segmented meter over a named range, with its marks under it ("0", "30", "60", "90 days"). Decoration: the figure is in the words. */
export function NxScale({share, marks, n = 30}: {share: number | null; marks: readonly string[]; n?: number}) {
  return <div className="nx-scale" aria-hidden="true"><NxSegs share={share} n={n}/><div className="nx-scale-marks">{marks.map(m => <span key={m}>{m}</span>)}</div></div>;
}

/** The unlit plot of a chart that has no figures yet (prices that are not in): a grid, a dashed trace and an open end. A fixed drawing: no value is read. */
export function NxGhostPlot() {
  return <svg className="nx-ghostplot" viewBox="0 0 320 80" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path className="nx-ghostplot-grid" d="M0 20H320M0 40H320M0 60H320M40 0V80M80 0V80M120 0V80M160 0V80M200 0V80M240 0V80M280 0V80"/>
    <path className="nx-ghostplot-glow" d="M4 58L28 50 44 56 66 38 84 46 104 30 122 42 146 24 166 36 186 20 208 34 230 16 252 30 276 14 300 24"/>
    <path className="nx-ghostplot-line" d="M4 58L28 50 44 56 66 38 84 46 104 30 122 42 146 24 166 36 186 20 208 34 230 16 252 30 276 14 300 24"/>
    <path className="nx-ghostplot-base" d="M0 79.5H320"/>
  </svg>;
}
