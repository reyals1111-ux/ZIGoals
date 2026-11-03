/**
 * An iCalendar file (RFC 5545) made on the device (Session AK, F5d): the agenda's "Export to a calendar". Download only:
 * no server, no feed, no subscription URL. The file carries exactly the events the person chose — a title and a day (and
 * a time where the item has one), the detail line only when they ticked it — nothing else about them.
 *
 * - TEXT values are escaped (RFC 5545 §3.3.11): `\` → `\\`, `;` → `\;`, `,` → `\,`, a line break (CRLF, LF or CR) →
 *   `\n`; every other control character is dropped. So a title such as "Rent\r\nBEGIN:VEVENT" stays one SUMMARY value
 *   and can never start a property or a component of its own.
 * - Content lines end in CRLF and are folded at 75 octets (§3.1): a continuation line starts with one space, and a fold
 *   never splits a UTF-8 character.
 * - Each event has its own UID (from the item's stable id, hashed, so re-exporting updates the same event instead of
 *   doubling it) and a DTSTAMP (the moment of export, UTC).
 * - An item without a time is an all-day event (DTSTART;VALUE=DATE, DTEND the next day); one with a time is a floating
 *   local time ("08:00 wherever you are", as a habit's time is) with a DURATION. Events are TRANSPARENT: they never mark
 *   the person busy.
 */
export type IcsEvent = {id: string; date: string; time?: string | null; minutes?: number; summary: string; description?: string};
export const MAX_ICS_EVENTS = 2000, MAX_SUMMARY = 200, MAX_DESCRIPTION = 500;
export const ICS_PRODID = '-//ZIGoals//Agenda export//EN';
const DAY = /^\d{4}-\d{2}-\d{2}$/, CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** Escapes a TEXT value. Line breaks become the two characters `\n`; other control characters are removed. */
export function escapeText(value: string): string {
  return value
    .replace(/\r\n|\r|\n/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
const encoder = new TextEncoder();
/** Folds one content line at 75 octets (the continuation's leading space counts), never inside a UTF-8 character. */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '', size = 0, limit = 75;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (size + n > limit) { parts.push(current); current = ''; size = 0; limit = 74; }
    current += ch; size += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}
/** A short, stable hash of a string (FNV-1a, 2 × 32 bits), so a UID says nothing about what the event is. */
export function stableHash(text: string): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  for (const byte of encoder.encode(text)) { a = Math.imul(a ^ byte, 0x01000193) >>> 0; b = Math.imul(b ^ byte, 0x5bd1e995) >>> 0; }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}
export const icsUid = (id: string) => `${stableHash(id)}@zigoals.agenda`;
const compactDay = (day: string) => day.replace(/-/g, '');
const nextDay = (day: string) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
const stampOf = (at: Date) => at.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const clip = (text: string, max: number) => [...text].slice(0, max).join('');

/** The whole calendar file, CRLF line endings, at most MAX_ICS_EVENTS events (the earliest first). */
export function buildIcs(events: readonly IcsEvent[], {stamp, name = 'ZIGoals agenda'}: {stamp: Date; name?: string}): string {
  if (!Number.isFinite(stamp.getTime())) throw new Error('The export time is not a real time.');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:${ICS_PRODID}`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escapeText(clip(name, 80))}`];
  const dtstamp = stampOf(stamp), seen = new Set<string>();
  const valid = events.filter(e => DAY.test(e.date) && e.summary.trim()).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')).slice(0, MAX_ICS_EVENTS);
  for (const e of valid) {
    const uid = icsUid(e.id);
    if (seen.has(uid)) continue;
    seen.add(uid);
    lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${dtstamp}`);
    if (e.time && CLOCK.test(e.time)) {
      const minutes = Math.max(1, Math.min(24 * 60, Math.round(e.minutes || 30)));
      lines.push(`DTSTART:${compactDay(e.date)}T${e.time.replace(':', '')}00`, `DURATION:PT${minutes}M`);
    } else lines.push(`DTSTART;VALUE=DATE:${compactDay(e.date)}`, `DTEND;VALUE=DATE:${compactDay(nextDay(e.date))}`);
    lines.push(`SUMMARY:${escapeText(clip(e.summary.trim(), MAX_SUMMARY))}`);
    if (e.description?.trim()) lines.push(`DESCRIPTION:${escapeText(clip(e.description.trim(), MAX_DESCRIPTION))}`);
    lines.push('TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
/** Unfolds a file's lines (for tests and a check before download): a CRLF followed by one space joins the lines. */
export const unfold = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n').filter(Boolean);
