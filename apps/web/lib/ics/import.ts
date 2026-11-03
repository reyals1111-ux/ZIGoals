import {stableHash} from './ics';
import {DAY_RE, MAX_CALENDAR_NAME, MAX_EXDATES, MAX_STORED_EVENTS, MAX_TITLE, importedCalendarSchema, importedEventSchema, type IcsRule, type ImportedCalendar, type ImportedEvent} from './calendar';
import {addLocalDays} from '../local-date';
import {instantAt} from '../zone-time';
import {settleCount} from './expand';
import {moveWall} from './zone-move';
export {moveWall} from './zone-move';

/**
 * Reading an iCalendar file (RFC 5545) on the device (Session AK, T2): the Agenda's "Import a calendar". The file is
 * text and is only ever read as text: nothing in it is run, opened, fetched or followed (links, attachments, alarms and
 * HTML descriptions are ignored), and only what the Agenda shows is kept (lib/ics/calendar.ts).
 *
 * - Lines are unfolded (§3.1: a line break followed by a space or a tab continues the line; CRLF, LF or CR), and TEXT
 *   is unescaped (§3.3.11: `\\`, `\;`, `\,`, `\n`/`\N`); control characters are dropped.
 * - VEVENTs directly inside the VCALENDAR are read: SUMMARY, DTSTART and DTEND or DURATION (a DATE, a UTC DATE-TIME,
 *   a DATE-TIME with a TZID — an IANA zone, a path ending in one, or a common Windows zone name — or a floating one),
 *   RRULE (DAILY, WEEKLY, MONTHLY and YEARLY with INTERVAL, COUNT, UNTIL, BYDAY and BYMONTHDAY), EXDATE, and
 *   RECURRENCE-ID (a changed occurrence replaces the rule's start). A cancelled event is left out. A rule with parts
 *   ZIGoals cannot read shows its first start only (and says so). Components inside an event (alarms) are skipped.
 * - Caps, each with a plain message: 2 MB, 200,000 lines, 5,000 events read, 1,000 events kept (the 1,500 across all
 *   calendars are checked when it is added), 120-character titles. Events that ended more than 90 days ago are left out.
 */
export const MAX_ICS_BYTES = 2 * 1024 * 1024, MAX_ICS_LINES = 200_000, MAX_EVENTS_READ = 5000, MAX_EVENTS_KEPT = 1000, KEEP_PAST_DAYS = 90, MAX_DEPTH = 8;
export type IcsImportResult = {calendar: ImportedCalendar; read: number; kept: number; skipped: {past: number; cancelled: number; unreadable: number; overCap: number}; firstOnly: number; floatingZones: number};

/* ---- Lines -------------------------------------------------------------------------------------------------- */
/** The file's logical lines: line breaks normalised, folded lines joined. Throws past the line cap. */
export function unfoldLines(text: string): string[] {
  const physical = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  if (physical.length > MAX_ICS_LINES) throw new Error('This file is longer than ZIGoals reads (200,000 lines). Export a shorter range from your calendar app.');
  const out: string[] = [];
  for (const line of physical) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) out[out.length - 1] += line.slice(1);
    else if (line.length) out.push(line);
  }
  return out;
}
export type ContentLine = {name: string; params: Record<string, string>; value: string};
/** One content line: NAME;PARAM=value;PARAM="quoted:value":VALUE. Null when it is not a content line. */
export function parseLine(line: string): ContentLine | null {
  let i = 0, quoted = false;
  const parts: string[] = [];
  let start = 0;
  for (; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === ';') { parts.push(line.slice(start, i)); start = i + 1; }
    else if (!quoted && ch === ':') break;
  }
  if (i >= line.length) return null;
  parts.push(line.slice(start, i));
  const name = parts[0]!.trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,60}$/.test(name)) return null;
  const params: Record<string, string> = {};
  for (const p of parts.slice(1, 20)) {
    const eq = p.indexOf('=');
    if (eq < 1) continue;
    params[p.slice(0, eq).trim().toUpperCase()] = p.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1').slice(0, 200);
  }
  return {name, params, value: line.slice(i + 1)};
}
/** A TEXT value as words: escapes undone, line breaks to spaces, control characters dropped, spaces collapsed. */
export function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, c: string) => c === 'n' || c === 'N' ? ' ' : c)
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
}
const clip = (text: string, max: number) => { const chars = [...text]; return chars.length <= max ? text : chars.slice(0, max - 1).join('').trimEnd() + '…'; };

