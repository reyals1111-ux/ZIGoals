import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {addLocalDays} from '../local-date';
import {type Note} from './schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #365, Logseq's flashcards; TIER 3 (stored format), a NEW device-only key). A line
 * of a note written "question :: answer" (a space on each side of the ::), or a line tagged #card with its answer on the
 * indented lines under it, is a card. "Review cards" shows the cards due one at a time: the question, then the answer
 * when asked, rated Again, Hard, Good or Easy; the next review day comes from a small schedule written here (in the way
 * of SM-2: the gap grows with each good answer, by an ease that falls a little with Again and Hard and rises with Easy;
 * no package, no model). Only the review days are stored, in `zigoals:note-cards:v1` (loose and versioned, at most 2000
 * cards; on this device only, never synced). The cards themselves live in the notes' words, so they follow every edit.
 * A card from a locked or archived note, or one in Recently deleted, is never shown. Plain words: no streak, no score,
 * nothing missed; stopping at any time is fine. Pure, apart from the record spec.
 */
export const NOTE_CARDS_KEY = 'zigoals:note-cards:v1';
export const MAX_CARD_REVIEWS = 2000, NEW_CARDS_A_DAY = 20, MAX_INTERVAL = 365, CARD_TEXT_MAX = 300;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const cardReviewSchema = z.looseObject({
  id: z.string().regex(/^c-[a-z0-9]{3,20}$/),
  /** The day it is next shown. */
  due: day,
  /** Days between the last review and `due`. */
  interval: z.number().int().min(0).max(MAX_INTERVAL),
  ease: z.number().min(1.3).max(3.5),
  reps: z.number().int().min(0).max(10_000),
  lapses: z.number().int().min(0).max(10_000).optional().catch(undefined),
  /** The day of the last review, and the day it was first reviewed (for the new cards a day). */
  last: day,
  first: day.optional().catch(undefined),
});
export type CardReview = z.infer<typeof cardReviewSchema>;
export const noteCardsSchema = z.looseObject({
  version: z.literal(1),
  reviews: z.preprocess(v => Array.isArray(v) ? v.filter(x => cardReviewSchema.safeParse(x).success).slice(-MAX_CARD_REVIEWS) : [], z.array(cardReviewSchema).max(MAX_CARD_REVIEWS)),
});
export type NoteCards = z.infer<typeof noteCardsSchema>;
export const emptyNoteCards = (): NoteCards => ({version: 1, reviews: []});
export const NOTE_CARDS: DeviceRecordSpec<NoteCards> = {key: NOTE_CARDS_KEY, schema: noteCardsSchema, empty: emptyNoteCards};

