'use client';
import {useMemo} from 'react';
import type {FocusSessions} from '../../../lib/focus-sessions/schema';
import {focusGauge, type GaugeSide} from '../../../lib/nova/cards/ax/day-focus';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {AxdGauge} from '../cards/ax/day-dial';
import {AxdKey} from '../cards/ax/day-key';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {FocusSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: dials): "Focus gauge" — the minutes focused this week so far as the lit arc,
 * beside the whole of last week as a dimmer arc inside it, on one scale. A week without a session is an unlit dashed
 * track, never a zero-length arc. The minutes are the sessions' own. The difference is said in words, as a fact.
 */
export default function FocusGauge({size}: AxProps) {
  return <FocusSource>{(focus, today) => <Dial focus={focus} today={today} size={size}/>}</FocusSource>;
}
const minutes = (n: number) => `${formatNumber(n)} ${n === 1 ? 'minute' : 'minutes'}`;
const said = (s: GaugeSide) => s.sessions ? `${minutes(s.minutes)} in ${s.sessions} ${s.sessions === 1 ? 'session' : 'sessions'} on ${s.days} ${s.days === 1 ? 'day' : 'days'}` : 'No focus session';
function Dial({focus, today, size}: {focus: FocusSessions; today: string; size: AxProps['size']}) {
  const view = useMemo(() => focusGauge(focus.sessions, today), [focus.sessions, today]), d = view.delta;
  const delta = !view.before.sessions ? 'no session last week' : `${minutes(view.before.minutes)} last week${d === 0 ? ' · the same so far' : ` · ${formatNumber(Math.abs(d))} ${d > 0 ? 'more' : 'fewer'} so far`}`;
  return <AxBody kind="focus-gauge" size={size}>
    <AxHead figure={formatNumber(view.now.minutes)} unit="min" label="focused · this week" note={view.now.sessions ? delta : `No session yet this week · ${delta}`}/>
    {size !== 'S' && <AxdGauge now={view.nowShare} before={view.beforeShare} figure={formatNumber(view.now.minutes)} unit="min"/>}
    {size === 'L' && <AxdKey items={[['lit', 'This week so far'], ['dim', 'Last week'], ['none', 'No session']]}/>}
    <CardFoot source="Your focus sessions" asOf={`since ${formatDate(view.now.from, {weekday: true, year: false})}`}/>
    <HoloTable caption="Focus this week beside last week" rows={[
      [`This week (from ${formatDate(view.now.from, {year: false})})`, said(view.now)],
      [`Last week (${formatDate(view.before.from, {year: false})} – ${formatDate(view.before.to, {year: false})})`, said(view.before)],
      ['Difference so far', d === 0 ? 'The same' : `${minutes(Math.abs(d))} ${d > 0 ? 'more' : 'fewer'} this week`],
    ]}/>
  </AxBody>;
}
