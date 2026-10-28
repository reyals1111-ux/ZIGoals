import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AI (B3, J15; TIER 3 (stored format)): what a transfer in was — a staking reward, income or an airdrop — kept
 * beside the Portfolio, keyed by the transaction's id. Portfolio transactions are a strict schema in every released
 * build (a new kind or field there would make #37–#50 refuse the whole Portfolio), so the transaction stays a plain
 * "transfer in" and this device-only record, loose and versioned, names what it was (ADR-034 N27). The arithmetic is
 * unchanged: a priced reward adds its cost like any priced transfer in; an unpriced one leaves the cost unknown.
 */
export const RECEIPTS_KEY = 'zigoals:portfolio-receipts:v1';
export const RECEIPT_KINDS = ['reward', 'income', 'airdrop'] as const;
export type ReceiptKind = (typeof RECEIPT_KINDS)[number];
export const RECEIPT_LABEL: Record<ReceiptKind, string> = {reward: 'Staking reward', income: 'Income', airdrop: 'Airdrop'};
export const MAX_RECEIPTS = 20_000;
export const receiptsSchema = z.looseObject({version: z.literal(1), kinds: z.record(z.string().min(1).max(80), z.enum(RECEIPT_KINDS).or(z.string().max(20)))})
  .refine(r => Object.keys(r.kinds).length <= MAX_RECEIPTS, `Up to ${MAX_RECEIPTS} entries.`);
export type Receipts = z.infer<typeof receiptsSchema>;
export const emptyReceipts = (): Receipts => ({version: 1, kinds: {}});
export const RECEIPTS: DeviceRecordSpec<Receipts> = {key: RECEIPTS_KEY, schema: receiptsSchema, empty: emptyReceipts};
/** Names (or, with null, un-names) what one transfer in was. */
export function setReceipt(record: Receipts, transactionId: string, kind: ReceiptKind | null): Receipts {
  const kinds = {...record.kinds};
  if (kind) kinds[transactionId] = kind; else delete kinds[transactionId];
  return receiptsSchema.parse({...record, kinds});
}
/** The kind this build knows for a transaction, or null (a newer build's word is kept but not shown). */
export const receiptOf = (record: Receipts, transactionId: string): ReceiptKind | null => { const k = record.kinds[transactionId]; return (RECEIPT_KINDS as readonly string[]).includes(k ?? '') ? k as ReceiptKind : null; };
/** The quantity received per kind for one coin's transactions. */
export function receivedBy(record: Receipts, transactions: readonly {id: string; kind: string; quantity: string}[]): Partial<Record<ReceiptKind, number>> {
  const out: Partial<Record<ReceiptKind, number>> = {};
  for (const t of transactions) { const k = t.kind === 'transfer-in' ? receiptOf(record, t.id) : null; if (k) out[k] = (out[k] ?? 0) + Number(t.quantity); }
  return out;
}
