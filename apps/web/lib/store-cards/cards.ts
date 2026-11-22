import {encodeBars} from './barcode';
import {MAX_CARDS, storeCardsSchema, type CardFormat, type StoreCard, type StoreCards} from './schema';

/**
 * Session AV lane 2, round 2 (money; Wallet's loyalty and club cards): the store cards record, pure. A card's number is
 * checked against its format before it is kept (a 12-digit EAN-13 gets its check digit), so every kept card can be drawn.
 * Adding a card to Apple or Google Wallet is native-only (LEDGER #254, Carried part).
 */
export type CardInput = {name: string; number: string; format: CardFormat; note?: string};
export function cardIssue(input: CardInput): string | null {
  if (!input.name.trim()) return 'Give the card a name, for example the shop.';
  if (input.name.trim().length > 40) return 'A name has at most 40 characters.';
  const number = input.number.trim();
  if (!number) return 'Type the number on the card, or read it from a photo.';
  if (!/^[\x20-\x7e]{1,80}$/.test(number)) return 'The number uses letters, digits and common signs only, at most 80.';
  if (input.format !== 'qr') { const bars = encodeBars(number, input.format); if (!bars.ok) return bars.problem; }
  return null;
}
const keptNumber = (input: CardInput) => { if (input.format === 'qr') return input.number.trim(); const bars = encodeBars(input.number.trim(), input.format); return bars.ok ? bars.bars.text : input.number.trim(); };
export function addCard(record: StoreCards, input: CardInput, id: string, now: string): StoreCards {
  const issue = cardIssue(input); if (issue) throw new Error(issue);
  if (record.cards.length >= MAX_CARDS) throw new Error(`Up to ${MAX_CARDS} cards.`);
  const card: StoreCard = {id, name: input.name.trim().replace(/\s+/g, ' '), number: keptNumber(input), format: input.format, ...(input.note?.trim() ? {note: input.note.trim().slice(0, 80)} : {}), addedAt: now};
  return storeCardsSchema.parse({...record, cards: [...record.cards, card]});
}
export function renameCard(record: StoreCards, id: string, name: string): StoreCards {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean || clean.length > 40) throw new Error('A name of 1 to 40 characters.');
  return storeCardsSchema.parse({...record, cards: record.cards.map(c => c.id === id ? {...c, name: clean} : c)});
}
export const removeCard = (record: StoreCards, id: string): StoreCards => ({...record, cards: record.cards.filter(c => c.id !== id)});
export const FORMAT_WORDS: Record<CardFormat, string> = {ean13: 'EAN-13 (13 digits)', ean8: 'EAN-8 (8 digits)', upca: 'UPC-A (12 digits)', code128: 'Code 128 (letters and digits)', qr: 'QR code'};
