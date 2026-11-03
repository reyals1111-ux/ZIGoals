'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {NOVA_BRIEFS, latestBriefs, novaBriefLines, unreadCount} from '../../../lib/nova/briefs';
import type {WidgetSize} from '../../../lib/nova/store';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/** "NOVA briefs": the latest morning brief or evening recap, made on this device (ND's lib/nova/briefs.ts), and how many are unread. */
export default function BriefsWidget({size}: {size: WidgetSize}) {
  const record = useDeviceRecord(NOVA_BRIEFS), today = useLocalToday();
  if (!record.loaded) return <NovaReading/>;
  if (record.unreadable) return <NovaUnread what="Your briefs"/>;
  const latest = latestBriefs(record.data, 1)[0], unread = unreadCount(record.data, today);
  if (!latest) return <NovaEmpty pillar="orbit" href="/app/nova/setup" action="Set up daily briefs">No brief yet. NOVA can make a morning brief and an evening recap from your day, on this device.</NovaEmpty>;
  const lines = novaBriefLines(latest).slice(0, size === 'S' ? 1 : size === 'M' ? 3 : 6);
  return <div className="nova-briefs">
    <p className="nova-line"><strong>{latest.kind === 'morning' ? 'Morning brief' : 'Evening recap'}</strong>{unread ? <span className="nova-count"> · {unread} unread</span> : null}</p>
    <ul className="nova-glance">{lines.map((line, i) => <li key={i}>{line}</li>)}</ul>
    <Link className="nova-chip-link" href="/app/nova/setup" prefetch={false}>Brief settings</Link>
  </div>;
}
