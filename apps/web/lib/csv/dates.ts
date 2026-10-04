/** Dates in a CSV cell, read with an explicit format; a time part is ignored; nothing is guessed when the order is ambiguous. */
export type DateFormat = 'iso' | 'dmy' | 'mdy' | 'dmy-dot' | 'month-name';
export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {iso: 'ISO (2026-10-01)', dmy: 'day/month/year', mdy: 'month/day/year', 'dmy-dot': 'day.month.year', 'month-name': 'month name (1 Oct 2026)'};
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const valid = (y: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate() && y >= 1900 && y <= 2199;
const iso = (y: number, m: number, d: number) => valid(y, m, d) ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
const year = (text: string) => text.length === 2 ? 2000 + Number(text) : Number(text);
/** "YYYY-MM-DD" or null when the cell does not read as a date in that format. */
export function parseDateCell(raw: string, format: DateFormat): string | null {
  const cell = raw.trim().split(/[T\s]/)[0] ?? '';
  if (!cell) return null;
  let m: RegExpMatchArray | null;
  switch (format) {
    case 'iso': m = cell.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); return m ? iso(Number(m[1]), Number(m[2]), Number(m[3])) : null;
    case 'dmy': m = cell.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/); return m ? iso(year(m[3]!), Number(m[2]), Number(m[1])) : null;
    case 'mdy': m = cell.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/); return m ? iso(year(m[3]!), Number(m[1]), Number(m[2])) : null;
    case 'dmy-dot': m = cell.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/); return m ? iso(year(m[3]!), Number(m[2]), Number(m[1])) : null;
    case 'month-name': {
      m = raw.trim().match(/^(\d{1,2})[\s.-]+([A-Za-z]{3,9})[\s.,-]+(\d{4})/) ?? raw.trim().match(/^([A-Za-z]{3,9})[\s.]+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
      if (!m) return null;
      const [day, month, y] = /^\d/.test(m[1]!) ? [m[1]!, m[2]!, m[3]!] : [m[2]!, m[1]!, m[3]!];
      const index = MONTHS.indexOf(month.slice(0, 3).toLowerCase());
      return index < 0 ? null : iso(Number(y), index + 1, Number(day));
    }
  }
}
/** The format the cells read as, and whether day and month could be swapped (every value ≤ 12): then the person must choose. */
export function guessDateFormat(cells: readonly string[]): {format: DateFormat; ambiguous: boolean} {
  const samples = cells.map(c => c.trim()).filter(Boolean).slice(0, 50);
  const all = (format: DateFormat) => samples.length > 0 && samples.every(c => parseDateCell(c, format) !== null);
  if (all('iso')) return {format: 'iso', ambiguous: false};
  if (all('month-name')) return {format: 'month-name', ambiguous: false};
  if (all('dmy-dot')) { const mdyToo = samples.every(c => { const m = c.match(/^(\d{1,2})\.(\d{1,2})\./); return !!m && Number(m[1]) <= 12 && Number(m[2]) <= 12; }); return {format: 'dmy-dot', ambiguous: mdyToo}; }
  const dmy = all('dmy'), mdy = all('mdy');
  if (dmy && mdy) return {format: 'dmy', ambiguous: true};
  if (dmy) return {format: 'dmy', ambiguous: false};
  if (mdy) return {format: 'mdy', ambiguous: false};
  return {format: 'iso', ambiguous: false};
}
