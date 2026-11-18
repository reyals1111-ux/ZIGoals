'use client';
import {useMemo} from 'react';
import {journalTrack} from '../../../lib/ai/local-answers/exact/day';
import type {Journal} from '../../../lib/journal/schema';
import {trackStreak} from '../../../lib/nova/cards/ax/day-streaks';
import {StreakBody} from '../cards/ax/day-streak-body';
import type {AxProps} from '../cards/ax/kit';
import {JournalSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: flames): "Writing streak" — the days in a row with a journal entry and the longest
 * run of the last year, as two flames (the exact layer's own count: lib/ai/local-answers/exact/day.ts `journalTrack`).
 * Only each entry's day is read: what was written stays on the Journal page.
 */
export default function JournalStreak({size}: AxProps) {
  return <JournalSource>{(journal, today) => <Run journal={journal} today={today} size={size}/>}</JournalSource>;
}
function Run({journal, today, size}: {journal: Journal; today: string; size: AxProps['size']}) {
  const view = useMemo(() => trackStreak(journalTrack(journal.entries.map(e => ({date: e.date})), today), today), [journal.entries, today]);
  return <StreakBody kind="journal-streak" size={size} view={view} did="written" what="an entry" source="Your journal" today={today}/>;
}
