'use client';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL} from '../../lib/journal/schema';
import {JOURNAL_DISPLAY, onThisDayShown} from '../../lib/on-this-day/store';
import {localDate} from '../../lib/local-date';
import {journalToday, type JournalToday} from '../../lib/journal/today';

/**
 * Session AV (1c, q4 #33): today's journal entries and "On this day" memories, for Today's journal line and for the
 * journal card's place among the For you cards (raised on a day that has one). Null until both records are read.
 */
export function useJournalToday(): (JournalToday & {lines: boolean}) | null {
  const journal = useDeviceRecord(JOURNAL), display = useDeviceRecord(JOURNAL_DISPLAY), today = localDate();
  return useMemo(() => !journal.loaded || journal.unreadable || !display.loaded ? null
    : {...journalToday(journal.data, today, {shown: onThisDayShown(display.data), hidden: display.data.hidden}), lines: journal.data.todayLines === true},
  [journal.loaded, journal.unreadable, journal.data, display.loaded, display.data, today]);
}
