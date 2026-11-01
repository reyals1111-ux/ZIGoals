import type {AiSettings} from '../ai/settings';
import type {ChatEvent, ChatImage, ChatRequest} from '../ai/types';
import {extractJsonObject} from '../label-scan/read';

/**
 * Session AK (BUILD list 2 #10): an optional draft of a money entry (amount, date, payee) from a receipt photo, through
 * the person's own AI key, the label-scan pattern (lib/label-scan/request.ts): the photo is shrunk on the device and
 * sent with this one request only, with no page records, notes or history; ZIGoals keeps neither the photo (unless the
 * person keeps it on an entry) nor the reply. The reply is read as data, never as instructions: only these four fields
 * are taken, each checked, and the result is an editable draft in the Spending form; nothing is saved until the person
 * taps Save. Unknown stays empty, never zero.
 */
export const RECEIPT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    readable: {type: 'boolean'},
    total: {type: ['number', 'string', 'null']},
    currency: {type: ['string', 'null']},
    date: {type: ['string', 'null']},
    payee: {type: ['string', 'null']},
  },
  required: ['readable', 'total', 'date', 'payee'],
} as const;
export const RECEIPT_SYSTEM = [
  'You read a photo of a shop receipt or an invoice. You never estimate: copy only what is printed and readable.',
  'Reply with one JSON object and nothing else, following this JSON Schema:',
  JSON.stringify(RECEIPT_JSON_SCHEMA),
  'total: the amount paid in total, as printed (a number). currency: its ISO 4217 code (EUR, USD, GBP…) or null. date: the purchase date as YYYY-MM-DD, or null. payee: the shop or company name, or null.',
  'If no receipt can be read, reply {"readable": false, "total": null, "date": null, "payee": null}.',
].join('\n');
export const RECEIPT_ASK = 'Read the total, date and shop on this receipt.';
export type ReceiptDraft = {amount: string | null; currency: string | null; date: string | null; payee: string | null};
export type ReceiptOutcome = {ok: true; draft: ReceiptDraft; notes: string[]} | {ok: false; problems: string[]};

/** "12,50", "€ 1.234,50", 12.5 → "12.50"; null when it is not a plain amount above zero and at most a billion. */
export function readTotal(value: unknown): string | null {
  let text: string;
  if (typeof value === 'number') { if (!Number.isFinite(value)) return null; text = value.toFixed(2); }
  else if (typeof value === 'string') {
    text = value.replace(/[^\d.,]/g, '');
    const m = /^(\d{1,3}(?:[.,  ]\d{3})*|\d+)(?:[.,](\d{1,2}))?$/.exec(text);
    if (!m) return null;
    // "12.345" could be twelve thousand or twelve: never guessed.
    if (m[2] === undefined && (m[1]!.match(/[.,  ]/g) ?? []).length === 1) return null;
    text =`${m[1]!.replace(/[.,  ]/g, '')}.${(m[2] ?? '').padEnd(2, '0')}`;
  } else return null;
  const [whole = '', frac = ''] = text.split('.');
  if (!/^\d{1,10}$/.test(whole)) return null;
  const cents = BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2));
  if (cents <= 0n || cents > 100_000_000_000n) return null;
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

/** The checked draft from the model's reply; `today` keeps a date in the future out. */
export function readReceiptReply(text: string, today: string): ReceiptOutcome {
  const raw = extractJsonObject(text);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {ok: false, problems: ['The answer could not be read. Try again, or type the entry yourself.']};
  const o = raw as Record<string, unknown>;
  if (o.readable === false) return {ok: false, problems: ['No receipt could be read in this photo. Try a sharper photo, or type the entry yourself.']};
  const notes: string[] = [];
  const amount = readTotal(o.total);
  if (o.total != null && !amount) notes.push('The total could not be read as an amount; enter it yourself.');
  const currency = typeof o.currency === 'string' && /^[A-Z]{3}$/.test(o.currency.trim().toUpperCase()) ? o.currency.trim().toUpperCase() : null;
  let date = typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date.trim()) && !Number.isNaN(Date.parse(`${o.date.trim()}T00:00:00Z`)) ? o.date.trim() : null;
  if (date && date > today) { notes.push('The date on the receipt is after today, so it was left out.'); date = null; }
  // A name only: letters, numbers and ordinary signs; no line breaks or control characters; at most 80 characters.
  const payee = typeof o.payee === 'string' ? o.payee.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || null : null;
  if (!amount && !date && !payee) return {ok: false, problems: ['Nothing could be read from this receipt. Type the entry yourself.']};
  return {ok: true, draft: {amount, currency, date, payee}, notes};
}

/** The one request for a receipt photo, from the person's AI settings and key (read for this call only). */
export function receiptRequest({settings, key, image, appOrigin, signal}: {settings: Pick<AiSettings, 'provider' | 'model' | 'localServer' | 'baseUrl' | 'maxOutputTokens'>; key: string | null; image: ChatImage; appOrigin?: string; signal?: AbortSignal}): ChatRequest {
  if (!settings.provider || !settings.model) throw Error('No AI is connected.');
  return {
    provider: settings.provider, ...(settings.localServer ? {localServer: settings.localServer} : {}), model: settings.model,
    system: RECEIPT_SYSTEM, messages: [{role: 'user', content: RECEIPT_ASK, images: [image]}],
    maxOutputTokens: Math.min(settings.maxOutputTokens, 600), think: false,
    format: RECEIPT_JSON_SCHEMA as unknown as Record<string, unknown>,
    key, ...(settings.baseUrl ? {baseUrl: settings.baseUrl} : {}), ...(appOrigin ? {appOrigin} : {}), ...(signal ? {signal} : {}),
  };
}

export type ReceiptReadResult = ReceiptOutcome & {usage: {input: number | null; output: number | null} | null; requests: number};
/** Sends the request through `stream` (the app passes `streamChat`; tests pass a fake: no model is called in tests). */
export async function runReceiptRead(request: ChatRequest, stream: (r: ChatRequest) => AsyncIterable<ChatEvent>, today: string): Promise<ReceiptReadResult> {
  let text = '', usage: ReceiptReadResult['usage'] = null, requests = 0;
  for await (const event of stream(request)) {
    if (!requests) requests = 1;
    if (event.type === 'text') { text += event.delta; if (text.length > 20_000) break; }
    else if (event.type === 'usage') usage = {input: event.input, output: event.output};
  }
  return {...readReceiptReply(text, today), usage, requests};
}
