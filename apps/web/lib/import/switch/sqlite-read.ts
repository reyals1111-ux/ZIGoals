/**
 * Session AV lane 2 (habits; LEDGER #194): a small, read-only reader of an SQLite 3 database file, enough to bring
 * Tickmate's backup in (lib/import/switch/tickmate.ts) without a new dependency. It follows the published file format
 * (https://www.sqlite.org/fileformat2.html): the 100-byte header, table b-trees (interior 0x05 and leaf 0x0D pages), cell
 * payloads with their overflow chains, and the record format. It reads tables only (never indexes), ignores any
 * write-ahead log, and refuses what it does not know (a WITHOUT ROWID table, a page outside the file, a loop of pages).
 * Pure: bytes in, rows out.
 */
export type SqlValue = null | number | string | Uint8Array;
export type SqlTable = {name: string; rootpage: number; sql: string};
const MAGIC = 'SQLite format 3\u0000';
export const SQLITE_NOT_A_DATABASE = 'This file is not an SQLite database.';
export const isSqlite = (bytes: Uint8Array) => bytes.length >= 100 && String.fromCharCode(...bytes.subarray(0, 16)) === MAGIC;

export class SqliteFile {
  readonly pageSize: number; readonly usable: number; readonly pages: number; private readonly text: TextDecoder; private readonly view: DataView;
  constructor(private readonly bytes: Uint8Array) {
    if (!isSqlite(bytes)) throw Error(SQLITE_NOT_A_DATABASE);
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const raw = this.view.getUint16(16), size = raw === 1 ? 65536 : raw;
    if (size < 512 || size > 65536 || (size & (size - 1)) !== 0) throw Error('This database has a page size ZIGoals cannot read.');
    this.pageSize = size; this.usable = size - bytes[20]!;
    if (this.usable < 480) throw Error('This database has a page layout ZIGoals cannot read.');
    this.pages = Math.floor(bytes.length / size);
    const encoding = this.view.getUint32(56);
    this.text = new TextDecoder(encoding === 2 ? 'utf-16le' : encoding === 3 ? 'utf-16be' : 'utf-8');
  }
  private pageAt(n: number): number {
    if (!Number.isInteger(n) || n < 1 || n > this.pages) throw Error('This database points outside the file, so it cannot be read safely.');
    return (n - 1) * this.pageSize;
  }
  private varint(at: number): [number, number] {
    let value = 0;
    for (let i = 0; i < 9; i++) {
      const b = this.bytes[at + i];
      if (b === undefined) throw Error('This database ends in the middle of a record.');
      if (i === 8) return [value * 256 + b, 9];
      value = value * 128 + (b & 0x7f);
      if (!(b & 0x80)) return [value, i + 1];
    }
    return [value, 9];
  }
  /** Every row of a table b-tree, by rowid order: its rowid and its record's bytes. */
  *rows(root: number, max = 500_000): Generator<{rowid: number; payload: Uint8Array}> {
    const stack = [root], seen = new Set<number>();
    let count = 0;
    while (stack.length) {
      const page = stack.pop()!;
      if (seen.has(page)) throw Error('This database has a loop in its pages, so it cannot be read safely.');
      seen.add(page);
      const base = this.pageAt(page), head = base + (page === 1 ? 100 : 0), type = this.bytes[head], cells = this.view.getUint16(head + 3);
      if (type === 0x05) {
        // Interior: the children left to right, then the right-most; pushed in reverse so they come out in order.
        const children: number[] = [];
        for (let i = 0; i < cells; i++) children.push(this.view.getUint32(base + this.view.getUint16(head + 12 + 2 * i)));
        children.push(this.view.getUint32(head + 8));
        for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!);
      } else if (type === 0x0d) {
        for (let i = 0; i < cells; i++) {
          let at = base + this.view.getUint16(head + 8 + 2 * i);
          const [size, a] = this.varint(at); at += a;
          const [rowid, b] = this.varint(at); at += b;
          if (++count > max) throw Error('This database holds more rows than ZIGoals reads at once.');
          yield {rowid, payload: this.payload(at, size)};
        }
      } else throw Error('This database has a page ZIGoals cannot read.');
    }
  }
  private payload(at: number, size: number): Uint8Array {
    const u = this.usable, x = u - 35;
    if (size <= x) return this.bytes.subarray(at, at + size);
    const m = Math.floor((u - 12) * 32 / 255) - 23, k = m + ((size - m) % (u - 4)), local = k <= x ? k : m;
    const out = new Uint8Array(size);
    out.set(this.bytes.subarray(at, at + local), 0);
    let filled = local, next = this.view.getUint32(at + local), hops = 0;
    while (filled < size) {
      if (++hops > this.pages) throw Error('This database has a loop in its pages, so it cannot be read safely.');
      const base = this.pageAt(next), take = Math.min(u - 4, size - filled);
      out.set(this.bytes.subarray(base + 4, base + 4 + take), filled);
      filled += take; next = this.view.getUint32(base);
    }
    return out;
  }
  /** A record's values, in column order. */
  record(payload: Uint8Array): SqlValue[] {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength), varint = (at: number): [number, number] => {
      let value = 0;
      for (let i = 0; i < 9; i++) { const b = payload[at + i]; if (b === undefined) throw Error('This database ends in the middle of a record.'); if (i === 8) return [value * 256 + b, 9]; value = value * 128 + (b & 0x7f); if (!(b & 0x80)) return [value, i + 1]; }
      return [value, 9];
    };
    const [headerSize, n] = varint(0), types: number[] = [];
    for (let at = n; at < headerSize;) { const [t, m] = varint(at); types.push(t); at += m; }
    const out: SqlValue[] = [];
    let at = headerSize;
    const int = (bytes: number) => { let v = 0; for (let i = 0; i < bytes; i++) v = v * 256 + payload[at + i]!; const top = 2 ** (8 * bytes); return payload[at]! & 0x80 ? v - top : v; };
    for (const t of types) {
      if (t === 0) out.push(null);
      else if (t >= 1 && t <= 6) { const bytes = [0, 1, 2, 3, 4, 6, 8][t]!; out.push(bytes === 8 ? Number(view.getBigInt64(at)) : int(bytes)); at += bytes; }
      else if (t === 7) { out.push(view.getFloat64(at)); at += 8; }
      else if (t === 8 || t === 9) out.push(t - 8);
      else if (t >= 12) { const len = Math.floor((t - 12) / 2); const part = payload.subarray(at, at + len); if (part.length < len) throw Error('This database ends in the middle of a record.'); out.push(t % 2 ? this.text.decode(part) : part); at += len; }
      else throw Error('This database has a value ZIGoals cannot read.');
    }
    return out;
  }
  /** The tables named in the schema (sqlite_master, page 1). */
  tables(): SqlTable[] {
    const out: SqlTable[] = [];
    for (const {payload} of this.rows(1, 10_000)) {
      const [type, name, , rootpage, sql] = this.record(payload);
      if (type === 'table' && typeof name === 'string' && typeof rootpage === 'number' && typeof sql === 'string') out.push({name, rootpage, sql});
    }
    return out;
  }
  /** Every row of a table as {column: value}; an INTEGER PRIMARY KEY column reads its rowid, as SQLite does. */
  *select(table: SqlTable, max?: number): Generator<Record<string, SqlValue>> {
    const {columns, rowidAlias} = tableColumns(table.sql);
    for (const {rowid, payload} of this.rows(table.rootpage, max)) {
      const values = this.record(payload), row: Record<string, SqlValue> = {};
      columns.forEach((c, i) => { row[c] = i === rowidAlias && (values[i] === null || values[i] === undefined) ? rowid : values[i] ?? null; });
      yield row;
    }
  }
}
/** The column names of a CREATE TABLE statement, lower-cased, and which one (if any) is the rowid. */
export function tableColumns(sql: string): {columns: string[]; rowidAlias: number} {
  const open = sql.indexOf('('), close = sql.lastIndexOf(')');
  if (open < 0 || close < open) throw Error('This database has a table ZIGoals cannot read.');
  if (/\)\s*without\s+rowid\s*;?\s*$/i.test(sql)) throw Error('This database has a table ZIGoals cannot read.');
  const body = sql.slice(open + 1, close), parts: string[] = [];
  let depth = 0, quote = '', start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (quote) { if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === '\'' || ch === '`') quote = ch; else if (ch === '[') quote = ']';
    else if (ch === '(') depth++; else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) { parts.push(body.slice(start, i)); start = i + 1; }
  }
  parts.push(body.slice(start));
  const columns: string[] = []; let rowidAlias = -1;
  for (const raw of parts.map(p => p.trim()).filter(Boolean)) {
    if (/^(?:constraint|primary|unique|check|foreign)\b/i.test(raw)) continue;
    const m = /^(?:"((?:[^"]|"")+)"|`([^`]+)`|\[([^\]]+)\]|'([^']+)'|([^\s(]+))\s*(.*)$/s.exec(raw);
    if (!m) continue;
    const name = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '').replace(/""/g, '"').toLowerCase();
    if (/^integer\s+primary\s+key\b/i.test(m[6] ?? '')) rowidAlias = columns.length;
    columns.push(name);
  }
  return {columns, rowidAlias};
}