/* ---- Dates, times and zones --------------------------------------------------------------------------------- */
const realDay = (y: number, m: number, d: number) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
export type IcsTime = {day: string; clock: string | null; utc: boolean};
/** A DATE (YYYYMMDD) or DATE-TIME (YYYYMMDDTHHMMSS, Z for UTC). Null for anything else, or a date that does not exist. */
export function parseIcsTime(value: string): IcsTime | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900 || y > 2200 || !realDay(y, mo, d)) return null;
  const day = `${m[1]}-${m[2]}-${m[3]}`;
  if (m[4] === undefined) return {day, clock: null, utc: false};
  const h = Number(m[4]), mi = Number(m[5]);
  if (h > 23 || mi > 59) return null;
  return {day, clock: `${m[4]}:${m[5]}`, utc: m[7] === 'Z'};
}
/** Common Windows zone names (Outlook files) to IANA zones. Anything else unknown is read as a floating time. */
const WINDOWS_ZONES: Record<string, string> = {
  'W. Europe Standard Time': 'Europe/Berlin', 'Romance Standard Time': 'Europe/Paris', 'Central Europe Standard Time': 'Europe/Budapest',
  'Central European Standard Time': 'Europe/Warsaw', 'GMT Standard Time': 'Europe/London', 'Greenwich Standard Time': 'Atlantic/Reykjavik',
  'E. Europe Standard Time': 'Europe/Chisinau', 'FLE Standard Time': 'Europe/Kiev', 'Eastern Standard Time': 'America/New_York',
  'Central Standard Time': 'America/Chicago', 'Mountain Standard Time': 'America/Denver', 'Pacific Standard Time': 'America/Los_Angeles',
  'India Standard Time': 'Asia/Kolkata', 'China Standard Time': 'Asia/Shanghai', 'Tokyo Standard Time': 'Asia/Tokyo',
  'AUS Eastern Standard Time': 'Australia/Sydney', 'UTC': 'UTC', 'Coordinated Universal Time': 'UTC',
};
const knownZones = new Map<string, boolean>();
export function zoneKnown(zone: string): boolean {
  let known = knownZones.get(zone);
  if (known === undefined) { try { new Intl.DateTimeFormat('en-US', {timeZone: zone}); known = true; } catch { known = false; } knownZones.set(zone, known); }
  return known;
}
/** An IANA zone for a TZID (best effort), or null when the device does not know it. */
export function zoneFor(tzid: string | undefined): string | null {
  if (!tzid) return null;
  const raw = tzid.trim();
  if (WINDOWS_ZONES[raw]) return WINDOWS_ZONES[raw]!;
  if (/^[A-Za-z0-9_+.\-/]{1,100}$/.test(raw)) {
    if (zoneKnown(raw)) return raw;
    // "/mozilla.org/20050126_1/Europe/Berlin": the zone at the end of a path.
    const segments = raw.split('/').filter(Boolean);
    for (const n of [3, 2, 1]) { const tail = segments.slice(-n).join('/'); if (segments.length >= n && /[A-Za-z]/.test(tail) && zoneKnown(tail)) return tail; }
  }
  return null;
}
/** ISO 8601 durations (§3.3.6): P1W, P2D, PT1H30M, P1DT2H. Minutes, or null. */
export function parseDuration(value: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
  if (!m || value.trim() === 'P' || value.trim().endsWith('T')) return null;
  if (m[1] === '-') return null;
  return Number(m[2] ?? 0) * 7 * 1440 + Number(m[3] ?? 0) * 1440 + Number(m[4] ?? 0) * 60 + Number(m[5] ?? 0) + Math.floor(Number(m[6] ?? 0) / 60);
}

