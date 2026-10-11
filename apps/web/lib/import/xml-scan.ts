/**
 * A streaming XML scanner for imports (Session W Part 7): it reports each element's start (name, attributes, depth and
 * parent) and end, from text arriving in chunks, keeping only the unfinished tail in memory. Enough of XML 1.0 for data
 * exports such as Apple Health's export.xml: the XML declaration and processing instructions, comments, a DOCTYPE with
 * an internal subset (Apple's carries its whole DTD), CDATA sections (skipped), quoted attributes with the five named
 * entities and numeric character references. It never builds a document and never evaluates an entity definition
 * (nothing from a DTD is ever expanded), so a hostile file cannot make it fetch or grow anything. No DOMParser.
 */
export type XmlStart = {name: string; attrs: Record<string, string>; selfClosing: boolean; depth: number; parent: string | null};
export type ScanOptions = {onEnd?: (name: string, depth: number) => void; signal?: AbortSignal; onProgress?: (chars: number, buffered: number) => void; maxTag?: number};
export const XML_ERRORS = {malformed: 'This file is not well-formed XML where ZIGoals expected an export.', tooLong: 'An element in this file is too long to be part of a data export.', stopped: 'The import was stopped.'} as const;
const NAMED: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};
export function decodeEntities(value: string): string {
  if (!value.includes('&')) return value;
  return value.replace(/&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|amp|lt|gt|quot|apos);/g, (_, ref: string) => {
    if (ref[0] !== '#') return NAMED[ref]!;
    const code = ref[1] === 'x' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
    return code > 0 && code <= 0x10FFFF && !(code >= 0xD800 && code <= 0xDFFF) ? String.fromCodePoint(code) : '�';
  });
}
const ATTR = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
/**
 * Attributes by name. A name written twice (not well-formed, but iOS 16.0 wrote WorkoutStatistics with `startDate` twice,
 * the second being the end) keeps its first value under the name and the later ones as `name#2`, `name#3`: nothing is
 * silently overwritten, and a reader that knows the quirk can find the second value.
 */
export function parseAttrs(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR.lastIndex = 0;
  for (let m = ATTR.exec(text); m; m = ATTR.exec(text)) {
    let name = m[1]!;
    if (Object.hasOwn(attrs, name)) { let n = 2; while (Object.hasOwn(attrs, `${name}#${n}`)) n++; name = `${name}#${n}`; }
    attrs[name] = decodeEntities(m[2] ?? m[3] ?? '');
  }
  return attrs;
}
/** The index just past the `>` that closes a tag starting at `from`, skipping `>` inside quotes; -1 if not in the buffer yet. */
function tagEnd(buffer: string, from: number): number {
  let quote = '';
  for (let i = from; i < buffer.length; i++) {
    const c = buffer[i]!;
    if (quote) { if (c === quote) quote = ''; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return i + 1;
  }
  return -1;
}
async function* chunks(source: AsyncIterable<string> | ReadableStream<string>): AsyncGenerator<string> {
  if (typeof (source as ReadableStream<string>).getReader === 'function') {
    const reader = (source as ReadableStream<string>).getReader();
    try { for (;;) { const {done, value} = await reader.read(); if (done) return; yield value; } } finally { reader.releaseLock(); }
  } else yield* source as AsyncIterable<string>;
}
/** Scans the whole source; `onStart` may return 'stop' to end early (resolves with what was seen). */
export async function scanXml(source: AsyncIterable<string> | ReadableStream<string>, onStart: (element: XmlStart) => void | 'stop', {onEnd, signal, onProgress, maxTag = 1_000_000}: ScanOptions = {}): Promise<{elements: number; chars: number}> {
  const stack: string[] = [];
  let buffer = '', elements = 0, chars = 0, stopped = false;
  const consume = (): void => {
    let at = 0;
    for (;;) {
      const lt = buffer.indexOf('<', at);
      if (lt < 0) { at = buffer.length; break; }
      at = lt;
      if (buffer.startsWith('<!--', at)) { const end = buffer.indexOf('-->', at + 4); if (end < 0) break; at = end + 3; continue; }
      if (buffer.startsWith('<![CDATA[', at)) { const end = buffer.indexOf(']]>', at + 9); if (end < 0) break; at = end + 3; continue; }
      if (buffer.startsWith('<?', at)) { const end = buffer.indexOf('?>', at + 2); if (end < 0) break; at = end + 2; continue; }
      if (buffer.startsWith('<!DOCTYPE', at) || buffer.startsWith('<!doctype', at)) {
        // An internal subset ("[ ... ]") runs to the "]" before the closing ">"; its declarations are skipped, never applied.
        const close = tagEnd(buffer, at), bracket = buffer.indexOf('[', at);
        if (bracket >= 0 && (close < 0 || bracket < close)) {
          const subsetEnd = /\]\s*>/g;
          subsetEnd.lastIndex = bracket;
          const found = subsetEnd.exec(buffer);
          if (!found) break;
          at = found.index + found[0].length; continue;
        }
        if (close < 0) break;
        at = close; continue;
      }
      if (buffer.startsWith('<!', at)) { const end = tagEnd(buffer, at); if (end < 0) break; at = end; continue; }
      const end = tagEnd(buffer, at + 1);
      if (end < 0) break;
      const raw = buffer.slice(at + 1, end - 1);
      at = end;
      if (raw[0] === '/') {
        const name = raw.slice(1).trim();
        if (stack[stack.length - 1] !== name) throw Error(XML_ERRORS.malformed);
        stack.pop(); onEnd?.(name, stack.length);
        continue;
      }
      const selfClosing = raw.endsWith('/'), body = selfClosing ? raw.slice(0, -1) : raw, space = body.search(/\s/), name = space < 0 ? body : body.slice(0, space);
      if (!name) throw Error(XML_ERRORS.malformed);
      elements++;
      const verdict = onStart({name, attrs: space < 0 ? {} : parseAttrs(body.slice(space)), selfClosing, depth: stack.length, parent: stack[stack.length - 1] ?? null});
      if (selfClosing) onEnd?.(name, stack.length); else stack.push(name);
      if (verdict === 'stop') { stopped = true; break; }
    }
    buffer = buffer.slice(at);
    if (buffer.length > maxTag) throw Error(XML_ERRORS.tooLong);
  };
  for await (const chunk of chunks(source)) {
    if (signal?.aborted) throw Error(XML_ERRORS.stopped);
    buffer += chunk; chars += chunk.length;
    consume();
    onProgress?.(chars, buffer.length);
    if (stopped) return {elements, chars};
  }
  if (buffer.trim() || stack.length) throw Error(XML_ERRORS.malformed);
  return {elements, chars};
}
