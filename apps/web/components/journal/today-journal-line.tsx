'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL} from '../../lib/journal/schema';
import {onThisDay} from '../../lib/on-this-day/on-this-day';
import {JOURNAL_DISPLAY, onThisDayShown} from '../../lib/on-this-day/store';
import {localDate} from '../../lib/local-date';
import {formatNumber} from '../../lib/visual-format';
import './on-this-day.css';

/**
 * Session AV (owner follow-up 1, F-JOURNAL-TODAY; Day One's Today tab): under Today's journal card, one line — how many
 * entries were written today and whether "On this day" has a memory — opening the Journal. No journal text is shown on
 * Today (the journal is a private screen; Today can be seen over a shoulder): counts and the year only. "On this day"
 * follows the person's own switch. Nothing when there is nothing to say. Lazy.
 */
export default function TodayJournalLine() {
  const journal = useDeviceRecord(JOURNAL), display = useDeviceRecord(JOURNAL_DISPLAY), today = localDate();
  const said = useMemo(() => {
    if (!journal.loaded || journal.unreadable || !display.loaded) return null;
    const entries = journal.data.entries, todays = entries.filter(e => e.date === today).length;
    const memory = onThisDayShown(display.data) ? onThisDay(entries, today, {hidden: display.data.hidden ?? []}) : [];
    const parts = [todays ? `Written today: ${formatNumber(todays)} ${todays === 1 ? 'entry' : 'entries'}` : '', memory.length ? `On this day: ${memory.length === 1 ? `an entry ${memory[0]!.label.toLowerCase()}` : `${formatNumber(memory.length)} memories`}` : ''].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }, [journal.loaded, journal.unreadable, journal.data, display.loaded, display.data, today]);
  if (!said) return null;
  return <p className="fine today-journal-line"><Link className="text-link" href="/app/journal">{said} →</Link></p>;
}
