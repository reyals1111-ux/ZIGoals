import * as z from 'zod';
import type {AiSettings} from '../ai/settings';
import type {ChatEvent, ChatImage, ChatRequest} from '../ai/types';
import {extractJsonObject} from '../label-scan/read';
import {LAB_VALUE_MAX, NAME_MAX, UNIT_MAX} from './store';

/**
 * Session AK (BUILD list 2 #4): "Read my lab sheet from a photo" — the label-scan pattern (lib/label-scan): one request
 * through the person's own AI (their provider, model and key), the photo shrunk on the device and sent with this one
 * message only, never kept. The model's reply is data: parsed with zod, every number bounded, and what passes becomes an
 * editable draft the person checks row by row before anything is saved. The model is told to copy, never to interpret.
 */
export const MAX_SCAN_ROWS = 40;
export const LAB_SHEET_JSON_SCHEMA = {
  type: 'object',
  properties: {
    readable: {type: 'boolean', description: 'false when no lab results table can be read in the photo'},
    date: {type: ['string', 'null'], description: 'the sample or report date as YYYY-MM-DD, or null'},
    results: {type: 'array', maxItems: MAX_SCAN_ROWS, items: {type: 'object', properties: {
      name: {type: 'string'}, value: {type: 'number'}, unit: {type: ['string', 'null']},
      ref_low: {type: ['number', 'null']}, ref_high: {type: ['number', 'null']},
    }, required: ['name', 'value']}},
  },
  required: ['readable', 'results'],
} as const;
export const LAB_SHEET_SYSTEM = [
  'You copy numbers from a photo of a printed lab results sheet. You never interpret, judge, explain or advise, and you never add a range that is not printed.',
  'Reply with one JSON object and nothing else, following this JSON Schema:',
  JSON.stringify(LAB_SHEET_JSON_SCHEMA),
  'One result per printed row with a number: its name as printed, the value, the unit as printed, and the reference range only when the sheet prints one (ref_low and/or ref_high; null otherwise; "< 5.2" is ref_high 5.2).',
  'Skip a row whose value is text (such as "negative"). If no results can be read, reply {"readable": false, "results": []}.',
].join('\n');
export const LAB_SHEET_ASK = 'Copy the lab results in this photo.';

export function labSheetRequest({settings, key, image, appOrigin, signal}: {settings: Pick<AiSettings, 'provider' | 'model' | 'localServer' | 'baseUrl' | 'maxOutputTokens'>; key: string | null; image: ChatImage; appOrigin?: string; signal?: AbortSignal}): ChatRequest {
  if (!settings.provider || !settings.model) throw Error('No AI is connected.');
  return {
    provider: settings.provider, ...(settings.localServer ? {localServer: settings.localServer} : {}), model: settings.model,
    system: LAB_SHEET_SYSTEM, messages: [{role: 'user', content: LAB_SHEET_ASK, images: [image]}],
    maxOutputTokens: Math.min(settings.maxOutputTokens, 3000), think: false,
    format: LAB_SHEET_JSON_SCHEMA as unknown as Record<string, unknown>,
    key, ...(settings.baseUrl ? {baseUrl: settings.baseUrl} : {}), ...(appOrigin ? {appOrigin} : {}), ...(signal ? {signal} : {}),
  };
}

const num = z.preprocess(v => typeof v === 'string' && /^\s*\d{1,7}(?:[.,]\d{1,6})?\s*$/.test(v) ? Number(v.trim().replace(',', '.')) : v, z.number().finite().min(0).max(LAB_VALUE_MAX));
const row = z.object({name: z.string(), value: num, unit: z.string().nullable().optional(), ref_low: num.nullable().optional(), ref_high: num.nullable().optional()});
const reply = z.object({readable: z.boolean().optional(), date: z.string().nullable().optional(), results: z.array(z.unknown()).max(200).optional()});

export type DraftRow = {name: string; value: string; unit: string; refLow: string; refHigh: string};
export type SheetOutcome = {ok: true; date: string | null; rows: DraftRow[]; skipped: number} | {ok: false; problems: string[]};
const text = (n: number | null | undefined) => n === null || n === undefined ? '' : String(n);
const tidy = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Checks a model reply and turns it into draft rows (text the form shows), or names why it cannot be used. */
export function readLabSheetReply(replyText: string, today: string): SheetOutcome {
  const raw = extractJsonObject(replyText);
  if (raw === null) return {ok: false, problems: ['Your AI did not answer with the sheet’s numbers. Try again, or type them in.']};
  const parsed = reply.safeParse(raw);
  if (!parsed.success) return {ok: false, problems: ['Your AI’s answer was not in the expected shape. Try again, or type the values in.']};
  if (parsed.data.readable === false) return {ok: false, problems: ['Your AI could not find lab results in this photo. Try a sharper photo, straight on.']};
  const rows: DraftRow[] = []; let skipped = 0;
  for (const item of parsed.data.results ?? []) {
    const r = row.safeParse(item);
    const name = r.success ? tidy(r.data.name, NAME_MAX) : '';
    if (!r.success || !name || !/[\p{L}\p{N}]/u.test(name) || rows.length >= MAX_SCAN_ROWS) { skipped++; continue; }
    const lo = r.data.ref_low ?? null, hi = r.data.ref_high ?? null;
    // A range whose ends are the wrong way round cannot be right: it is left out, and the row stays for the person to complete.
    const swap = lo !== null && hi !== null && lo > hi;
    rows.push({name, value: text(r.data.value), unit: tidy(r.data.unit ?? '', UNIT_MAX), refLow: text(swap ? null : lo), refHigh: text(swap ? null : hi)});
  }
  if (!rows.length) return {ok: false, problems: ['No values with a number were read. Try a sharper photo, or type them in.']};
  const d = parsed.data.date ?? null, date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today && !Number.isNaN(Date.parse(`${d}T12:00:00Z`)) ? d : null;
  return {ok: true, date, rows, skipped};
}

export type SheetScanResult = SheetOutcome & {usage: {input: number | null; output: number | null} | null; requests: number};
/** Sends the request through `stream` (the app passes `streamChat`; tests pass a fake: no model is called in tests). */
export async function runLabSheetScan(request: ChatRequest, stream: (r: ChatRequest) => AsyncIterable<ChatEvent>, today: string): Promise<SheetScanResult> {
  let out = '', usage: SheetScanResult['usage'] = null, reason: string | null = null, requests = 0;
  for await (const event of stream(request)) {
    if (!requests) requests = 1;
    if (event.type === 'text') { out += event.delta; if (out.length > 60_000) break; }
    else if (event.type === 'usage') usage = {input: event.input, output: event.output};
    else if (event.type === 'done') reason = event.reason;
  }
  if (reason && /^(length|max_tokens|max_output_tokens|MAX_TOKENS)$/i.test(reason) && !out.includes('}')) return {ok: false, problems: ['The answer was cut off at your output cap (Settings → ZIGi · Your Personal AI Companion → Output cap).'], usage, requests};
  return {...readLabSheetReply(out, today), usage, requests};
}
