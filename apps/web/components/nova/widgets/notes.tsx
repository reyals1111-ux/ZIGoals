'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../../ai/use-device-record';
import {NOTES, noteName} from '../../../lib/notes/schema';
import {inboxOf} from '../../../lib/notes/store';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/** "Notes inbox": captured notes waiting to be filed (lane B's lib/notes), newest first. */
export default function NotesWidget() {
  const record = useDeviceRecord(NOTES);
  if (!record.loaded) return <NovaReading/>;
  if (record.unreadable) return <NovaUnread what="Your notes"/>;
  const inbox = inboxOf(record.data);
  if (!inbox.length) return <NovaEmpty pillar="orbit" ghost="rows">Your inbox is clear. A quick note from anywhere lands here to file later.</NovaEmpty>;
  return <div className="nova-notes">
    <p className="nova-big"><span className="nova-figure">{inbox.length}</span><small> {inbox.length === 1 ? 'note' : 'notes'} to file</small></p>
    <ul className="nova-glance">{inbox.slice(0, 2).map(n => <li key={n.id}><Link href="/app/notes" prefetch={false}>{noteName(n)}</Link></li>)}</ul>
  </div>;
}
