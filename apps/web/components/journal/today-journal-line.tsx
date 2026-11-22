'use client';
import Link from 'next/link';
import {journalLines} from '../../lib/journal/today';
import {localDate} from '../../lib/local-date';
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
export default function TodayJournalLine({glance = false}: {glance?: boolean} = {}) {
  const day = useJournalToday();
  if (!day) return null;
  const todays = day.today.length, memory = day.memories;
  const parts = [todays ? `Written today: ${formatNumber(todays)} ${todays === 1 ? 'entry' : 'entries'}` : '', memory.length ? `On this day: ${memory.length === 1 ? `an entry ${memory[0]!.label.toLowerCase()}` : `${formatNumber(memory.length)} memories`}` : ''].filter(Boolean);
  if (!parts.length) return null;
  const lines = day.lines ? journalLines(day, localDate()) : [];
  const list = lines.length > 0 ? <ul className="today-journal-lines" aria-label="First lines from your journal">{lines.map(l => <li key={l.id}><span className="today-journal-when">{l.when}</span> <span dir="auto">{l.text}</span></li>)}</ul> : null;
  // Session AV (1c, q4 #33): on Today's glance lines the line is its own region, the opt-in first lines inside it; in the
  // journal card, the count line only.
  // Plain words there, not a link: Showcase Today stays within its 90 Tab stops (D-028); the journal card's own line
  // (For you → How was today?) and Journal in the menu open the Journal.
  if (glance) return <section className="today-tasks-due today-journal-glance" aria-label="Your journal today"><p className="today-tasks-due-line"><span><strong>Journal:</strong> {parts.join(' · ')}</span></p>{list}</section>;
  return <p className="fine today-journal-line"><Link className="text-link" href="/app/journal">{parts.join(' · ')} →</Link></p>;
}
