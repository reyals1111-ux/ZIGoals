'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useLinkTargets} from '../notes/use-notes';
import {NOTES} from '../../lib/notes/schema';
import {linkIndex, resolveLink} from '../../lib/notes/links';
import {entrySegments} from '../../lib/journal/entry-links';
import {formatDate} from '../../lib/visual-format';

/**
 * Session AV lane 2 (journal; LEDGER #35, Day One's links to other entries): an entry's words with its [[links]] live —
 * `[[2026-11-03]]` shows that day's entries here (the Journal's date filter), `[[name]]` opens the note, goal or habit of
 * that name (as Notes' links do). A name nothing on this device carries stays as written. Loaded only for an entry
 * whose words hold a [[link]].
 */
export default function EntryRichText({text, onDay}: {text: string; onDay: (day: string) => void}) {
  const notes = useDeviceRecord(NOTES), targets = useLinkTargets();
  const index = useMemo(() => linkIndex({notes: notes.loaded && !notes.unreadable ? notes.data.notes : [], goals: targets.goals, habits: targets.habits}), [notes.loaded, notes.unreadable, notes.data, targets.goals, targets.habits]);
  return <p className="journal-entry-text">{entrySegments(text).map((s, i) => {
    if (s.kind === 'text') return <span key={i}>{s.text}</span>;
    if (s.kind === 'day') return <a key={i} className="text-link journal-entry-link" href={`/app/journal?day=${s.day}`} onClick={e => { e.preventDefault(); onDay(s.day); }}>{s.label === s.day ? formatDate(s.day, {weekday: true}) : s.label}</a>;
    const hit = resolveLink(index, s.name);
    return hit ? <Link key={i} className="text-link journal-entry-link" href={hit.href}>{s.name}</Link> : <span key={i}>[[{s.name}]]</span>;
  })}</p>;
}
