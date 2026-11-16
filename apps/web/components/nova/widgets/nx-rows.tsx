'use client';
import type {CSSProperties} from 'react';
import {moreWords} from '../../../lib/nova/cards/whole-rows';
import {WholeRows} from '../cards/whole-rows';
import {NxMark, NxSegs} from './nx-parts';

/**
 * Session AM-2 (step 3, round 2): the list of the round-2 widgets — a lit node, a name, a figure and one line of
 * detail per row (cards/connect-cards.css `nx-rows`) — inside the "whole rows" wrapper (cards/whole-rows.tsx): the rows
 * that fit their panel are shown whole, and under them one line says how many more there are and where ("+3 more on the
 * Wealth page"). A row is never cut by the panel's edge; the widget's table for assistive technology keeps every row.
 * The box is a limit of its own (`limit`): in a column of a two-column card it is as tall as the column leaves, so its
 * rows never run past the column and over the foot (cards/connect-cards.css `.nx-wr`).
 */
export type NxRow = {key: string; name: string; value?: string | null; sub?: string | null; /** A direction, said in the row's words too (never colour alone). */ tone?: 'up' | 'down';
  /** The value is a state in words, drawn as a small key: 'on' (waiting, planned), 'done' (fired, taken), 'off' (switched off, skipped). */ chip?: 'on' | 'done' | 'off';
  /** Round 6: a meter under the row (a share; null is an unlit track). Decoration: the row's words carry it. */ meter?: number | null};
export function NxRows({rows, label, where, extra = 0, min = 1, rail}: {rows: readonly NxRow[]; label: string;
  /** Round 6: the rows hang on one lit rail (a timeline: this evening, then someday). */ rail?: boolean;
  /** The page that holds the rest ("the Wealth page"). */ where?: string;
  /** Rows the widget holds beyond the ones given here: they count in "+N more". */ extra?: number; min?: number}) {
  return <WholeRows className={rail ? 'nx-rows nx-rail' : 'nx-rows'} wrapClassName="nx-wr" limit aria-label={label} extra={Math.max(0, extra)} min={min} more={(hidden, shown) => moreWords(hidden, {shown, ...(where ? {where} : {})})}>
    {rows.map((r, i) => <li key={r.key} className="nx-row nc-rise" style={{'--nc-i': Math.min(i, 6)} as CSSProperties}>
      {r.chip ? <NxMark state={r.chip}/> : <i className="nx-row-node" data-tone={r.tone} aria-hidden="true"/>}<span className="nx-row-name" title={r.name}>{r.name}</span><span className="nx-row-value" data-chip={r.chip}>{r.value ?? ''}</span>{r.sub ? <span className="nx-row-sub">{r.sub}</span> : null}{r.meter !== undefined ? <NxSegs share={r.meter} n={18} className="nx-row-meter"/> : null}
    </li>)}
  </WholeRows>;
}
const DAY_MS = 86_400_000, utc = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
/** The ISO week of the week that starts on `monday` (the week of the year its Thursday falls in), for a month lattice's row names ("W46"). */
export function isoWeekOf(monday: string): number {
  const thursday = utc(monday) + 3 * DAY_MS;
  return 1 + Math.floor((thursday - Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1)) / (7 * DAY_MS));
}
/** Whole days from `monday` to `day` (0–6 inside that week). */
export const dayInWeek = (monday: string, day: string) => Math.round((utc(day) - utc(monday)) / DAY_MS);
