import {wordsOf} from '../mood-words/schema';
import {bookOf} from './books';
import type {Journal} from './schema';

/**
 * Session AV lane 2 (journal; LEDGER #177, Daylio's PDF export): the Journal section of the printable report ("Report for
 * a visit") — the entries in the report's dates, oldest first, as written, with their day, their journal (when not the
 * main one), their tags, and that day's feeling word and energy (1–5) from the person's own check-in. Private by
 * default: the report holds it only when the person ticks it (the builder's own switch, off on every open). At most
 * 120 entries; the rest are counted. Pure.
 */
export const MAX_JOURNAL_ROWS = 120;
export type JournalReportRow = {date: string; text: string; tags: string[]; journal: string | null; feeling: string | null; energy: number | null};
export type JournalReportSection = {rows: JournalReportRow[]; more: number; days: number};
export function journalReport(journal: Pick<Journal, 'entries' | 'journals'>, range: {from: string; to: string}, energy: {days: Readonly<Record<string, {energy: number}>>; words?: Readonly<Record<string, unknown>>} | null): JournalReportSection {
  const words = wordsOf(energy);
  const inRange = journal.entries.filter(e => e.date >= range.from && e.date <= range.to).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const rows = inRange.slice(0, MAX_JOURNAL_ROWS).map(e => ({date: e.date, text: e.text, tags: e.tags ?? [], journal: bookOf(journal, e)?.name ?? null, feeling: words[e.date]?.word ?? null, energy: energy?.days[e.date]?.energy ?? null}));
  return {rows, more: Math.max(0, inRange.length - MAX_JOURNAL_ROWS), days: new Set(inRange.map(e => e.date)).size};
}
export const hasJournalIn = (journal: Pick<Journal, 'entries'> | null, range: {from: string; to: string}) => !!journal?.entries.some(e => e.date >= range.from && e.date <= range.to);
