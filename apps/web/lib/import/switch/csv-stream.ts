/**
 * Rows of a large CSV file as they arrive (Session W Part 7): the vendor exports run to hundreds of megabytes (a heart
 * rate file holds a reading every few seconds), far past the 2 MB reader the column-matching imports use, so this one
 * keeps only the unfinished record in memory. RFC 4180 quoting (a quoted field may hold the delimiter, a line break or
 * a doubled quote), LF, CRLF or CR line ends, and `,`, `;` or tab, either given or taken from the header line.
 */
export const CSV_ERRORS = {tooLong: 'A row in this file is too long to be part of a data export.', quote: 'This file has a quote that never closes, so its rows cannot be read safely.'} as const;
export type Delimiter = ',' | ';' | '\t';
/** The delimiter the header line uses most (outside quotes); a comma when it has none. */
export function headerDelimiter(line: string): Delimiter {
  const counts: [Delimiter, number][] = [[',', 0], [';', 0], ['\t', 0]];
  let quoted = false;
  for (const c of line) { if (c === '"') quoted = !quoted; else if (!quoted) for (const entry of counts) if (entry[0] === c) entry[1]++; }
  const best = [...counts].sort((a, b) => b[1] - a[1])[0]!;
  return best[1] > 0 ? best[0] : ',';
}
export async function* csvRows(source: ReadableStream<string>, {delimiter, maxRecord = 4_000_000, skipLines = 0}: {delimiter?: Delimiter; maxRecord?: number; skipLines?: number} = {}): AsyncGenerator<string[]> {
  const reader = source.getReader();
  let delim: Delimiter | undefined = delimiter, skip = skipLines, pending = '';
  let fields: string[] = [], field = '', quoted = false, quoteSeen = false, afterCr = false, length = 0;
  const rows: string[][] = [];
  const endRecord = () => { fields.push(field); field = ''; if (!(fields.length === 1 && fields[0] === '')) rows.push(fields); fields = []; length = 0; };
  const grow = (n: number) => { length += n; if (length > maxRecord) throw Error(CSV_ERRORS.tooLong); };
  // Plain stretches are copied as slices (a heart-rate file is mostly digits and commas), never a character at a time.
  const feed = (text: string) => {
    const special = delim === '\t' ? /[\t\r\n]/g : delim === ';' ? /[;\r\n]/g : /[,\r\n]/g;
    let i = 0;
    while (i < text.length) {
      if (quoted) {
        if (quoteSeen) { quoteSeen = false; if (text[i] === '"') { field += '"'; grow(1); i++; continue; } quoted = false; continue; }
        const q = text.indexOf('"', i);
        if (q < 0) { field += text.slice(i); grow(text.length - i); return; }
        field += text.slice(i, q); grow(q - i + 1); i = q + 1; quoteSeen = true; continue;
      }
      if (afterCr) { afterCr = false; if (text[i] === '\n') { i++; continue; } }
      if (text[i] === '"' && field === '') { quoted = true; grow(1); i++; continue; }
      special.lastIndex = i;
      const m = special.exec(text), end = m ? m.index : text.length;
      field += text.slice(i, end); grow(end - i);
      if (!m) return;
      const s = text[end]!;
      i = end + 1;
      if (s === delim) { fields.push(field); field = ''; grow(1); }
      else { endRecord(); if (s === '\r') afterCr = true; }
    }
  };
  try {
    for (;;) {
      const {done, value} = await reader.read();
      let text = done ? '' : value;
      // Lines before the header (Samsung's first line describes the file), then the header's own delimiter.
      if (skip > 0 || delim === undefined) {
        pending += text;
        while (skip > 0) { const nl = pending.indexOf('\n'); if (nl < 0) break; pending = pending.slice(nl + 1); skip--; }
        if (skip > 0 && !done) { if (pending.length > maxRecord) throw Error(CSV_ERRORS.tooLong); continue; }
        if (delim === undefined) {
          const nl = pending.search(/[\r\n]/);
          if (nl < 0 && !done) { if (pending.length > maxRecord) throw Error(CSV_ERRORS.tooLong); continue; }
          delim = headerDelimiter(nl < 0 ? pending : pending.slice(0, nl));
        }
        text = pending; pending = '';
      }
      feed(text);
      for (const row of rows.splice(0)) yield row;
      if (done) break;
    }
    if (quoteSeen) { quoteSeen = false; quoted = false; }
    if (quoted) throw Error(CSV_ERRORS.quote);
    if (field !== '' || fields.length) endRecord();
    for (const row of rows.splice(0)) yield row;
  } finally { reader.releaseLock(); }
}
/** Header names, trimmed and lower-cased, with a vendor prefix taken off ("com.samsung.health.sleep.start_time" → "start_time"). */
export function headerIndex(header: readonly string[], prefix?: RegExp): Map<string, number> {
  const index = new Map<string, number>();
  header.forEach((name, i) => { let key = name.trim().toLowerCase(); if (prefix) key = key.replace(prefix, ''); if (!index.has(key)) index.set(key, i); });
  return index;
}