/* ---- Repeat rules ------------------------------------------------------------------------------------------- */
const WEEKDAYS: Record<string, number> = {SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6};
/** A RRULE the Agenda can show, or `{unreadable: true}` (then only the first start is shown). */
export function parseRule(value: string, untilTo: (t: IcsTime) => string): IcsRule | {unreadable: true} {
  const parts = new Map<string, string>();
  for (const p of value.split(';')) { const eq = p.indexOf('='); if (eq > 0) parts.set(p.slice(0, eq).trim().toUpperCase(), p.slice(eq + 1).trim().toUpperCase()); }
  const freq = parts.get('FREQ');
  const bad = {unreadable: true as const};
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') return bad;
  for (const key of parts.keys()) if (!['FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY', 'BYMONTHDAY', 'WKST'].includes(key)) return bad;
  const rule: IcsRule = {freq, interval: 1};
  if (parts.has('INTERVAL')) { const n = Number(parts.get('INTERVAL')); if (!Number.isInteger(n) || n < 1 || n > 366) return bad; rule.interval = n; }
  if (parts.has('COUNT')) { const n = Number(parts.get('COUNT')); if (!Number.isInteger(n) || n < 1) return bad; rule.count = Math.min(1000, n); }
  if (parts.has('UNTIL')) { const t = parseIcsTime(parts.get('UNTIL')!); if (!t) return bad; rule.until = untilTo(t); }
  if (parts.has('BYDAY')) {
    const days: number[] = [];
    let nth: number | undefined;
    for (const item of parts.get('BYDAY')!.split(',')) {
      const m = /^([+-]?\d)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(item.trim());
      if (!m) return bad;
      if (m[1] !== undefined) {
        const n = Number(m[1]);
        if (freq !== 'MONTHLY' || n === 0 || n < -5 || n > 5 || (nth !== undefined && nth !== n)) return bad;
        nth = n;
      } else if (nth !== undefined) return bad;
      if (!days.includes(WEEKDAYS[m[2]!]!)) days.push(WEEKDAYS[m[2]!]!);
    }
    if (freq === 'YEARLY' || (freq === 'MONTHLY' && nth === undefined)) return bad;
    rule.byDay = days.sort((a, b) => a - b);
    if (nth !== undefined) rule.nth = nth;
  }
  if (parts.has('BYMONTHDAY')) {
    if (freq !== 'MONTHLY' || rule.byDay) return bad;
    const days = parts.get('BYMONTHDAY')!.split(',').map(Number);
    if (days.some(d => !Number.isInteger(d) || d === 0 || d < -31 || d > 31)) return bad;
    rule.byMonthDay = [...new Set(days)];
  }
  return rule;
}

const wallOf = (t: IcsTime) => t.clock ? `${t.day}T${t.clock}` : t.day;

/* ---- The file ----------------------------------------------------------------------------------------------- */
type Raw = {uid: string; summary: string; start?: ContentLine; end?: ContentLine; duration?: string; rrule?: string; exdates: ContentLine[]; recurrenceId?: ContentLine; cancelled: boolean};

/**
 * Reads a whole file into one calendar to keep. `today` is the device's day (what "ended 90 days ago" counts from);
 * `zone` the device's zone (a UTC time is kept in UTC and shown in the zone of the day it is looked at). Throws, with a
 * plain message, on a file that is too big or is not a calendar; an event that cannot be read is skipped and counted.
 */
