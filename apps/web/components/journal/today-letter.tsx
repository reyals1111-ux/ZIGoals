'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL} from '../../lib/journal/schema';
import {lettersOpen} from '../../lib/journal/letters';
import {journalDay} from '../../lib/journal/journal-day';
import {formatDate} from '../../lib/visual-format';
import './today-affirmation.css';

/**
 * Session AV lane 2 (r3-notes; LEDGER #279, Stoic's letter to open later): on Today's journal card, a letter the person
 * wrote that opens today (or opened in the last week): when it was written, and a link to read it. Nothing at all on the
 * other days (no Tab stop is added to Today). Never a word of the letter here. Lazy.
 */
export default function TodayLetter() {
  const journal = useDeviceRecord(JOURNAL);
  if (!journal.loaded) return null;
  const today = journalDay(), open = lettersOpen(journal.data.entries, today);
  if (!open.length) return null;
  const first = open[0]!;
  return <p className="today-letter" role="group" aria-label="A letter to you">
    <span className="fine today-affirmation-label">A letter to you</span>{' '}
    <span>{first.opensOn === today ? 'opens today' : `opened ${formatDate(first.opensOn!, {weekday: true, year: false})}`}: you wrote it on {formatDate(first.date)}.{open.length > 1 ? ` ${open.length - 1} more opened this week.` : ''}</span>{' '}
    <Link className="text-link today-affirmation-next" href={`/app/journal?day=${first.date}`}>Read your letter</Link>
  </p>;
}
