'use client';
import {useMemo} from 'react';
import type {Habit} from '../../../lib/habits';
import {dayNames, periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {habitsLattice} from '../../../lib/nova/cards/ax/habit-lattice';
import {AxdKey, type AxdMark} from '../cards/ax/day-key';
import {AxdLattice} from '../cards/ax/day-lattice';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {HabitsSource} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family: lattices): "Habits lattice" — every habit that was due in the period as a row, the
 * period's days as columns (the newest 31 at most): done lit, missed a bright slash, skipped a dashed cell (marked so by
 * the person; never counted as missed), today ringed while it is still open. The days are the exact layer's own
 * (`habitPoints`), so the widget and "how did my habits go this month" count one thing. The period is the question's
 * (`period`), else this month. Compact: the check-ins done. A hero adds the key.
 */
export default function HabitsLattice({size, params}: AxProps) {
  return <HabitsSource>{(all, _live, today) => <Days habits={all} today={today} size={size} params={params}/>}</HabitsSource>;
}
const WORDS: Record<string, string> = {done: 'done', part: 'partly done', missed: 'missed', skipped: 'skipped', open: 'still open', rest: 'not due', none: 'nothing logged', ahead: 'still to come'};
const KEY: readonly (readonly [string, AxdMark, string])[] = [['done', 'lit', 'Done'], ['missed', 'missed', 'Missed'], ['skipped', 'skipped', 'Skipped (not counted as missed)'], ['open', 'open', 'Today, still open']];
function Days({habits, today, size, params}: {habits: readonly Habit[]; today: string} & AxProps) {
  const view = useMemo(() => habitsLattice(habits, widgetPeriod(params?.period, today, 'this-month'), today), [habits, params?.period, today]);
  const label = periodLabel(view.period, today), T = view.totals, n = view.columns.length, used = new Set<string>(view.rows.flatMap(r => r.cells));
  const bits = [`${T.missed} missed`, `${T.skipped} skipped`, ...(T.open ? [`${T.open} still open today`] : [])];
  const dates = (row: (typeof view.rows)[number], state: string) => view.columns.filter((_, i) => row.cells[i] === state).map(c => c.date);
  return <AxBody kind="habits-lattice" size={size}>
    {view.rows.length ? <AxHead figure={String(T.done)} unit={`of ${T.decided}`} label={`due check-ins done · ${label}`} note={bits.join(' · ')} tone={T.missed === 0 && T.decided > 0 ? 'clear' : undefined}/>
      : <AxHead figure="0" unit="due" label={`habit check-ins · ${label}`} note="No habit was due in these days"/>}
    {size !== 'S' && view.rows.length > 0 && <AxdLattice
      columns={view.columns.map((c, i) => ({key: c.date, label: n <= 10 || i % 7 === 0 ? String(c.day) : '', today: c.today, lead: c.today}))}
      rows={view.rows.map(r => ({key: r.id, label: r.name, note: r.note, cells: r.cells.map((state, i) => ({state, title: `${r.name}, ${view.columns[i]!.words}: ${WORDS[state] ?? state}`}))}))}
      more={(hidden, shown) => `+${hidden} more ${hidden === 1 ? 'habit' : 'habits'}${shown ? ' on the Habits page' : ''}`}/>}
    {size === 'L' && view.rows.length > 0 && <AxdKey items={KEY.filter(([state]) => used.has(state)).map(([, mark, words]) => [mark, words] as const)}/>}
    <CardFoot source="Your habits" asOf={view.earlier ? `${label} · the last ${n} days drawn` : label}/>
    <HoloTable caption={`Habits day by day, ${label}`} rows={[
      ['Due check-ins done', `${T.done} of ${T.decided}`], ['Missed (a due day not done)', String(T.missed)], ['Skipped (marked so; not counted as missed)', String(T.skipped)],
      ...(T.open ? [['Still open today', String(T.open)] as const] : []),
      ...view.rows.map(r => { const missed = dates(r, 'missed'), skipped = dates(r, 'skipped'); return [r.name, `${r.done} of ${r.decided} done${missed.length ? `; ${r.quit ? 'slipped' : 'missed'} ${dayNames(missed, 31)}` : ''}${skipped.length ? `; skipped ${dayNames(skipped, 31)}` : ''}${r.open ? '; today still open' : ''}`] as const; }),
    ]}/>
  </AxBody>;
}
