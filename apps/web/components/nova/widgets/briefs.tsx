'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {NOVA_BRIEFS, latestBriefs, novaBriefLines, unreadCount} from '../../../lib/nova/briefs';
import type {WidgetSize} from '../../../lib/nova/store';
import {WholeRows} from '../cards/whole-rows';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/**
 * Session AL fifth pass (N-045, DV-077; handed over by L7-5b): the brief holds a goal line ("Goal: Japan adventure can catch
 * up…", "Goals with a step this week: …"), but the widget showed only its first lines, the habit ones. When that line is not
 * among the first `n`, it takes the last place: [...the first max(1, n − 1) lines, the goal line].
 */
export function glanceLines(all: readonly string[], n: number): string[] {
  const first = all.slice(0, n), goal = all.find(line => line.startsWith('Goal: ') || line.startsWith('Goals with a step this week: '));
  return !goal || first.includes(goal) ? first : [...all.slice(0, Math.max(1, n - 1)), goal];
}
/** "NOVA briefs": the latest morning brief or evening recap, made on this device (ND's lib/nova/briefs.ts), and how many are unread. */
export default function BriefsWidget({size}: {size: WidgetSize}) {
  const record = useDeviceRecord(NOVA_BRIEFS), today = useLocalToday();
  if (!record.loaded) return <NovaReading/>;
  if (record.unreadable) return <NovaUnread what="Your briefs"/>;
  const latest = latestBriefs(record.data, 1)[0], unread = unreadCount(record.data, today);
  if (!latest) return <NovaEmpty pillar="orbit" ghost="rows" href="/app/nova/setup" action="Set up daily briefs">No brief yet. NOVA can make a morning brief and an evening recap from your day, on this device.</NovaEmpty>;
  const lines = glanceLines(novaBriefLines(latest), size === 'S' ? 1 : size === 'M' ? 3 : 6);
  const all = novaBriefLines(latest);
  // Session AM-2: the brief's kind is its heading beside a small dial (the sun's side of the day: a lit point in the east for the morning, in the west for the evening); its lines are rows with lit nodes.
  return <div className="nova-briefs hw-briefs" data-kind={latest.kind} data-size={size}>
    <p className="nova-line hw-head"><span className="hw-dayglyph" aria-hidden="true"><i/></span><strong>{latest.kind === 'morning' ? 'Morning brief' : 'Evening recap'}</strong>{unread ? <span className="nova-count"> · {unread} unread</span> : null}</p>
    {/* Session AM-2 (whole rows only): the brief's lines that fit, then how many more it holds. */}
    <WholeRows inline className="nova-glance hw-rows" extra={Math.max(0, all.length - lines.length)} min={1} more={hidden => `+${hidden} more in this brief`}>{lines.map((line, i) => <li key={i} className="hw-row">{line}</li>)}</WholeRows>
    <Link className="nova-chip-link" href="/app/nova/setup" prefetch={false}>Brief settings</Link>
  </div>;
}
