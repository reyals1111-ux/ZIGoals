'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {LazyPillarArt} from '../../illustrations/lazy-pillar-art';
import type {WidgetPillar} from '../../../lib/nova/widgets/catalog';
import {Unlit, type UnlitKind} from '../holo/parts';

/**
 * An empty widget teaches: the pillar's illustration, one plain line, and where to start. Session AK lane EXF (EX-14): give
 * `href`/`action` only when they differ from the widget's own link under it (lib/nova/widgets/catalog.ts), never the same
 * words to the same page twice.
 * Session AM-2: on the Holo stage the mark is the widget's own instrument, unlit (`ghost`: a ring, rows, bars, a clock, a
 * line); the Classic cards keep the pillar's illustration (widgets.css shows one or the other).
 * Session AM-3 (round 7): that instrument is drawn at its real size, powered down (`Unlit`): a fixed drawing, no value.
 */
const UNLIT: Readonly<Record<'ring' | 'rows' | 'bars' | 'clock' | 'wave' | 'stack' | 'arcs' | 'meter', UnlitKind>> = {ring: 'ring', rows: 'rows', bars: 'bars', clock: 'clock', wave: 'trend', stack: 'stack', arcs: 'arcs', meter: 'meter'};
const ROUND = new Set(['ring', 'clock', 'stack', 'arcs']);
export function NovaEmpty({pillar, children, href, action, ghost = 'ring'}: {pillar: WidgetPillar; children: ReactNode; href?: string; action?: string; ghost?: 'ring' | 'rows' | 'bars' | 'clock' | 'wave' | 'stack' | 'arcs' | 'meter'}) {
  return <div className="nova-empty" data-wide={ROUND.has(ghost) ? undefined : ''}>
    <span className="nova-empty-ghost" aria-hidden="true"><Unlit kind={UNLIT[ghost]}/></span>
    {/* Session AM: the new realms (mind, world, NOVA itself) wear the day's own illustration. */}
    <LazyPillarArt pillar={pillar === 'mind' || pillar === 'world' || pillar === 'nova' ? 'orbit' : pillar} size={44} className="nova-empty-art"/>
    <p>{children}</p>
    {href && action && <Link className="nova-link" href={href} prefetch={false}>{action} <span aria-hidden="true">→</span></Link>}
  </div>;
}
/** A source that could not be read says so; it is never shown as zero. */
export const NovaUnread = ({what}: {what: string}) => <p className="nova-unread" role="status">{what} could not be read on this device right now. Nothing was changed.</p>;
export const NovaReading = () => <p className="nova-reading" role="status">Reading…</p>;
