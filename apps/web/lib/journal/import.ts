import {parseFrontMatter} from '../notes/markdown';
import {IMPORT_SOURCES, PERIOD, MAX_PEOPLE, PERSON_MAX, MAX_AUDIO_SECONDS, MAX_ENTRIES, MAX_ENTRY_AUDIO, MAX_ENTRY_PHOTOS, MAX_ENTRY_PHOTOS_ALL, MAX_JOURNALS, MAX_TEXT, journalSchema, type Journal, type JournalEntry} from './schema';
import {MAIN_JOURNAL, booksOf, newJournalId} from './books';
import {readTags} from './tags';
import {FOLLOW_UP_MARK, followUpOfQuote} from './export';

/**
 * Session AV lane 2 (journal; LEDGER #44, Day One's imports): reading another journal's export into this one, pure.
 * - A Day One export: its ZIP (one JSON per journal, `photos/<md5>.<type>`, `audios/<md5>.<format>`) or a JSON file alone.
 *   Each entry keeps its day (in its own time zone), words, tags, up to 4 photos and 3 audio notes; Day One's photo
 *   markers and Markdown escapes are taken out of the words. A journal other than the first becomes a journal here
 *   (while there is room; else its entries go to the main Journal).
 * - ZIGoals' own journal export (the same shape, with each entry's day and journal kept): it comes back as it left.
 * - Plain text and Markdown (.txt, .md): one entry per file, or one per dated heading ("## 2026-11-03"); the day from
 *   front matter (`date:`), the file name, or the first line; tags from front matter. Apple Journal's or any HTML export
 *   (.html): the page's words, its day from the file name or its first lines.
 * An entry already in the journal (same day and words) or twice in the files is left out, and said. Nothing is written
 * here: the plan is shown first, applied with one Undo (lib/journal/import.ts applyImport).
 */
export type ImportSource = (typeof IMPORT_SOURCES)[number];
export type PlannedEntry = {date: string; text: string; createdAt: string; updatedAt?: string; tags?: string[]; book?: string; template?: string; source: ImportSource; photos: string[]; audio: {file: string; seconds: number}[]; followUp?: {question: string; answer?: string};
  /** Session AV lane 2 (r3-notes; LEDGER #269, #278, #279, #272): an entry's period, night and opening day, read back from ZIGoals' own exports. */ extra?: {period?: string; night?: string; opensOn?: string; /** Session AV lane 2 (r4-mind; LEDGER #310): a starred entry (Day One's `starred`). */ star?: true; /** Session AV lane 2 (r6-notes; LEDGER #401): who was there. */ people?: string[]};
  /** Session AV lane 2 (review B3C-5): read from ZIGoals' own Markdown file, its `createdAt` the entry's own (a day and creation time already in the journal is that entry). */ own?: true};
