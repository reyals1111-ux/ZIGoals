import {NOTE_KINDS, type NoteKind, type Notes} from '../../../notes/schema';
import {calendarDay} from '../../../visual-format';

/**
 * Session AS (ADR-042 Part 2, family: maps): notes as a constellation — a star for a note, grouped by its kind (inbox:
 * captures waiting to be filed; daily: a day's own note; topic: a note with a title of its own). Counts and the newest
 * note's day only: a note's title and text are never read here. A star's place is fixed by its number in its group (a
 * sunflower spiral), so the drawing is the same on every render.
 */
export type Star = {/** In a 100 × 100 box. */ x: number; y: number; r: number};
export type StarGroup = {kind: NoteKind; label: string; count: number; stars: Star[]; /** Notes of this kind beyond the stars drawn. */ more: number};
export type Constellation = {total: number; groups: StarGroup[]; /** The day the newest note was made (in `zone`). */ newest: string | null};
export const STAR_CAP = 24;
const LABEL: Record<NoteKind, string> = {inbox: 'Inbox', daily: 'Daily', topic: 'Topic'};
const round = (n: number) => Math.round(n * 10) / 10;
export function starPlaces(count: number): Star[] {
  const n = Math.min(STAR_CAP, Math.max(0, Math.floor(count)));
  return Array.from({length: n}, (_, i) => {
    const angle = i * 2.39996323, radius = n === 1 ? 0 : 10 + Math.sqrt((i + 0.5) / n) * 30;
    return {x: round(50 + Math.cos(angle) * radius), y: round(50 + Math.sin(angle) * radius), r: [3.4, 2.4, 2.9][i % 3]!};
  });
}
export function notesConstellation(record: Pick<Notes, 'notes'>, zone?: string): Constellation {
  const groups = NOTE_KINDS.map((kind): StarGroup => {
    const count = record.notes.filter(n => n.kind === kind).length, stars = starPlaces(count);
    return {kind, label: LABEL[kind], count, stars, more: count - stars.length};
  });
  const newest = record.notes.map(n => n.createdAt).sort().at(-1);
  return {total: record.notes.length, groups, newest: newest ? calendarDay(newest, zone) : null};
}
