'use client';
import {useMemo} from 'react';
import {journalTrack} from '../../../lib/ai/local-answers/exact/day';
import type {Journal} from '../../../lib/journal/schema';
import {calendarOf, calendarWords, periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {formatNumber} from '../../../lib/visual-format';
import {AxCalendar} from '../cards/ax/calendar';
import {AxBody, AxHead, AxKey, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {JournalSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: maps): "Journal map" — a month of days with the days written lit, and the words
 * written in the period as a total. The days and the count of words are the exact layer's own (`journalTrack`: an
 * entry's day and its number of words); what was written is never read out or shown. The period is the question's
 * (`period`), else this month. Compact: the days written.
 */
export default function JournalMap({size, params}: AxProps) {
  return <JournalSource>{(journal, today) => <Month journal={journal} today={today} size={size} params={params}/>}</JournalSource>;
}
function Month({journal, today, size, params}: {journal: Journal; today: string} & AxProps) {
  const track = useMemo(() => journalTrack(journal.entries, today), [journal.entries, today]);
  const view = useMemo(() => calendarOf(track, widgetPeriod(params?.period, today, 'this-month'), today, 'done'), [track, params?.period, today]);
  const words = useMemo(() => calendarWords(view, track, 'done', today), [view, track, today]);
  const total = Math.round(view.tally.total), said = `${formatNumber(total)} ${total === 1 ? 'word' : 'words'}`, label = periodLabel(view.period, today);
  return <AxBody kind="journal-map" size={size}>
    <AxHead figure={words.figure} unit={words.unit} label={words.label} note={`${words.note} · ${said}`}/>
    {size !== 'S' && <AxCalendar view={view} lit="done" kind={track.kind}/>}
    {size === 'L' && <AxKey items={[['lit', 'A day you wrote'], ['today', 'Today']]}/>}
    <CardFoot source="Your journal" asOf={`${view.title} · ${label}`}/>
    <HoloTable caption={`Journal, ${label}`} rows={[...words.rows, ['Words written', said]]}/>
  </AxBody>;
}
