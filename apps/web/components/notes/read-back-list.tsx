'use client';
import Link from 'next/link';
import type {Notes} from '../../lib/notes/schema';
import {READ_BACK_DAYS, notReadBack, setReadBack} from '../../lib/notes/read-back';
import {snippetOf} from '../../lib/notes/lock';
import {formatDate} from '../../lib/visual-format';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (r6-notes; LEDGER #402, Capacities): "Not read back yet" in Notes → Days (lazy, loaded when its fold
 * opens) — the daily notes of the last 30 days that are not marked read back, oldest first, each opening its day, with
 * "Mark read back". A locked daily note shows its day and that it is locked, never its words. When none is left the
 * list says so calmly; nothing is counted against the person.
 */
export default function ReadBackList({record, change, today}: {record: Notes; change: Change; today: string}) {
  const left = notReadBack(record, today);
  if (!left.length) return <p className="fine">Every daily note of the last {READ_BACK_DAYS} days with words is read back. Open a day and press Read back when you have looked over it.</p>;
  return <>
    <p className="fine">The daily notes of the last {READ_BACK_DAYS} days you have not marked read back, oldest first. Reading one back is a calm look over the day; nothing is counted.</p>
    <ul className="note-list note-read-back-list">{left.map(n => <li key={n.id}>
      <Link href={`/app/notes?day=${n.day}`}><strong>{formatDate(n.day!, {weekday: true})}</strong></Link>
      <p className="fine">{n.locked ? 'Locked: it shows after your PIN.' : snippetOf(n, 100)}</p>
      <button type="button" className="quiet" aria-label={`Mark ${formatDate(n.day!, {weekday: true})} read back`} onClick={() => change(r => setReadBack(r, n.id, true, today), `${formatDate(n.day!, {weekday: true})} is marked read back.`)}>Mark read back</button>
    </li>)}</ul>
  </>;
}