export function readIcs(text: string, {fileName = '', today, id, at}: {fileName?: string; today: string; id: string; at: Date}): IcsImportResult {
  if (new TextEncoder().encode(text).length > MAX_ICS_BYTES) throw new Error('This file is over 2 MB, more than ZIGoals reads. Export a shorter range from your calendar app.');
  const lines = unfoldLines(text);
  if (!lines.some(l => /^BEGIN:VCALENDAR$/i.test(l.trim()))) throw new Error('This is not a calendar file (.ics). Choose the file your calendar app exported.');
  let calName = '', defaultZone: string | null = null, read = 0, overCap = 0;
  const stack: string[] = [], raws: Raw[] = [];
  let current: Raw | null = null;
  for (const line of lines) {
    const cl = parseLine(line);
    if (!cl) continue;
    if (cl.name === 'BEGIN') {
      const kind = cl.value.trim().toUpperCase();
      stack.push(kind);
      if (stack.length > MAX_DEPTH) throw new Error('This file nests too deeply to be a calendar.');
      if (kind === 'VEVENT' && stack.length === 2 && stack[0] === 'VCALENDAR') {
        read++;
        if (read > MAX_EVENTS_READ) { overCap++; current = null; } else current = {uid: '', summary: '', exdates: [], cancelled: false};
      }
      continue;
    }
    if (cl.name === 'END') {
      const kind = cl.value.trim().toUpperCase();
      // An END that does not close the innermost open component closes up to its own BEGIN (an event left open is
      // dropped, never read half-way); an END with no BEGIN is ignored.
      if (!stack.includes(kind)) continue;
      while (stack.length && stack.at(-1) !== kind) { if (stack.pop() === 'VEVENT') current = null; }
      stack.pop();
      if (kind === 'VEVENT' && stack.length === 1 && current) raws.push(current);
      if (kind === 'VEVENT') current = null;
      continue;
    }
    if (stack.length === 1 && stack[0] === 'VCALENDAR') {
      if (cl.name === 'X-WR-CALNAME' && !calName) calName = unescapeText(cl.value);
      if (cl.name === 'X-WR-TIMEZONE') defaultZone = zoneFor(unescapeText(cl.value));
      continue;
    }
    // Only the event's own properties: an alarm inside it (stack length 3) is skipped.
    if (!current || stack.length !== 2 || stack[1] !== 'VEVENT') continue;
    switch (cl.name) {
      case 'UID': current.uid = cl.value.slice(0, 300); break;
      case 'SUMMARY': current.summary = unescapeText(cl.value.slice(0, 2000)); break;
      case 'DTSTART': current.start = cl; break;
      case 'DTEND': current.end = cl; break;
      case 'DURATION': current.duration = cl.value; break;
      case 'RRULE': current.rrule = cl.value.slice(0, 500); break;
      case 'EXDATE': if (current.exdates.length < 50) current.exdates.push(cl); break;
      case 'RECURRENCE-ID': current.recurrenceId = cl; break;
      case 'STATUS': current.cancelled = /^CANCELLED$/i.test(cl.value.trim()); break;
    }
  }
  const skipped = {past: 0, cancelled: 0, unreadable: 0, overCap};
  let firstOnly = 0, floatingZones = 0;
  /** A DTSTART/DTEND/EXDATE/RECURRENCE-ID value in the event's terms: its wall time and zone. */
  const timeOf = (cl: ContentLine, value = cl.value): {t: IcsTime; tz: string | null} | null => {
    const t = parseIcsTime(value);
    if (!t) return null;
    if (cl.params.VALUE === 'DATE' && t.clock) return null;
    if (!t.clock) return {t, tz: null};
    if (t.utc) return {t, tz: 'UTC'};
    const tz = cl.params.TZID ? zoneFor(cl.params.TZID) : defaultZone;
    if (cl.params.TZID && !tz) floatingZones++;
    return {t, tz};
  };
  const into = moveWall;
  // A changed occurrence (RECURRENCE-ID) replaces its master's start: indexed once per UID (Z1B-3), each kept once and at
  // most MAX_EXDATES per UID (no master keeps more skipped dates), and moved into a master's zone once per UID and zone.
  const overrides = new Map<string, Map<string, {t: IcsTime; tz: string | null}>>(), movedInto = new Map<string, string[]>();
  for (const raw of raws) {
    if (!raw.recurrenceId || !raw.uid) continue;
    const rid = timeOf(raw.recurrenceId);
    if (!rid) continue;
    let byKey = overrides.get(raw.uid);
    if (!byKey) overrides.set(raw.uid, byKey = new Map());
    if (byKey.size < MAX_EXDATES) byKey.set(`${wallOf(rid.t)}|${rid.tz ?? ''}`, rid);
  }
  const overridesIn = (uid: string, tz: string | null): string[] => {
    const key = `${uid}\n${tz ?? ''}`;
    let list = movedInto.get(key);
    if (!list) movedInto.set(key, list = [...(overrides.get(uid)?.values() ?? [])].map(x => into(x, tz)));
    return list;
  };
  const events: ImportedEvent[] = [], keptIds = new Set<string>();
  const earliest = addLocalDays(today, -KEEP_PAST_DAYS);
  for (const raw of raws) {
    if (raw.cancelled) { skipped.cancelled++; continue; }
    const start = raw.start && timeOf(raw.start);
    if (!start) { skipped.unreadable++; continue; }
    const allDay = !start.t.clock, tz = start.tz;
    const event: ImportedEvent = {id: stableHash(`${raw.uid || raw.summary + wallOf(start.t)}|${raw.recurrenceId?.value ?? ''}`), title: clip(raw.summary || 'Untitled event', MAX_TITLE), allDay, start: wallOf(start.t), ...(tz ? {tz} : {})};
    // Length: DTEND, else DURATION; an all-day event's days (1–14), a timed one's minutes (up to a day).
    const end = raw.end && timeOf(raw.end);
    const duration = raw.duration ? parseDuration(raw.duration) : null;
    let lastDay = start.t.day;
    if (allDay) {
      let days = 1;
      if (end && !end.t.clock) days = Math.round((Date.parse(`${end.t.day}T12:00:00Z`) - Date.parse(`${start.t.day}T12:00:00Z`)) / 86_400_000);
      else if (duration !== null) days = Math.ceil(duration / 1440);
      days = Math.max(1, Math.min(14, days || 1));
      if (days > 1) event.days = days;
      lastDay = addLocalDays(start.t.day, days - 1);
    } else {
      let minutes = 0;
      if (end && end.t.clock) {
        const ms = (x: {t: IcsTime; tz: string | null}) => x.tz === 'UTC' ? Date.parse(`${x.t.day}T${x.t.clock}:00Z`) : x.tz ? instantAt(x.t.day, x.t.clock!, x.tz) : Date.parse(`${x.t.day}T${x.t.clock}:00Z`);
        minutes = Math.round((ms(end) - ms(start)) / 60_000);
      } else if (duration !== null) minutes = duration;
      event.minutes = Math.max(0, Math.min(1440, Number.isFinite(minutes) ? minutes : 0));
    }
    if (raw.rrule && !raw.recurrenceId) {
      const rule = parseRule(raw.rrule, t => into({t, tz: t.utc ? 'UTC' : tz}, tz));
      if ('unreadable' in rule) { event.firstOnly = true; firstOnly++; }
      else event.rule = rule;
    }
    // A COUNT is kept as the UNTIL of its last start (Z1B-4), so a series that ended is left out here and a view never
    // walks it from an old start. A COUNT rule that gives no start at all is one ZIGoals cannot show.
    if (event.rule?.count !== undefined) {
      const settled = settleCount(event);
      if (!settled) { skipped.unreadable++; continue; }
      event.rule = settled;
    }
    // Long past: a one-off event that ended before the 90 days, or a rule that ended before them.
    const ruleEnd = event.rule ? (event.rule.until?.slice(0, 10) ?? null) : lastDay;
    if (ruleEnd !== null && ruleEnd < earliest) { skipped.past++; continue; }
    // A repeated event (the same UID and recurrence id) costs nothing more once one is kept (Z1B-3).
    if (keptIds.has(event.id)) continue;
    if (events.length >= Math.min(MAX_EVENTS_KEPT, MAX_STORED_EVENTS)) { skipped.overCap++; continue; }
    if (event.rule) {
      // Skipped dates: EXDATE values, then the changed occurrences; at most MAX_EXDATES, so no more are converted.
      const ex = new Set<string>(), add = (v: string) => { if (DAY_RE.test(v) || /T\d{2}:\d{2}$/.test(v)) ex.add(v); return ex.size < MAX_EXDATES; };
      dates: for (const cl of raw.exdates) for (const v of cl.value.split(',')) { const x = timeOf(cl, v); if (x && !add(into(x, tz))) break dates; }
      if (ex.size < MAX_EXDATES) for (const v of overridesIn(raw.uid, tz)) if (!add(v)) break;
      if (ex.size) event.exdates = [...ex];
    }
    const parsed = importedEventSchema.safeParse(event);
    if (!parsed.success) { skipped.unreadable++; continue; }
    keptIds.add(parsed.data.id);
    events.push(parsed.data);
  }
  const name = clip(calName || fileName.replace(/\.(ics|ical|ifb|icalendar)$/i, '').replace(/[\u0000-\u001f\u007f]/g, '').trim() || 'Imported calendar', MAX_CALENDAR_NAME);
  const calendar = importedCalendarSchema.parse({id, name, importedAt: at.toISOString(), events});
  return {calendar, read, kept: events.length, skipped, firstOnly, floatingZones};
}