/** Session AV lane 2 (r3-notes): the round-3 fields of an entry, from a ZIGoals export's `zigoals` block or Markdown front matter. */
function extraOf(z: {period?: unknown; night?: unknown; opensOn?: unknown; 'opens-on'?: unknown; starred?: unknown; people?: unknown} | null | undefined): PlannedEntry['extra'] | undefined {
  if (!z) return undefined;
  const opens = z.opensOn ?? z['opens-on'], people = readPeople(z.people);
  const out = {...(typeof z.period === 'string' && PERIOD.test(z.period) ? {period: z.period} : {}), ...(typeof z.night === 'string' && validDay(z.night) ? {night: z.night} : {}), ...(typeof opens === 'string' && validDay(opens) ? {opensOn: opens} : {}), ...(z.starred === true || z.starred === 'true' ? {star: true as const} : {}), ...(people.length ? {people} : {})};
  return Object.keys(out).length ? out : undefined;
}
/** Session AV lane 2 (r6-notes; LEDGER #401): names read from a list or a comma-separated line, as the entry keeps them. */
export function readPeople(v: unknown): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  const out: string[] = [];
  for (const x of list) { if (typeof x !== 'string') continue; const n = x.trim().replace(/\s+/g, ' '); if (n && n.length <= PERSON_MAX && !out.some(o => o.toLowerCase() === n.toLowerCase())) out.push(n); }
  return out.slice(0, MAX_PEOPLE);
}
export type ImportSkip = {name: string; reason: string};
export type JournalImportPlan = {entries: PlannedEntry[]; skipped: ImportSkip[]; books: string[]; cut: number};
export type InFile = {name: string; text: string};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (d: string) => DAY.test(d) && !Number.isNaN(Date.parse(`${d}T12:00:00Z`)) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d;
/** The calendar day of an instant in a time zone (the device's when the zone is unknown or wrong). */
export function dayIn(iso: string, zone?: string): string | null {
  const t = Date.parse(iso); if (!Number.isFinite(t)) return null;
  try { const parts = new Intl.DateTimeFormat('en-CA', {timeZone: zone || undefined, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date(t)); const get = (k: string) => parts.find(p => p.type === k)?.value; return `${get('year')}-${get('month')}-${get('day')}`; }
  catch { return dayIn(iso); }
}
const MONTHS: Record<string, number> = {january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12, januari: 1, februari: 2, maart: 3, mei: 5, juni: 6, juli: 7, augustus: 8, oktober: 10};
/** A day written in a line: "2026-11-03", "3 November 2026", "November 3, 2026", "Monday, 3 November 2026", "3-11-2026". */
export function dayInLine(line: string): string | null {
  const l = line.toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(l);
  if (m && validDay(`${m[1]}-${m[2]}-${m[3]}`)) return `${m[1]}-${m[2]}-${m[3]}`;
  const pad = (n: number) => String(n).padStart(2, '0');
  m = /\b(\d{1,2}) ([a-z]+) (\d{4})\b/.exec(l);
  if (m && MONTHS[m[2]!]) { const d = `${m[3]}-${pad(MONTHS[m[2]!]!)}-${pad(Number(m[1]))}`; if (validDay(d)) return d; }
  m = /\b([a-z]+) (\d{1,2}) (\d{4})\b/.exec(l);
  if (m && MONTHS[m[1]!]) { const d = `${m[3]}-${pad(MONTHS[m[1]!]!)}-${pad(Number(m[2]))}`; if (validDay(d)) return d; }
  m = /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/.exec(l);
  if (m) { const d = `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`; if (validDay(d)) return d; }
  return null;
}
/** Day One's words as plain words: its photo and media markers gone, its Markdown escapes undone. */
export function dayOneWords(text: string): string {
  return text.replace(/!\[[^\]]*\]\(dayone-moment:\/\/?[^)]*\)/g, '').replace(/\\([\\`*_{}[\]()#+\-.!>|~])/g, '$1').replace(/\n{3,}/g, '\n\n').trim();
}
const clip = (text: string): {text: string; cut: boolean} => text.length > MAX_TEXT ? {text: `${text.slice(0, MAX_TEXT - 1).trimEnd()}…`, cut: true} : {text, cut: false};
const baseName = (name: string) => name.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '');
type DayOneEntry = {uuid?: unknown; creationDate?: unknown; modifiedDate?: unknown; timeZone?: unknown; text?: unknown; tags?: unknown; photos?: unknown; audios?: unknown; zigoals?: unknown; starred?: unknown};
/** One Day One (or ZIGoals) JSON export file's entries; its journal is named by the file (Day One writes one per journal). */
export function readDayOneJson(file: InFile, zone?: string): {entries: PlannedEntry[]; skipped: ImportSkip[]; book: string | null; cut: number} {
  let data: unknown;
  try { data = JSON.parse(file.text); } catch { return {entries: [], skipped: [{name: file.name, reason: 'it is not a JSON file ZIGoals can read'}], book: null, cut: 0}; }
  const list = data && typeof data === 'object' && Array.isArray((data as {entries?: unknown}).entries) ? (data as {entries: DayOneEntry[]}).entries : null;
  if (!list) return {entries: [], skipped: [{name: file.name, reason: 'it holds no journal entries (no "entries" list)'}], book: null, cut: 0};
  const ours = (data as {metadata?: {app?: unknown}}).metadata?.app === 'ZIGoals', name = baseName(file.name);
  const book = ours || /^journal$/i.test(name) ? null : name.slice(0, 40);
  const entries: PlannedEntry[] = [], skipped: ImportSkip[] = [];
  let cut = 0;
  for (const [i, e] of list.entries()) {
    const label = `${file.name} #${i + 1}`;
    if (!e || typeof e !== 'object') { skipped.push({name: label, reason: 'it is not an entry'}); continue; }
    const created = typeof e.creationDate === 'string' && Number.isFinite(Date.parse(e.creationDate)) ? new Date(Date.parse(e.creationDate)).toISOString() : null;
    const z = e.zigoals && typeof e.zigoals === 'object' ? e.zigoals as {date?: unknown; journal?: unknown; template?: unknown; question?: unknown; answer?: unknown; period?: unknown; night?: unknown; opensOn?: unknown; people?: unknown} : null;
    const date = typeof z?.date === 'string' && validDay(z.date) ? z.date : created ? dayIn(created, typeof e.timeZone === 'string' ? e.timeZone : zone) : null;
    const words = typeof e.text === 'string' ? dayOneWords(e.text) : '';
    const photos = Array.isArray(e.photos) ? e.photos.flatMap(p => p && typeof p === 'object' && typeof (p as {md5?: unknown}).md5 === 'string' ? [`photos/${(p as {md5: string}).md5}.${String((p as {type?: unknown}).type ?? 'jpeg')}`] : []).slice(0, MAX_ENTRY_PHOTOS_ALL) : [];
    const audio = Array.isArray(e.audios) ? e.audios.flatMap(p => p && typeof p === 'object' && typeof (p as {md5?: unknown}).md5 === 'string' ? [{file: `audios/${(p as {md5: string}).md5}.${String((p as {format?: unknown}).format ?? 'm4a')}`, seconds: Math.max(0, Math.min(MAX_AUDIO_SECONDS, Math.round(Number((p as {duration?: unknown}).duration) || 0)))}] : []).slice(0, MAX_ENTRY_AUDIO) : [];
    if (!date || !created) { skipped.push({name: label, reason: 'it has no date ZIGoals can read'}); continue; }
    if (!words && !photos.length && !audio.length) { skipped.push({name: label, reason: 'it has no words, photo or audio'}); continue; }
    const c = clip(words || (audio.length ? 'A voice note.' : photos.length > 1 ? 'Photos.' : 'A photo.')); if (c.cut) cut++;
    const tags = Array.isArray(e.tags) ? readTags(e.tags.filter((t): t is string => typeof t === 'string').join(',')) : [];
    const modified = typeof e.modifiedDate === 'string' && Number.isFinite(Date.parse(e.modifiedDate)) ? new Date(Date.parse(e.modifiedDate)).toISOString() : undefined;
    const ownBook = ours && typeof z?.journal === 'string' && z.journal.trim() ? z.journal.trim().slice(0, 40) : book ?? undefined;
    entries.push({date, text: c.text, createdAt: created, ...(modified && modified !== created ? {updatedAt: modified} : {}), ...(tags.length ? {tags} : {}), ...(ownBook ? {book: ownBook} : {}), ...(ours && typeof z?.template === 'string' && /^[a-z0-9-]{1,40}$/.test(z.template) ? {template: z.template} : {}), ...(ours && typeof z?.question === 'string' && z.question.trim() ? {followUp: {question: z.question.trim().slice(0, 300), ...(typeof z.answer === 'string' && z.answer.trim() ? {answer: z.answer.trim().slice(0, 2000)} : {})}} : {}), ...(() => { const extra = {...(ours ? extraOf(z) : undefined), ...(e.starred === true ? {star: true as const} : {})}; return Object.keys(extra).length ? {extra} : {}; })(), source: 'dayone', photos, audio});
  }
  return {entries, skipped, book, cut};
}
/** A Markdown or text file: one entry, or one per dated heading. */
export function readTextFile(file: InFile, today: string): {entries: PlannedEntry[]; skipped: ImportSkip[]; cut: number} {
  const md = /\.(?:md|markdown)$/i.test(file.name), source: ImportSource = md ? 'markdown' : 'text';
  const parsed = parseFrontMatter(file.text.replace(/\r\n?/g, '\n')), data = parsed.data;
  let body = parsed.body;
  const fmDate = typeof data.date === 'string' ? dayInLine(data.date) : null, fmTags = readTags(Array.isArray(data.tags) ? data.tags.join(',') : typeof data.tags === 'string' ? data.tags : '');
  // Session AV lane 2 (r3-notes; LEDGER #272): ZIGoals' own Markdown export carries its journal, template, period, night,
  // opening day and creation time in the front matter (`app: ZIGoals`); other apps' files are read as before.
  const ours = data.app === 'ZIGoals';
  const fmCreated = ours && typeof data.created === 'string' && Number.isFinite(Date.parse(data.created)) ? new Date(Date.parse(data.created)).toISOString() : null;
  const fmBook = ours && typeof data.journal === 'string' && data.journal.trim() && data.journal.trim().toLowerCase() !== MAIN_JOURNAL.name.toLowerCase() ? data.journal.trim().slice(0, 40) : null;
  const fmTemplate = ours && typeof data.template === 'string' && /^[a-z0-9-]{1,40}$/.test(data.template) ? data.template : null;
  const fmExtra = ours ? extraOf(data as Record<string, unknown>) : undefined;
  if (ours) body = body.replace(/\n*(?:!\[[^\]\n]*\]\(\.\.\/(?:photos|audios)\/[^)\n]+\)\s*)+$/, ''); // its photos, named beside it
  // Session AV lane 2 (review B3C-5): ZIGi's follow-up, written after the words as a quote block, is the entry's follow-up
  // again, not part of its words (so the entry already in the journal is recognised and nothing doubles).
  const quote = ours && data['follow-up'] === FOLLOW_UP_MARK ? followUpOfQuote(body) : null;
  if (quote) body = quote.text;
  const fmFollowUp = quote ? {question: quote.followUp.question.slice(0, 300), ...(quote.followUp.answer ? {answer: quote.followUp.answer.slice(0, 2000)} : {})} : undefined;
  const lines = body.split('\n'), heads = lines.map((l, i) => /^#{1,3}\s+/.test(l) && dayInLine(l) ? i : -1).filter(i => i >= 0);
  const out: PlannedEntry[] = [], skipped: ImportSkip[] = [];
  let cut = 0;
  const push = (date: string | null, words: string, label: string) => {
    const text = words.trim();
    if (!text) { skipped.push({name: label, reason: 'it has no words'}); return; }
    const day = date ?? today, c = clip(text); if (c.cut) cut++;
    out.push({date: day, text: c.text, createdAt: fmCreated ?? `${day}T12:00:00.000Z`, ...(fmTags.length ? {tags: fmTags} : {}), ...(fmBook ? {book: fmBook} : {}), ...(fmTemplate ? {template: fmTemplate} : {}), ...(fmExtra && heads.length <= 1 ? {extra: fmExtra} : {}), ...(fmFollowUp && heads.length <= 1 ? {followUp: fmFollowUp} : {}), ...(fmCreated && heads.length <= 1 ? {own: true} : {}), source, photos: [], audio: []});
  };
  if (heads.length > 1 || (heads.length === 1 && !fmDate)) {
    heads.forEach((h, k) => push(dayInLine(lines[h]!), lines.slice(h + 1, heads[k + 1] ?? lines.length).join('\n'), `${file.name}: ${lines[h]!.replace(/^#+\s*/, '')}`));
    const before = lines.slice(0, heads[0]).join('\n').trim();
    if (before) push(fmDate ?? dayInLine(file.name), before, file.name);
  } else {
    const first = lines.find(l => l.trim()) ?? '', firstDay = dayInLine(first) && first.replace(/^#+\s*/, '').trim().length <= 40 ? dayInLine(first) : null;
    const words = firstDay ? lines.slice(lines.indexOf(first) + 1).join('\n') : body;
    push(fmDate ?? dayInLine(baseName(file.name)) ?? firstDay, words, file.name);
  }
  return {entries: out, skipped, cut};
}
/** An HTML page's words (Apple Journal exports one page per entry): blocks as lines, entities read, tags gone. */
export function htmlWords(html: string): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return body.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
export function readHtmlFile(file: InFile, today: string): {entries: PlannedEntry[]; skipped: ImportSkip[]; cut: number} {
  const words = htmlWords(file.text), lines = words.split('\n').filter(Boolean);
  const head = lines.slice(0, 3).map(dayInLine).find(Boolean) ?? null, date = dayInLine(baseName(file.name)) ?? head;
  const text = head && lines[0] && dayInLine(lines[0]) === head && lines[0].length <= 40 ? lines.slice(1).join('\n') : words;
  return readTextFile({name: `${baseName(file.name)}.txt`, text: date ? `---\ndate: ${date}\n---\n${text}` : text}, today);
}
/* ---- Session AV lane 2 (r6-notes; LEDGER #410, Diarium's imports from more journal apps) ------------------------ */
type JourneyEntry = {id?: unknown; text?: unknown; type?: unknown; date_journal?: unknown; date_modified?: unknown; timezone?: unknown; tags?: unknown; photos?: unknown; favourite?: unknown};
const isJourney = (x: unknown): x is JourneyEntry => !!x && typeof x === 'object' && typeof (x as JourneyEntry).date_journal === 'number' && 'text' in (x as object);
/** A time in milliseconds as an ISO stamp, or null when it is outside the calendar (`new Date` would throw on it). */
const isoOf = (ms: number): string | null => { const d = new Date(ms); return Number.isFinite(d.getTime()) ? d.toISOString() : null; };
/** Whether a JSON file is Journey's: one entry with `date_journal`, or a list of them. */
export function isJourneyJson(text: string): boolean {
  try { const d: unknown = JSON.parse(text); return isJourney(d) || (Array.isArray(d) && d.length > 0 && d.every(isJourney)); } catch { return false; }
}
/** A photo of a Journey entry, by its file's name, as the ZIP reader keeps it (`journey/<name>`). */
export const journeyPhotoKey = (name: string) => `journey/${name.split('/').pop()!}`;
/**
 * Journey's export: a ZIP with one JSON file per entry (`text` in HTML or Markdown, `date_journal` in milliseconds, its
 * `timezone`, `tags`, `photos` named by the files beside it, `favourite`), or the JSON alone. Each entry keeps its day
 * in its own time zone, its words (HTML read as words), tags, up to 12 photos and the star. Nothing in a file runs.
 */
export function readJourneyJson(file: InFile, zone?: string): {entries: PlannedEntry[]; skipped: ImportSkip[]; cut: number} {
  let data: unknown;
  try { data = JSON.parse(file.text); } catch { return {entries: [], skipped: [{name: file.name, reason: 'it is not a JSON file ZIGoals can read'}], cut: 0}; }
  const list = Array.isArray(data) ? data : [data], entries: PlannedEntry[] = [], skipped: ImportSkip[] = [];
  let cut = 0;
  for (const [i, e] of list.entries()) {
    const label = list.length > 1 ? `${file.name} #${i + 1}` : file.name;
    if (!isJourney(e)) { skipped.push({name: label, reason: 'it is not a Journey entry'}); continue; }
    const ms = e.date_journal as number, created = ms > 0 ? isoOf(ms) : null; // review b6n B6N-5: a time outside the calendar skips this entry only
    const date = created ? dayIn(created, typeof e.timezone === 'string' ? e.timezone : zone) : null;
    if (!date || !created) { skipped.push({name: label, reason: 'it has no date ZIGoals can read'}); continue; }
    const raw = typeof e.text === 'string' ? e.text : '', words = (e.type === 'html' || /<\/?(?:p|div|br|span|h\d|li|ul|ol|b|i|strong|em)\b/i.test(raw) ? htmlWords(raw) : raw.replace(/\r\n?/g, '\n')).trim();
    const photos = Array.isArray(e.photos) ? e.photos.filter((x): x is string => typeof x === 'string' && !!x.trim()).map(journeyPhotoKey).slice(0, MAX_ENTRY_PHOTOS_ALL) : [];
    if (!words && !photos.length) { skipped.push({name: label, reason: 'it has no words or photo'}); continue; }
    const c = clip(words || (photos.length > 1 ? 'Photos.' : 'A photo.')); if (c.cut) cut++;
    const tags = Array.isArray(e.tags) ? readTags(e.tags.filter((t): t is string => typeof t === 'string').join(',')) : [];
    const mod = typeof e.date_modified === 'number' && e.date_modified > ms ? isoOf(e.date_modified) ?? undefined : undefined;
    entries.push({date, text: c.text, createdAt: created, ...(mod ? {updatedAt: mod} : {}), ...(tags.length ? {tags} : {}), ...(e.favourite === true ? {extra: {star: true as const}} : {}), source: 'journey', photos, audio: []});
  }
  return {entries, skipped, cut};
}
/** One CSV line set read into rows (RFC 4180: quoted cells, "" for a quote, line breaks inside quotes). */
export function csvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) { if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += ch; continue; }
    if (ch === '"' && !cell) quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(c => c.trim())) rows.push(row); row = []; }
    else cell += ch;
    if (rows.length > MAX_ENTRIES + 1) break;
  }
  row.push(cell); if (row.some(c => c.trim())) rows.push(row);
  return rows;
}
const CSV_DATE = /^(?:date|datum|day|dag|created|creation date|date created)$/i, CSV_TEXT = /^(?:text|tekst|entry|content|inhoud|body|note|notes|notitie)$/i, CSV_TAGS = /^(?:tags?|labels?|categor(?:y|ies))$/i;
/**
 * A CSV of entries: a row per entry with its date, words and tags. The columns are found by their header (date, text,
 * tags, in English or Dutch); without a header row they are read as date, text, tags. Commas or semicolons both work.
 */
