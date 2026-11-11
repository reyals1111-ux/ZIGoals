'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {LazyPillarArt} from '../../illustrations/lazy-pillar-art';
import type {WidgetPillar} from '../../../lib/nova/widgets/catalog';

/**
 * An empty widget teaches: the pillar's illustration, one plain line, and where to start. Session AK lane EXF (EX-14): give
 * `href`/`action` only when they differ from the widget's own link under it (lib/nova/widgets/catalog.ts), never the same
 * words to the same page twice.
 */
export function NovaEmpty({pillar, children, href, action}: {pillar: WidgetPillar; children: ReactNode; href?: string; action?: string}) {
  return <div className="nova-empty">
    {/* Session AM: the new realms (mind, world, NOVA itself) wear the day's own illustration. */}
    <LazyPillarArt pillar={pillar === 'mind' || pillar === 'world' || pillar === 'nova' ? 'orbit' : pillar} size={44} className="nova-empty-art"/>
    <p>{children}</p>
    {href && action && <Link className="nova-link" href={href} prefetch={false}>{action} <span aria-hidden="true">→</span></Link>}
  </div>;
}
/** A source that could not be read says so; it is never shown as zero. */
export const NovaUnread = ({what}: {what: string}) => <p className="nova-unread" role="status">{what} could not be read on this device right now. Nothing was changed.</p>;
export const NovaReading = () => <p className="nova-reading" role="status">Reading…</p>;
