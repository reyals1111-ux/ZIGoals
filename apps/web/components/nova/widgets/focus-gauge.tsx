'use client';
import {useMemo} from 'react';
import type {FocusSessions} from '../../../lib/focus-sessions/schema';
import {periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {focusGauge, type GaugeSide} from '../../../lib/nova/cards/ax/day-focus';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {AxdGauge} from '../cards/ax/day-dial';
import {AxdKey} from '../cards/ax/day-key';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {FocusSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: dials): "Focus gauge" — the minutes focused in the answer's period (`period`; this
 * week by default) as the lit arc, beside the period before it as a dimmer arc inside it, on one scale. A week without a session is an unlit dashed
 * track, never a zero-length arc. The minutes are the sessions' own. The difference is said in words, as a fact.
 */
export default function FocusGauge({size, params}: AxProps) {
  return <FocusSource>{(focus, today) => <Dial focus={focus} today={today} size={size} token={params?.period}/>}</FocusSource>;
}
/** The words for a side: "this week", "today"; the period before as "last week", "yesterday", or its dates. */
const BEFORE: Record<string, string> = {'this-week': 'last week', today: 'yesterday', 'this-month': 'last month', 'this-year': 'last year'};
const minutes = (n: number) => `${formatNumber(n)} ${n === 1 ? 'minute' : 'minutes'}`;
const said = (s: GaugeSide) => s.sessions ? `${minutes(s.minutes)} in ${s.sessions} ${s.sessions === 1 ? 'session' : 'sessions'} on ${s.days} ${s.days === 1 ? 'day' : 'days'}` : 'No focus session';
function Dial({focus, today, size, token}: {focus: FocusSessions; today: string; size: AxProps['size']; token?: string}) {
  const period = useMemo(() => widgetPeriod(token, today, 'this-week'), [token, today]);
  const view = useMemo(() => focusGauge(focus.sessions, today, period.token), [focus.sessions, today, period.token]), d = view.delta;
  const now = periodLabel(period, today), base = period.token.split('@')[0]!;
  const before = BEFORE[base] ?? `${formatDate(view.before.from, {year: false})} – ${formatDate(view.before.to, {year: false})}`, open = view.now.to === today;
  const delta = !view.before.sessions ? `no session ${before}` : `${minutes(view.before.minutes)} ${before}${d === 0 ? ` · the same${open ? ' so far' : ''}` : ` · ${formatNumber(Math.abs(d))} ${d > 0 ? 'more' : 'fewer'}${open ? ' so far' : ''}`}`;
  return <AxBody kind="focus-gauge" size={size}>
    <AxHead figure={formatNumber(view.now.minutes)} unit="min" label={`focused · ${now}`} note={view.now.sessions ? delta : `No session ${open ? 'yet ' : ''}${now} · ${delta}`}/>
    {size !== 'S' && <AxdGauge now={view.nowShare} before={view.beforeShare} figure={formatNumber(view.now.minutes)} unit="min"/>}
    {/* Session AS (carried 9): the arc's scale, said (it is the larger of the two periods, not a target). */}
    {size !== 'S' && (view.now.sessions || view.before.sessions) ? <p className="axd-scale">Full arc: {minutes(Math.max(view.now.minutes, view.before.minutes))}, the larger of the two periods</p> : null}
    {size === 'L' && <AxdKey items={[['lit', open ? `${now[0]!.toUpperCase()}${now.slice(1)} so far` : `${now[0]!.toUpperCase()}${now.slice(1)}`], ['dim', `${before[0]!.toUpperCase()}${before.slice(1)}`], ['none', 'No session']]}/>}
    <CardFoot source="Your focus sessions" asOf={now}/>
    <HoloTable caption={`Focus ${now} beside ${before}`} rows={[
      [`${now[0]!.toUpperCase()}${now.slice(1)} (${formatDate(view.now.from, {year: false})}${view.now.from === view.now.to ? '' : ` – ${formatDate(view.now.to, {year: false})}`})`, said(view.now)],
      [`${before[0]!.toUpperCase()}${before.slice(1)} (${formatDate(view.before.from, {year: false})}${view.before.from === view.before.to ? '' : ` – ${formatDate(view.before.to, {year: false})}`})`, said(view.before)],
      [open ? 'Difference so far' : 'Difference', d === 0 ? 'The same' : `${minutes(Math.abs(d))} ${d > 0 ? 'more' : 'fewer'} ${now}`],
    ]}/>
  </AxBody>;
}
