'use client';
import {useMemo} from 'react';
import type {FocusSessions} from '../../../lib/focus-sessions/schema';
import {HEAT_WEEKS, focusHeat} from '../../../lib/nova/cards/ax/day-focus';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {AxdKey} from '../cards/ax/day-key';
import {AxdHeat} from '../cards/ax/day-lattice';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot, Fact} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {FocusSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: heat): "Focus heat" — the last 13 weeks, a column a week from Monday and a cell a
 * day, each lit by its focused minutes against the best day of those weeks. A day without a session is an empty cell.
 * The minutes are the sessions' own (the same sum as "how long did I focus"). Compact: the days with a session.
 */
export default function FocusHeat({size}: AxProps) {
  return <FocusSource>{(focus, today) => <Heat focus={focus} today={today} size={size}/>}</FocusSource>;
}
function Heat({focus, today, size}: {focus: FocusSessions; today: string; size: AxProps['size']}) {
  const view = useMemo(() => focusHeat(focus.sessions, today), [focus.sessions, today]), span = `the last ${HEAT_WEEKS} weeks`;
  const minutes = (n: number) => `${formatNumber(n)} ${n === 1 ? 'minute' : 'minutes'}`, best = view.best ? `${formatDate(view.best.date, {weekday: true, year: false})}, ${minutes(view.best.minutes)}` : null;
  const days = view.weeks.flatMap(w => w.cells).filter(c => c.minutes !== null);
  return <AxBody kind="focus-heat" size={size}>
    <AxHead figure={String(view.days)} unit={view.days === 1 ? 'day' : 'days'} label={`with a focus session · ${span}`} note={view.days ? `${minutes(view.minutes)} in ${view.sessions} ${view.sessions === 1 ? 'session' : 'sessions'}` : 'No session in these weeks'}/>
    {size !== 'S' && <AxdHeat weeks={view.weeks.map(w => ({key: w.key, label: w.month, cells: w.cells.map(c => ({key: c.date, state: c.ahead ? 'ahead' : undefined, level: c.level, today: c.today, title: c.words}))}))}/>}
    {size === 'L' && best && <div className="nc-facts axd-facts"><Fact label="Most focused day" value={best}/></div>}
    {size === 'L' && <AxdKey items={[['lit', 'Most minutes'], ['dim', 'Fewer'], ['none', 'No session'], ['open', 'Today']]}/>}
    <CardFoot source="Your focus sessions" asOf={span}/>
    <HoloTable caption={`Focus day by day, ${span}`} rows={[
      ['Days with a focus session', String(view.days)], ['Minutes focused', minutes(view.minutes)], ['Sessions', String(view.sessions)],
      ...(best ? [['Most focused day', best] as const] : []),
      ...days.map(c => [formatDate(c.date, {weekday: true, year: false}), minutes(c.minutes!)] as const),
    ]}/>
  </AxBody>;
}
