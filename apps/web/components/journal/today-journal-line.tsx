'use client';
import Link from 'next/link';
import {firstLine} from '../../lib/journal/today';
import {formatNumber} from '../../lib/visual-format';
import {useJournalToday} from './use-journal-today';
import './on-this-day.css';

/**
 * Session AV (owner follow-up 1, F-JOURNAL-TODAY; Day One's Today tab): under Today's journal card, one line — how many
 * entries were written today and whether "On this day" has a memory — opening the Journal. No journal text is shown on
 * Today (the journal is a private screen; Today can be seen over a shoulder): counts and the year only. "On this day"
 * follows the person's own switch. Nothing when there is nothing to say. Lazy.
 * Session AV (1c, q4 #33, owner decision: the reviewer's smaller suggestion): only when the person switched on "Show the
 * first lines on Today" (Journal → Privacy), the first line of each of today's entries and memories is listed under it.
 */
export default function TodayJournalLine() {
  const day = useJournalToday();
  if (!day) return null;
  const todays = day.today.length, memory = day.memories;
  const parts = [todays ? `Written today: ${formatNumber(todays)} ${todays === 1 ? 'entry' : 'entries'}` : '', memory.length ? `On this day: ${memory.length === 1 ? `an entry ${memory[0]!.label.toLowerCase()}` : `${formatNumber(memory.length)} memories`}` : ''].filter(Boolean);
  if (!parts.length) return null;
  const lines = day.lines ? [...day.today.slice(-3).map(e => ({id: e.id, when: 'Today', text: firstLine(e.text)})), ...memory.slice(0, 3).map(m => ({id: m.entry.id, when: m.label, text: firstLine(m.entry.text)}))].filter(l => l.text) : [];
  return <>
    <p className="fine today-journal-line"><Link className="text-link" href="/app/journal">{parts.join(' · ')} →</Link></p>
    {lines.length > 0 && <ul className="today-journal-lines" aria-label="First lines from your journal">{lines.map(l => <li key={l.id}><span className="today-journal-when">{l.when}</span> <span dir="auto">{l.text}</span></li>)}</ul>}
  </>;
}
