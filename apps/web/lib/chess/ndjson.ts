/**
 * Session AK (lane C): Lichess's streams are newline-delimited JSON over a long fetch() (the event stream sends an empty
 * line every 7 seconds to keep it open). This reader takes the bytes as they come, in any chunking, and hands on one JSON
 * object per line. It is strict: a line must be a JSON object; a line longer than the cap ends the stream (nothing is
 * kept growing); a few malformed lines are skipped and counted, more than the cap end the stream.
 * `followNdjson` keeps a stream open: it reconnects with a back-off after a drop, waits a minute after a 429, stops on
 * 401 (the connection was revoked), and stops for good when its signal is aborted or `reconnect` says the stream is done.
 */
export class NdjsonError extends Error {
  constructor(readonly kind: 'line-too-long' | 'too-many-bad-lines', message: string) { super(message); this.name = 'NdjsonError'; }
}
export type JsonObject = Record<string, unknown>;
export const MAX_LINE_CHARS = 64 * 1024, MAX_BAD_LINES = 5;
/** One line as a JSON object, or null when it is not one (not JSON, an array, a number, null…). */
export function parseJsonObject(line: string): JsonObject | null {
  let value: unknown;
  try { value = JSON.parse(line); } catch { return null; }
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}
export type NdjsonOptions = {maxLineChars?: number; maxBadLines?: number; onKeepAlive?: () => void; onBadLine?: (line: string) => void};
export async function readNdjson(body: ReadableStream<Uint8Array>, onValue: (value: JsonObject) => void, options: NdjsonOptions = {}): Promise<void> {
  const maxLine = options.maxLineChars ?? MAX_LINE_CHARS, maxBad = options.maxBadLines ?? MAX_BAD_LINES;
  const reader = body.getReader(), decoder = new TextDecoder('utf-8');
  let buffer = '', bad = 0;
  const line = (raw: string) => {
    const text = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (!text.trim()) { options.onKeepAlive?.(); return; }
    if (text.length > maxLine) throw new NdjsonError('line-too-long', 'Lichess sent a line too long to read.');
    const value = parseJsonObject(text);
    if (value) { onValue(value); return; }
    bad++; options.onBadLine?.(text.slice(0, 200));
    if (bad > maxBad) throw new NdjsonError('too-many-bad-lines', 'Lichess sent lines this page cannot read.');
  };
  try {
    for (;;) {
      const {done, value} = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, {stream: true});
      let cut: number;
      while ((cut = buffer.indexOf('\n')) >= 0) { const raw = buffer.slice(0, cut); buffer = buffer.slice(cut + 1); line(raw); }
      if (buffer.length > maxLine) throw new NdjsonError('line-too-long', 'Lichess sent a line too long to read.');
      if (done) break;
    }
    if (buffer) line(buffer);
  } catch (error) {
    try { await reader.cancel(); } catch { /* already closed */ }
    throw error;
  } finally {
    try { reader.releaseLock(); } catch { /* still reading elsewhere */ }
  }
}

export type StreamStatus =
  | {state: 'connecting'}
  | {state: 'open'}
  | {state: 'waiting'; retryInMs: number; reason: 'dropped' | 'busy' | 'error'}
  | {state: 'ended'}
  | {state: 'unauthorized'}
  | {state: 'gone'};
export const BACKOFF_MS = [1000, 2000, 5000, 10_000, 30_000, 60_000] as const, BUSY_WAIT_MS = 60_000;
export type Sleep = (ms: number, signal: AbortSignal) => Promise<void>;
export const sleep: Sleep = (ms, signal) => new Promise(resolve => {
  if (signal.aborted) { resolve(); return; }
  const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
  const timer = setTimeout(done, ms);
  signal.addEventListener('abort', done, {once: true});
});
export type FollowOptions = {
  url: string; token: string; signal: AbortSignal; onValue: (value: JsonObject) => void;
  onStatus?: (status: StreamStatus) => void; fetcher?: typeof fetch; wait?: Sleep; backoffMs?: readonly number[];
  /** Asked after the server closed the stream cleanly: false ends following (a finished game's stream). */
  reconnect?: () => boolean;
  /** With keep-alive lines expected, a stream silent this long is treated as dropped. */
  idleMs?: number;
};
export async function followNdjson(o: FollowOptions): Promise<void> {
  const fetcher = o.fetcher ?? fetch, wait = o.wait ?? sleep, backoff = o.backoffMs ?? BACKOFF_MS;
  let attempt = 0;
  const pause = async (reason: 'dropped' | 'busy' | 'error', ms?: number) => {
    const retryInMs = ms ?? backoff[Math.min(attempt, backoff.length - 1)]!;
    attempt++;
    o.onStatus?.({state: 'waiting', retryInMs, reason});
    await wait(retryInMs, o.signal);
  };
  while (!o.signal.aborted) {
    o.onStatus?.({state: 'connecting'});
    const inner = new AbortController(), stop = () => inner.abort();
    o.signal.addEventListener('abort', stop, {once: true});
    let idle: ReturnType<typeof setTimeout> | undefined;
    const alive = () => { if (!o.idleMs) return; clearTimeout(idle); idle = setTimeout(() => inner.abort(), o.idleMs); };
    try {
      let response: Response;
      try {
        response = await fetcher(o.url, {method: 'GET', headers: {Authorization: `Bearer ${o.token}`, Accept: 'application/x-ndjson'}, signal: inner.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', mode: 'cors'});
      } catch {
        if (o.signal.aborted) return;
        await pause('error'); continue;
      }
      if (response.status === 401 || response.status === 403) { o.onStatus?.({state: 'unauthorized'}); return; }
      if (response.status === 404) { o.onStatus?.({state: 'gone'}); return; }
      if (response.status === 429) { await pause('busy', BUSY_WAIT_MS); continue; }
      if (!response.ok || !response.body) { await pause('error'); continue; }
      o.onStatus?.({state: 'open'});
      let lines = 0;
      alive();
      try {
        await readNdjson(response.body, value => { lines++; alive(); o.onValue(value); }, {onKeepAlive: alive});
      } catch {
        if (o.signal.aborted) return;
        if (lines) attempt = 0;
        await pause('dropped'); continue;
      }
      if (o.signal.aborted) return;
      if (o.reconnect && !o.reconnect()) { o.onStatus?.({state: 'ended'}); return; }
      if (lines) attempt = 0;
      await pause('dropped');
    } finally {
      clearTimeout(idle);
      o.signal.removeEventListener('abort', stop);
    }
  }
}