export function readCsvFile(file: InFile, today: string): {entries: PlannedEntry[]; skipped: ImportSkip[]; cut: number} {
  const first = file.text.split(/\r?\n/, 1)[0] ?? '', delimiter = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows = csvRows(file.text, delimiter), head = rows[0]?.map(h => h.trim()) ?? [];
  const named = head.some(h => CSV_DATE.test(h)) && head.some(h => CSV_TEXT.test(h));
  const col = named ? {date: head.findIndex(h => CSV_DATE.test(h)), text: head.findIndex(h => CSV_TEXT.test(h)), tags: head.findIndex(h => CSV_TAGS.test(h))} : {date: 0, text: 1, tags: 2};
  const entries: PlannedEntry[] = [], skipped: ImportSkip[] = [];
  let cut = 0;
  for (const [i, r] of (named ? rows.slice(1) : rows).entries()) {
    const label = `${file.name} row ${i + (named ? 2 : 1)}`, rawDate = (r[col.date] ?? '').trim(), words = (r[col.text] ?? '').replace(/\r\n?/g, '\n').trim();
    const date = dayInLine(rawDate) ?? (() => { const m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/.exec(rawDate); if (!m) return null; const d = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`; return validDay(d) ? d : null; })();
    if (!date) { skipped.push({name: label, reason: rawDate ? 'its date cannot be read (use 2026-11-03 or 3-11-2026)' : 'it has no date'}); continue; }
    if (!words) { skipped.push({name: label, reason: 'it has no words'}); continue; }
    const c = clip(words); if (c.cut) cut++;
    const tags = col.tags >= 0 ? readTags((r[col.tags] ?? '').replace(/;/g, ',')) : [];
    entries.push({date, text: c.text, createdAt: `${date}T12:00:00.000Z`, ...(tags.length ? {tags} : {}), source: 'csv', photos: [], audio: []});
  }
  if (!rows.length) skipped.push({name: file.name, reason: 'it holds no rows'});
  void today;
  return {entries, skipped, cut};
}
/** The plan for every file read: entries in date order, duplicates (with the journal or each other) left out and said. */
export function planJournalImport(journal: Journal, files: readonly InFile[], {today, zone, skipped: already = []}: {today: string; zone?: string; skipped?: readonly ImportSkip[]}): JournalImportPlan {
  const entries: PlannedEntry[] = [], skipped: ImportSkip[] = [...already], books: string[] = [];
  let cut = 0;
  for (const f of files) {
    // Session AV lane 2 (r6-notes; LEDGER #410): Journey's JSON entries and a CSV of entries.
    const r = /\.json$/i.test(f.name) && isJourneyJson(f.text) ? {...readJourneyJson(f, zone), book: null} : /\.csv$/i.test(f.name) ? {...readCsvFile(f, today), book: null} : /\.json$/i.test(f.name) ? readDayOneJson(f, zone) : /\.html?$/i.test(f.name) ? {...readHtmlFile(f, today), book: null} : /\.(?:md|markdown|txt)$/i.test(f.name) ? {...readTextFile(f, today), book: null} : null;
    if (!r) { skipped.push({name: f.name, reason: 'it is not a journal file ZIGoals reads (Day One or Journey JSON, Markdown, text, HTML or CSV)'}); continue; }
    entries.push(...r.entries); skipped.push(...r.skipped); cut += r.cut;
  }
  // Session AV lane 2 (review B3C-5): an entry from ZIGoals' own Markdown is also known by its day and creation time, so it
  // is recognised even when its words were changed here since the export.
  const seen = new Set(journal.entries.map(e => `${e.date}\n${e.text.trim()}`)), made = new Set(journal.entries.map(e => `${e.date}\n${e.createdAt}`)), kept: PlannedEntry[] = [];
  for (const e of entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const key = `${e.date}\n${e.text.trim()}`, at = `${e.date}\n${e.createdAt}`;
    if (seen.has(key) || (e.own && made.has(at))) { skipped.push({name: `${e.date}: ${e.text.slice(0, 40)}`, reason: 'it is already in your journal'}); continue; }
    if (e.date > today) { skipped.push({name: `${e.date}: ${e.text.slice(0, 40)}`, reason: 'its day is still to come'}); continue; }
    seen.add(key); if (e.own) made.add(at); kept.push(e);
    if (e.book && !books.some(b => b.toLowerCase() === e.book!.toLowerCase()) && e.book.toLowerCase() !== MAIN_JOURNAL.name.toLowerCase()) books.push(e.book);
  }
  const room = MAX_ENTRIES - journal.entries.length;
  if (kept.length > room) { for (const e of kept.slice(room)) skipped.push({name: `${e.date}: ${e.text.slice(0, 40)}`, reason: `the journal keeps at most ${MAX_ENTRIES.toLocaleString('en-US')} entries`}); kept.length = Math.max(0, room); }
  return {entries: kept, skipped, books, cut};
}
export type ImportUndo = {entries: string[]; books: string[]; media: string[]};
/**
 * Applies a plan: its journals made (an existing one of the same name is used; past ten, entries go to the main
 * Journal), its entries added with the media ids kept for them (`media`: zip file name → id), each marked `imported`.
 */
export function applyJournalImport(journal: Journal, plan: JournalImportPlan, media: ReadonlyMap<string, string>, newId: () => string = () => crypto.randomUUID()): {journal: Journal; undo: ImportUndo} {
  const books = [...booksOf(journal)], made: string[] = [], byName = new Map(books.map(b => [b.name.toLowerCase(), b.id]));
  for (const name of plan.books) {
    if (byName.has(name.toLowerCase()) || books.length >= MAX_JOURNALS) continue;
    const id = newJournalId(); books.push({id, name, theme: (['teal', 'cyan', 'magenta', 'gold', 'green', 'violet'] as const)[books.length % 6]!}); byName.set(name.toLowerCase(), id); made.push(id);
  }
  const added: JournalEntry[] = [], used: string[] = [];
  for (const e of plan.entries) {
    const all = e.photos.flatMap(f => media.get(f) ? [media.get(f)!] : []), photos = all.slice(0, MAX_ENTRY_PHOTOS), morePhotos = all.slice(MAX_ENTRY_PHOTOS, MAX_ENTRY_PHOTOS_ALL), audio = e.audio.flatMap(a => media.get(a.file) ? [{id: media.get(a.file)!, seconds: a.seconds}] : []);
    used.push(...photos, ...morePhotos, ...audio.map(a => a.id));
    const book = e.book ? byName.get(e.book.toLowerCase()) : undefined;
    added.push({...(e.extra ?? {}), id: newId(), date: e.date, text: e.text, createdAt: e.createdAt, ...(e.updatedAt ? {updatedAt: e.updatedAt} : {}), ...(e.tags?.length ? {tags: e.tags} : {}), ...(book ? {journal: book} : {}), ...(e.template ? {template: e.template} : {}), ...(photos.length ? {photos} : {}), ...(morePhotos.length ? {morePhotos} : {}), ...(audio.length ? {audio} : {}), ...(e.followUp ? {followUp: {question: e.followUp.question, from: 'device' as const, ...(e.followUp.answer ? {answer: e.followUp.answer} : {})}} : {}), imported: e.source});
  }
  const entries = [...journal.entries, ...added].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {journal: journalSchema.parse({...journal, entries, journals: books}), undo: {entries: added.map(e => e.id), books: made, media: used}};
}
/** Undo of an import: its entries and the journals it made go (entries written since stay; media is left to the sweep). */
export function undoJournalImport(journal: Journal, undo: ImportUndo): Journal {
  const gone = new Set(undo.entries), books = new Set(undo.books);
  return journalSchema.parse({...journal, entries: journal.entries.filter(e => !gone.has(e.id)).map(e => e.journal && books.has(e.journal) ? (({journal: _j, ...rest}) => { void _j; return rest; })(e) : e), journals: booksOf(journal).filter(b => !books.has(b.id))});
}
