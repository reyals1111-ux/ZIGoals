'use client';
import {useMemo, type ReactNode} from 'react';
import type {Track} from '../../../../lib/ai/local-answers/exact/track';
import {latestPoint} from '../../../../lib/nova/cards/ax/health-scan';
import type {AxWords} from '../../../../lib/nova/cards/ax/health-trend';
import type {WidgetSize} from '../../../../lib/nova/store';
import {HoloTable} from '../../holo/parts';
import {TrackCalendar} from '../../widgets/ax/track-calendar';
import {CardFoot, CardNotice, type Ghost} from '../kit';
import {AxBody, AxHead, type AxProps} from './kit';
import './health.css';

/**
 * Session AS (ADR-042 Part 2, Health): the frame every Health answer widget shares — the answer as a figure and words,
 * the instrument (from Medium up), a key or two facts (Large), the foot with its source and as-of, and the table that
 * states every figure the drawing shows. Small is the figure and its words alone.
 */
export function HealthFrame({kind, size, words, tone, children, extra}: {kind: string; size: WidgetSize; words: AxWords; tone?: 'clear' | 'watch'; /** The instrument. */ children?: ReactNode; /** A key or facts, at Large. */ extra?: ReactNode}) {
  return <AxBody kind={kind} size={size}>
    <AxHead figure={words.figure} unit={words.unit} label={words.label} note={words.note || undefined} tone={tone}/>
    {size !== 'S' && children}
    {size === 'L' && extra}
    <CardFoot source="Your Health records" asOf={words.asOf}/>
    <HoloTable caption={words.caption} rows={words.rows}/>
  </AxBody>;
}
/** The key of a Health instrument: what each mark means, in words (never colour alone). */
export function AxhKey({items}: {items: readonly (readonly [mark: string, words: string])[]}) {
  return <p className="axh-key" aria-hidden="true">{items.map(([mark, words]) => <span key={mark}><i data-k={mark}/>{words}</span>)}</p>;
}
/** Facts under an instrument (Large): a label and its value, a row each. */
export function AxhFacts({rows}: {rows: readonly (readonly [string, string])[]}) {
  return <div className="axh-facts">{rows.map(([label, value]) => <p key={label} className="axh-fact"><span>{label}</span><b>{value}</b></p>)}</div>;
}
/** Nothing logged yet (or nothing in the period asked): the instrument powered down, one line and one way on. The body's only child. */
export function HealthEmpty({size, title, href, action, ghost = 'trend', children}: {size: WidgetSize; title: string; href: string; action: string; ghost?: Ghost; children: ReactNode}) {
  return <CardNotice kind="empty" ghost={ghost} title={title} href={href} action={action}>{size === 'S' ? null : children}</CardNotice>;
}
/**
 * One of Health's logs as a month calendar (family 1, components/nova/widgets/ax/track-calendar.tsx), from the exact
 * layer's own track. A log with a target lights the days that did not reach it (below the target half-lit, nothing logged
 * unlit and dashed: unknown, never zero); a log without one lights the days it was logged.
 */
export function HealthDays({kind, track, today, size, params, title, href, action, children}: {kind: string; track: Track; today: string; title: string; href: string; action: string; children: ReactNode} & AxProps) {
  const any = useMemo(() => latestPoint(track, today) !== null, [track, today]);
  if (!any) return <HealthEmpty size={size} ghost="lattice" title={title} href={href} action={action}>{children}</HealthEmpty>;
  return <TrackCalendar kind={kind} track={track} today={today} params={params} size={size} lit={track.kind === 'log' ? 'not-done' : 'done'} source={track.source[0]}/>;
}