export type Card = {id: string; noteId: string; noteName: string; question: string; answer: string};
/** A short, stable id from the note and the question's words (the answer may change; the card stays). */
export function cardId(noteId: string, question: string): string {
  const text = `${noteId}\n${question.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()}`;
  let a = 0x811c9dc5, b = 0x01000193;
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = Math.imul(b ^ c, 2246822519) >>> 0; }
  return `c-${a.toString(36)}${b.toString(36)}`.slice(0, 22);
}
const clip = (s: string) => s.length > CARD_TEXT_MAX ? `${s.slice(0, CARD_TEXT_MAX - 1)}…` : s;
const INLINE = /^\s*(?:[-*+]\s+|\d+[.)]\s+)?(?:\[[ xX]\]\s+)?(.+?)\s+::\s+(.+?)\s*$/;
const TAGGED = /(^|\s)#card(?=$|[\s.,;:!?)])/i;
const indent = (l: string) => /^\s*/.exec(l)![0].replace(/\t/g, '  ').length;
const bare = (l: string) => l.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)?(?:\[[ xX]\]\s+)?/, '').trim();
/** The cards a note's words hold, in order (outside fenced code). */
export function cardsOfNote(note: Pick<Note, 'id' | 'body'> & {name: string}): Card[] {
  const lines = note.body.split('\n'), out: Card[] = [], seen = new Set<string>();
  let fence: string | null = null;
  const push = (q: string, a: string) => { const question = clip(q.trim()), answer = clip(a.trim()); if (!question || !answer) return; const id = cardId(note.id, question); if (seen.has(id)) return; seen.add(id); out.push({id, noteId: note.id, noteName: note.name, question, answer}); };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!, f = /^\s*(```|~~~)/.exec(line);
    if (f) { fence = fence === null ? f[1]! : fence === f[1] ? null : fence; continue; }
    if (fence !== null || !line.trim()) continue;
    if (TAGGED.test(line)) {
      const question = bare(line).replace(TAGGED, '$1').replace(/\s+/g, ' ').trim(), own = indent(line), answer: string[] = [];
      for (let j = i + 1; j < lines.length && lines[j]!.trim() && indent(lines[j]!) > own; j++) answer.push(bare(lines[j]!));
      if (!answer.length) { const m = INLINE.exec(question); if (m) push(m[1]!, m[2]!); continue; }
      push(question, answer.join('\n'));
      i += answer.length;
      continue;
    }
    const m = INLINE.exec(line);
    if (m && !/^#{1,6}\s/.test(line.trim())) push(m[1]!, m[2]!);
  }
  return out;
}
/** Every card of the notes that may be shown (never a locked or archived note, never an inbox capture). */
export function allCards(notes: readonly Note[]): Card[] {
  return notes.filter(n => !n.locked && !n.archived && n.kind !== 'inbox' && /::|#card/i.test(n.body))
    .flatMap(n => cardsOfNote({id: n.id, body: n.body, name: n.kind === 'daily' && n.day ? n.day : n.title.trim() || 'Untitled note'}));
}
export const RATINGS = ['again', 'hard', 'good', 'easy'] as const;
export type Rating = (typeof RATINGS)[number];
/** The next review of a card after a rating, given today. */
export function schedule(prev: CardReview | undefined, id: string, rating: Rating, today: string): CardReview {
  const reps = prev?.reps ?? 0, ease = prev?.ease ?? 2.5, interval = prev?.interval ?? 0;
  let next: number, nextEase = ease, nextReps = reps + 1, lapses = prev?.lapses ?? 0;
  switch (rating) {
    case 'again': next = 1; nextEase = ease - 0.2; nextReps = 0; lapses += prev ? 1 : 0; break;
    case 'hard': next = reps === 0 ? 1 : Math.max(interval + 1, Math.round(interval * 1.2)); nextEase = ease - 0.15; break;
    case 'good': next = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(interval + 1, Math.round(interval * ease)); break;
    case 'easy': next = reps === 0 ? 4 : Math.max(interval + 2, Math.round(interval * ease * 1.3)); nextEase = ease + 0.15; break;
  }
  const capped = Math.min(MAX_INTERVAL, next);
  return {id, due: addLocalDays(today, capped), interval: capped, ease: Math.round(Math.min(3.5, Math.max(1.3, nextEase)) * 100) / 100, reps: nextReps, ...(lapses ? {lapses} : {}), last: today, first: prev?.first ?? today};
}
/** The cards to look at today: those due (the longest waiting first), then new ones, at most 20 new a day. */
export function dueToday(cards: readonly Card[], record: NoteCards, today: string): {due: Card[]; later: number; next: string | null} {
  const by = new Map(record.reviews.map(r => [r.id, r]));
  const newToday = record.reviews.filter(r => r.first === today).length;
  const old = cards.filter(c => { const r = by.get(c.id); return r && r.due <= today; }).sort((a, b) => by.get(a.id)!.due.localeCompare(by.get(b.id)!.due));
  const fresh = cards.filter(c => !by.has(c.id)).slice(0, Math.max(0, NEW_CARDS_A_DAY - newToday));
  const waiting = cards.filter(c => { const r = by.get(c.id); return r && r.due > today; }).map(c => by.get(c.id)!.due).sort();
  return {due: [...old, ...fresh], later: waiting.length + cards.filter(c => !by.has(c.id)).length - fresh.length, next: waiting[0] ?? null};
}
/** The record with one review written (the oldest go first past the cap). */
export function rateCard(record: NoteCards, id: string, rating: Rating, today: string): NoteCards {
  const prev = record.reviews.find(r => r.id === id), next = schedule(prev, id, rating, today);
  return noteCardsSchema.parse({...record, reviews: [...record.reviews.filter(r => r.id !== id), next].slice(-MAX_CARD_REVIEWS)});
}
/** The days a rating would give, for the buttons ("Good · in 3 days"). */
export const daysFor = (prev: CardReview | undefined, rating: Rating, today: string) => schedule(prev, 'c-preview0', rating, today).interval;
