import * as z from 'zod';
import type {DeviceRecordSpec} from './device-record';
import {ZIGI_CARDS_KEY} from './z-device-keys';

/**
 * What became of ZIGi's cards (Session Z-Cloud Gate C, the persona round; `[TIER 3] (storage)`, ADR-019 C50). A card's
 * outcome lived only in the open panel, so a chat reopened from History, popped out or reloaded offered an added card
 * again and "Add all" wrote it twice. Each reply's cards now keep their outcome here: added, added by ZIGi (auto-accept),
 * opened, dismissed, undone or replaced, and whether the person edited the card first. No words, no amounts: the chat
 * turn's id, the card's place in the reply ("p1"…) and the outcome. Device-only through `getAppStorage()`, never synced,
 * in "Export everything". Loose (a later build's fields and outcomes survive and an unknown outcome reads as none) and
 * capped at the 300 most recent replies. Builds #32–#35 never read it: an unknown key is ignored there.
 */
export const CARD_OUTCOMES = ['added', 'auto', 'opened', 'dismissed', 'undone', 'replaced'] as const;
export type CardOutcome = typeof CARD_OUTCOMES[number];
export const MAX_REPLIES = 300;
const stamp = z.number().int().min(0).max(8_640_000_000_000_000);
const cardSchema = z.looseObject({outcome: z.string().min(1).max(20), edited: z.boolean().optional()});
const replySchema = z.looseObject({at: stamp, cards: z.record(z.string().regex(/^p\d{1,3}$/), cardSchema)});
export const cardsSchema = z.looseObject({
  version: z.literal(1),
  replies: z.record(z.string().min(1).max(200), replySchema).refine(r => Object.keys(r).length <= MAX_REPLIES).optional(),
});
export type CardsRecord = z.infer<typeof cardsSchema>;
export const ZIGI_CARDS: DeviceRecordSpec<CardsRecord> = {key: ZIGI_CARDS_KEY, schema: cardsSchema, empty: () => ({version: 1})};
export type KeptCard = {outcome: CardOutcome; edited: boolean};
const known = (value: string): value is CardOutcome => (CARD_OUTCOMES as readonly string[]).includes(value);

/** The kept outcomes of one reply's cards, by card id; an outcome this build does not know reads as none. */
export function keptCards(record: CardsRecord, replyId: string): ReadonlyMap<string, KeptCard> {
  const out = new Map<string, KeptCard>();
  for (const [id, card] of Object.entries(record.replies?.[replyId]?.cards ?? {})) if (known(card.outcome)) out.set(id, {outcome: card.outcome, edited: card.edited === true});
  return out;
}
/**
 * Keeps the outcomes of one reply's cards (the ones given replace what was kept for them); the oldest replies are dropped
 * beyond 300. Returns the same record when nothing changes, so nothing is written.
 */
export function keepCards(record: CardsRecord, replyId: string, cards: ReadonlyMap<string, KeptCard>, now: number): CardsRecord {
  if (!replyId || replyId.length > 200 || cards.size === 0) return record;
  const before = record.replies?.[replyId]?.cards ?? {}, merged: Record<string, {outcome: string; edited?: boolean}> = {...before};
  let changed = false;
  for (const [id, card] of cards) {
    if (!/^p\d{1,3}$/.test(id)) continue;
    const next = card.edited ? {outcome: card.outcome, edited: true} : {outcome: card.outcome};
    if (before[id]?.outcome === next.outcome && (before[id]?.edited === true) === card.edited) continue;
    merged[id] = next; changed = true;
  }
  if (!changed) return record;
  const replies = {...record.replies, [replyId]: {at: now, cards: merged}};
  const ids = Object.keys(replies);
  if (ids.length > MAX_REPLIES) for (const id of ids.sort((a, b) => replies[a]!.at - replies[b]!.at).slice(0, ids.length - MAX_REPLIES)) delete replies[id];
  return {...record, replies};
}
