'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../../ai/use-device-record';
import {NOTES} from '../../../lib/notes/schema';
import {inboxOf} from '../../../lib/notes/store';
import {noteRowName} from '../../../lib/nova/holo/lists';
import {moreWords} from '../../../lib/nova/cards/whole-rows';
import {WholeRows} from '../cards/whole-rows';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/**
 * "Notes inbox": captured notes waiting to be filed (lane B's lib/notes), newest first.
 * Session AM-2: each row is the note's name at the row's whole width (an untitled capture by its first line, or "Untitled
 * note"; a title that is only a day by that date in the app's format, never raw ISO), and the rows that do not fit are
 * counted in one last line ("+N more on the Notes page").
 */
export default function NotesWidget() {
  const record = useDeviceRecord(NOTES);
  if (!record.loaded) return <NovaReading/>;
  if (record.unreadable) return <NovaUnread what="Your notes"/>;
  const inbox = inboxOf(record.data), shown = inbox.slice(0, 2);
  if (!inbox.length) return <NovaEmpty pillar="orbit" ghost="rows">Your inbox is clear. A quick note from anywhere lands here to file later.</NovaEmpty>;
  return <div className="nova-notes">
    <p className="nova-big"><span className="nova-figure">{inbox.length}</span><small> {inbox.length === 1 ? 'note' : 'notes'} to file</small></p>
    <WholeRows className="nova-glance nova-notes-list" extra={inbox.length - shown.length} min={1} more={(hidden, rows) => moreWords(hidden, {shown: rows, where: 'the Notes page'})}>
      {shown.map(n => { const name = noteRowName(n); return <li key={n.id}><Link href="/app/notes" prefetch={false} title={name}>{name}</Link></li>; })}
    </WholeRows>
  </div>;
}
