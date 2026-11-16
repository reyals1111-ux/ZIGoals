/**
 * Session AM-2 (step 4c): a small server-sent-events reader for the MCP client (Streamable HTTP may answer a POST with
 * `text/event-stream`). Pure and incremental: text goes in as it arrives, complete events come out, so the client can
 * stop reading the moment its own answer is there (a server may keep the stream open).
 *
 * The format, as the HTML standard defines it: lines end in CR LF, LF or CR; a line starting with ":" is a comment;
 * `data:` lines of one event are joined with a line feed; one optional space after the colon is dropped; an empty line
 * ends the event; an event without data is dropped; a leading byte-order mark is ignored. `event:` is kept (MCP uses
 * "message", the default); `id:` and `retry:` are read and ignored — NOVA never resumes or reconnects a stream.
 */
export type SseEvent = {event: string; data: string};
export const SSE_EVENTS_MAX = 200;
export class SseReader {
  private buffer = '';
  private data: string[] = [];
  private event = '';
  private first = true;
  private seen = 0;
  /** Feeds a piece of the stream; returns the events it completed. After `SSE_EVENTS_MAX` events nothing more is returned. */
  push(chunk: string): SseEvent[] {
    let text = this.buffer + chunk;
    if (this.first && text.length) { this.first = false; if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); }
    const out: SseEvent[] = [];
    let start = 0;
    for (;;) {
      const at = nextBreak(text, start);
      if (at === null) break;
      this.line(text.slice(start, at.end), out);
      start = at.next;
    }
    this.buffer = text.slice(start);
    return out;
  }
  /** The end of the stream: a carriage return still waiting for its line feed ends its line; an event still open without its empty line is dropped, as the standard says. */
  end(): SseEvent[] { const out = this.buffer.endsWith('\r') ? this.push('\n') : []; this.buffer = ''; this.data = []; this.event = ''; return out; }
  /** What is waiting for a line end (for the size cap). */
  get pending(): number { return this.buffer.length + this.data.reduce((n, d) => n + d.length, 0); }
  private line(line: string, out: SseEvent[]): void {
    if (line === '') {
      if (this.data.length && this.seen < SSE_EVENTS_MAX) { this.seen++; out.push({event: this.event || 'message', data: this.data.join('\n')}); }
      this.data = []; this.event = '';
      return;
    }
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':'), field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') this.data.push(value);
    else if (field === 'event') this.event = value;
  }
}
/** The next line break at or after `from`: where the line ends and where the next begins; null when the line is not complete yet. */
function nextBreak(text: string, from: number): {end: number; next: number} | null {
  for (let i = from; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 10) return {end: i, next: i + 1};
    if (c === 13) {
      if (i + 1 >= text.length) return null; // a lone CR at the end may be the first half of CR LF
      return {end: i, next: text.charCodeAt(i + 1) === 10 ? i + 2 : i + 1};
    }
  }
  return null;
}
/** A whole stream at once (tests, and a body that arrived in one piece). */
export function parseSse(text: string): SseEvent[] { const reader = new SseReader(); return [...reader.push(text), ...reader.end()]; }
