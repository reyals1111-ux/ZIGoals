'use client';
import {useMemo} from 'react';
import {dayTimeline} from '../../../lib/nova/cards/ax/day-agenda';
import type {ClockInput} from '../../../lib/nova/holo/agenda';
import {formatClock} from '../../../lib/visual-format';
import {AxdKey} from '../cards/ax/day-key';
import {AxdTimeline} from '../cards/ax/day-timeline';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {AgendaSource} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family: timelines): "Today's line" — today's agenda on a 24-hour line, as the Agenda
 * page's day view builds it (the hook the hour grid and the agenda clock use): each timed item a mark at its time (done:
 * filled; open: hollow; open with its time passed: hollow with a dot; skipped: dashed), now as a hairline. Items without
 * a time are counted in words, never placed. Read only. Compact: the items left.
 */
export default function DayTimelineWidget({size}: AxProps) {
  return <AgendaSource>{(items, now) => <Line items={items} now={now} size={size}/>}</AgendaSource>;
}
const STATE = {done: 'done', skipped: 'skipped', open: 'open'} as const;
function Line({items, now, size}: {items: readonly ClockInput[]; now: string; size: AxProps['size']}) {
  const view = useMemo(() => dayTimeline(items, now), [items, now]);
  const note = view.next ? `Next: ${formatClock(view.next.time)} ${view.next.title}` : view.anytime ? `${view.anytime} any time today` : view.left ? 'Nothing more with a time today' : 'Everything on today’s agenda is done';
  return <AxBody kind="day-timeline" size={size}>
    <AxHead figure={String(view.left)} unit={`of ${view.total}`} label={`agenda ${view.left === 1 ? 'item' : 'items'} left today`} note={note} tone={view.left === 0 ? 'clear' : undefined}/>
    {size !== 'S' && <AxdTimeline now={view.nowAt} marks={view.marks.map(m => ({key: m.key, at: m.at, lane: m.lane, kind: m.kind, title: `${m.title}: ${m.words}`}))}
      labels={view.ticks} grid={view.ticks.map(t => t.at)}/>}
    {size === 'L' && <AxdKey items={[['lit', 'Done'], ['ring', 'Open'], ['skipped', 'Skipped'], ...(view.anytime ? [['none', `${view.anytime} any time`] as const] : [])]}/>}
    <CardFoot source="Your agenda" asOf={`today, ${formatClock(view.now)}`}/>
    <HoloTable caption="Today’s agenda on a line" rows={[
      ['Items left', `${view.left} of ${view.total}`], ['Done', String(view.done)], ...(view.skipped ? [['Skipped', String(view.skipped)] as const] : []), ['With a time', String(view.timed)], ['Any time today', String(view.anytime)],
      ...items.map(i => [i.title, `${i.overdue ? `Overdue${i.overdue.time ? `, ${formatClock(i.overdue.time)}` : ''}` : i.time ? formatClock(i.time) : 'Any time'} · ${STATE[i.state]}`] as const), // Session AW (fr-answers, FR-AW-19)
    ]}/>
  </AxBody>;
}
