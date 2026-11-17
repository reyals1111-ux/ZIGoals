'use client';
import {useMemo} from 'react';
import type {Track} from '../../../../lib/ai/local-answers/exact/track';
import {calendarOf, calendarWords, periodLabel, widgetPeriod, type Lit} from '../../../../lib/nova/cards/ax/calendar';
import type {WidgetParams} from '../../../../lib/nova/stage/record';
import type {WidgetSize} from '../../../../lib/nova/store';
import {AxCalendar} from '../../cards/ax/calendar';
import {AxBody, AxHead, AxKey} from '../../cards/ax/kit';
import {CardFoot} from '../../cards/kit';
import {HoloTable} from '../../holo/parts';

/**
 * Session AS (ADR-042 Part 2, family 1): one track's days as a calendar — the body every calendar kind shares. Which
 * days are lit is the kind's own (`lit`): the days not done (missed, skipped, below a target, nothing logged) or the days
 * done. Compact: the figure and its words. Supporting and hero: the calendar; a hero adds the key.
 */
export function TrackCalendar({kind, track, today, params, size, lit = 'not-done', source, fallback = 'this-month'}: {kind: string; track: Track; today: string; params?: WidgetParams; size: WidgetSize; lit?: Lit; source: string; fallback?: string}) {
  const view = useMemo(() => calendarOf(track, widgetPeriod(params?.period, today, fallback), today, lit), [track, params?.period, today, fallback, lit]);
  const words = useMemo(() => calendarWords(view, track, lit, today), [view, track, lit, today]);
  return <AxBody kind={kind} size={size}>
    <AxHead figure={words.figure} unit={words.unit} label={words.label} note={words.note} tone={words.tone}/>
    {size !== 'S' && <AxCalendar view={view} lit={lit} kind={track.kind}/>}
    {size === 'L' && <AxKey items={words.key}/>}
    <CardFoot source={source} asOf={`${view.title} · ${periodLabel(view.period, today)}`}/>
    <HoloTable caption={`${track.name}, ${periodLabel(view.period, today)}`} rows={words.rows}/>
  </AxBody>;
}
