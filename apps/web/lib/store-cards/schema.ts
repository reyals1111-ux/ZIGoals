import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {STORE_CARDS_KEY_LITERAL} from '../av2-money-r2-keys';

/**
 * Session AV lane 2, round 2 (money; Wallet's loyalty and club cards), TIER 3 (stored format): a NEW device-only record,
 * loose and versioned: store and club cards, each a name and the number on the card, shown as the barcode the card uses
 * (EAN-13, EAN-8, UPC-A, Code 128) or a QR code. At most 50. Not synced; in Export everything, the restore and the
 * account erase (lib/av2-money-r2-keys.ts). Nothing is sent anywhere: the bars are drawn on this device.
 */
export const STORE_CARDS_KEY = STORE_CARDS_KEY_LITERAL;
export const MAX_CARDS = 50;
export const CARD_FORMATS = ['ean13', 'ean8', 'upca', 'code128', 'qr'] as const;
export type CardFormat = typeof CARD_FORMATS[number];
export const storeCardSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  name: z.string().trim().min(1).max(40),
  /** The number as printed (printable ASCII, at most 80 characters). */
  number: z.string().regex(/^[\x20-\x7e]{1,80}$/),
  format: z.enum(CARD_FORMATS),
  note: z.string().trim().max(80).optional().catch(undefined),
  addedAt: z.iso.datetime({offset: true}),
});
export const storeCardsSchema = z.looseObject({version: z.literal(1), cards: z.array(storeCardSchema).max(MAX_CARDS)});
export type StoreCard = z.infer<typeof storeCardSchema>;
export type StoreCards = z.infer<typeof storeCardsSchema>;
export const emptyStoreCards = (): StoreCards => ({version: 1, cards: []});
export const STORE_CARDS: DeviceRecordSpec<StoreCards> = {key: STORE_CARDS_KEY, schema: storeCardsSchema, empty: emptyStoreCards};
