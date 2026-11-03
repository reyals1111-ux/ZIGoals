import type {AiSettings} from '../ai/settings';
import type {ChatEvent, ChatImage, ChatRequest} from '../ai/types';
import {LABEL_JSON_SCHEMA, readLabelReply, type LabelOutcome} from './read';

/**
 * Session AK (item 3): the one request a label photo makes, on the same path as a meal photo in ZIGi: the person's own
 * provider, model and key (lib/ai/chat.ts `streamChat`), the photo downscaled in the browser (lib/ai/photo.ts) and sent with
 * this one message only. ZIGoals keeps neither the photo nor the reply; the reply is checked by `readLabelReply`.
 * No page records, notes or history go with it: only the photo and the instructions below.
 */
export const LABEL_SYSTEM = [
  'You read the nutrition facts table in a photo of a food package. You never estimate: copy only numbers that are printed and readable.',
  'Reply with one JSON object and nothing else, following this JSON Schema:',
  JSON.stringify(LABEL_JSON_SCHEMA),
  'basis: "per-100g" or "per-100ml" when you copy that column, else "per-serving" (then give serving_size). Prefer the per 100 g / 100 mL column when the label has one.',
  'Numbers as printed in that column (a "<0.5 g" is 0.5; "trace" is 0). Use null for anything not printed or not readable. vitamins_minerals: each vitamin or mineral listed, with its unit as printed (g, mg, µg or %).',
  'If no nutrition table can be read, reply {"readable": false, "basis": null}.',
].join('\n');
export const LABEL_ASK = 'Read the nutrition label in this photo.';

/** The request for one label photo, from the person's AI settings and key (read for this call only). */
export function labelScanRequest({settings, key, image, appOrigin, signal}: {settings: Pick<AiSettings, 'provider' | 'model' | 'localServer' | 'baseUrl' | 'maxOutputTokens'>; key: string | null; image: ChatImage; appOrigin?: string; signal?: AbortSignal}): ChatRequest {
  if (!settings.provider || !settings.model) throw Error('No AI is connected.');
  return {
    provider: settings.provider, ...(settings.localServer ? {localServer: settings.localServer} : {}), model: settings.model,
    system: LABEL_SYSTEM, messages: [{role: 'user', content: LABEL_ASK, images: [image]}],
    // The person's own output cap (spend protection) stands; a label's JSON needs well under 1,000 tokens.
    maxOutputTokens: Math.min(settings.maxOutputTokens, 1500), think: false,
    // Ollama enforces the schema itself; the other wires read it from the instructions.
    format: LABEL_JSON_SCHEMA as unknown as Record<string, unknown>,
    key, ...(settings.baseUrl ? {baseUrl: settings.baseUrl} : {}), ...(appOrigin ? {appOrigin} : {}), ...(signal ? {signal} : {}),
  };
}

export type LabelScanResult = LabelOutcome & {usage: {input: number | null; output: number | null} | null; reason: string | null; requests: number};
/** Sends the request through `stream` (the app passes `streamChat`; tests pass a fake: no model is ever called in tests). */
export async function runLabelScan(request: ChatRequest, stream: (r: ChatRequest) => AsyncIterable<ChatEvent>): Promise<LabelScanResult> {
  let text = '', usage: LabelScanResult['usage'] = null, reason: string | null = null, requests = 0;
  for await (const event of stream(request)) {
    if (!requests) requests = 1;
    if (event.type === 'text') { text += event.delta; if (text.length > 40_000) break; }
    else if (event.type === 'usage') usage = {input: event.input, output: event.output};
    else if (event.type === 'done') reason = event.reason;
  }
  if (reason && /^(length|max_tokens|max_output_tokens|MAX_TOKENS)$/i.test(reason) && !text.includes('}')) return {ok: false, problems: ['The answer was cut off at your output cap (Settings → ZIGi · Your Personal AI Companion → Output cap).'], usage, reason, requests};
  return {...readLabelReply(text), usage, reason, requests};
}
