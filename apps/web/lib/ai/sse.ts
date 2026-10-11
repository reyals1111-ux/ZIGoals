import {AiError} from './errors';

/**
 * Line, server-sent-event and newline-delimited-JSON readers over a fetch body (ADR-012, Part 1). Plain `fetch` and
 * `ReadableStream`: no SDK. Chunks may split a line or a multi-byte character anywhere; the decoder and the buffer
 * carry the remainder. An aborted signal ends the read with an `aborted` AiError and cancels the body.
 * Session X-Local Part 5c: a stall watchdog. A stream that sends no byte for `stallMs` (60 s) is cancelled and ends the
 * read with a `stalled` AiError, so a provider that hangs mid-reply never holds the chat forever; the caller keeps
 * what arrived. The timer is plain `setTimeout`, armed per read.
 */
export const STALL_MS = 60_000;
export class Stalled extends AiError { constructor(ms: number) { super('stalled', `Your AI sent nothing for ${Math.round(ms / 1000)} seconds, so ZIGi stopped waiting.`); } }
async function* chunks(body: ReadableStream<Uint8Array>, signal?: AbortSignal, stallMs = STALL_MS): AsyncGenerator<string> {
  const reader = body.getReader(), decoder = new TextDecoder();
  const onAbort = () => { void reader.cancel().catch(() => undefined); };
  if (signal?.aborted) { onAbort(); throw new AiError('aborted', 'Stopped.'); }
  signal?.addEventListener('abort', onAbort, {once: true});
  let timer: ReturnType<typeof setTimeout> | null = null, stalled = false;
  // The rejection settles first, then the reader is cancelled (a cancel resolves the pending read as done, which must not win the race).
  const watchdog = () => new Promise<never>((_, reject) => { timer = setTimeout(() => { stalled = true; reject(new Stalled(stallMs)); void reader.cancel().catch(() => undefined); }, stallMs); });
  try {
    for (;;) {
      let next: ReadableStreamReadResult<Uint8Array>;
      try { next = await (stallMs > 0 ? Promise.race([reader.read(), watchdog()]) : reader.read()); }
      catch (error) { if (signal?.aborted) throw new AiError('aborted', 'Stopped.'); if (stalled) throw error instanceof Stalled ? error : new Stalled(stallMs); throw error; }
      finally { if (timer) { clearTimeout(timer); timer = null; } }
      if (signal?.aborted) throw new AiError('aborted', 'Stopped.');
      if (next.done) { const tail = decoder.decode(); if (tail) yield tail; return; }
      const text = decoder.decode(next.value, {stream: true});
      if (text) yield text;
    }
  } finally { signal?.removeEventListener('abort', onAbort); try { reader.releaseLock(); } catch { /* already released by cancel */ } }
}
/** Lines without their line break (`\n` or `\r\n`); the last line needs no break. */
export async function* lines(body: ReadableStream<Uint8Array>, signal?: AbortSignal, stallMs = STALL_MS): AsyncGenerator<string> {
  let buffer = '';
  for await (const chunk of chunks(body, signal, stallMs)) {
    buffer += chunk;
    let index = buffer.indexOf('\n');
    while (index >= 0) {
      const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
      yield line.endsWith('\r') ? line.slice(0, -1) : line;
      index = buffer.indexOf('\n');
    }
  }
  if (buffer) yield buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
}
export type SseEvent = {event: string | null; data: string};
/**
 * Server-sent events as the specification reads them: `data:` lines joined with a newline, an optional `event:` name,
 * dispatched at a blank line; comment lines (`: OPENROUTER PROCESSING`) and `id:`/`retry:` fields are ignored.
 */
export async function* sseEvents(body: ReadableStream<Uint8Array>, signal?: AbortSignal, stallMs = STALL_MS): AsyncGenerator<SseEvent> {
  let event: string | null = null, data: string[] = [];
  for await (const line of lines(body, signal, stallMs)) {
    if (line === '') { if (data.length) yield {event, data: data.join('\n')}; event = null; data = []; continue; }
    if (line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value; else if (field === 'data') data.push(value);
  }
  if (data.length) yield {event, data: data.join('\n')};
}
/** One JSON value per non-empty line (Ollama's native API). A line that is not JSON ends the read as `unreadable`. */
export async function* ndjson(body: ReadableStream<Uint8Array>, signal?: AbortSignal, stallMs = STALL_MS): AsyncGenerator<unknown> {
  for await (const line of lines(body, signal, stallMs)) {
    const text = line.trim();
    if (!text) continue;
    try { yield JSON.parse(text) as unknown; } catch { throw new AiError('unreadable', 'The server\'s answer could not be read.'); }
  }
}
/** Parses one SSE data payload; anything that is not JSON ends the read as `unreadable`. */
export function parseJson(data: string): unknown {
  try { return JSON.parse(data) as unknown; } catch { throw new AiError('unreadable', 'The provider\'s answer could not be read.'); }
}
