import * as z from 'zod';
import {DEVICE_PARTS, MAX_DEVICE_PART_CHARS, nextValue, summarizeValue, type DevicePart, type PlannedPart} from '../restore/plan';
import {TASKS} from '../tasks/schema';
import {CHECKLIST, CHECKLIST_DAYS} from '../checklist/schema';
import {PORTFOLIO_KEY} from '../portfolio/schema';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {write, type RW} from './backup-lists';

/**
 * Session AL (third pass, INT; TIER 3 (stored format), additive): the person's other device records in the encrypted
 * backup ("Keep a protected copy"), as four optional sections of format 4 (lib/vault/backup.ts). Until now the protected
 * copy held the four modules, Tasks and the Checklist; accounts and debts, the journal, the money log, notes, bills,
 * workouts and the rest were only in Export everything, which is not encrypted.
 *
 * Which records: exactly the device records "Restore from a backup" brings back from Export everything (DEVICE_PARTS in
 * lib/restore/plan.ts), so one judgement decides both. What that plan never restores (keys and secrets, push, ZIGi's
 * settings, usage and conversations, an import's undo, a run in progress, display choices, recent searches, linked
 * wallet addresses and their names, Earn progress, the staking journal, …) stays out of this file too. Tasks and the
 * Checklist keep their own sections (lib/vault/backup-lists.ts).
 *
 * - `wealthRecords`, `habitRecords`, `lifeRecords`: the plan's Goals and Wealth, Habits, and Today and Life parts.
 * - `healthRecords`: every Health part (workouts and daily energy included) and the Health-gated share of a record (ZIGi's
 *   health and diet notes), only when the person ticked "Include my Health records". Stricter than Export everything on
 *   purpose: the tick reads as "nothing about my health".
 *
 * A section is `{format, version: 1, records: {<part id>: <validated value>}}`. A record this device does not hold, or
 * holds only its empty value, is left out; one that does not read is left out and named. A restore validates the whole
 * section before writing anything, replaces each record it holds the way a readable restore's Replace does (the same
 * rules: a deleted goal's extras stay, a record's other share stays), keeps the replaced bytes as a recovery copy in this
 * browser, and leaves every record the file does not hold as it is. A record id this app does not know (a newer app's)
 * is skipped and counted, never an error.
 */
export type RecordSection = 'wealthRecords' | 'habitRecords' | 'lifeRecords' | 'healthRecords';
export const RECORD_SECTIONS: readonly RecordSection[] = ['wealthRecords', 'habitRecords', 'lifeRecords', 'healthRecords'];
export const isRecordSection = (name: string): name is RecordSection => (RECORD_SECTIONS as readonly string[]).includes(name);
export const RECORD_LABELS: Record<RecordSection, string> = {
  wealthRecords: 'More Goals and Wealth records (accounts, spending, bills…)',
  habitRecords: 'More Habits records (rules, extras, reminders…)',
  lifeRecords: 'Today and Life records (journal, notes, NOVA…)',
  healthRecords: 'More Health records (workouts, fasting, supplements…)',
};
export const RECORDS_UNREADABLE = (labels: string[]) => `${labels.join(', ')} could not be read on this device, so ${labels.length === 1 ? 'it is' : 'they are'} not in this backup; ${labels.length === 1 ? 'it stays' : 'they stay'} as ${labels.length === 1 ? 'it is' : 'they are'} here.`;
export const RECORDS_TOO_LARGE = (labels: string[]) => `${labels.join(', ')} ${labels.length === 1 ? 'is' : 'are'} larger than this device can restore (about 5 MB each), so ${labels.length === 1 ? 'it is' : 'they are'} not in this backup.`;
export const RECORDS_INVALID = 'This part of the backup did not read as expected, so nothing was changed.';
export const RECORDS_SKIPPED = (n: number) => `${n} ${n === 1 ? 'record was' : 'records were'} saved by a newer ZIGoals and left as ${n === 1 ? 'it is' : 'they are'}; update the app to restore ${n === 1 ? 'it' : 'them'}.`;

const SECTION_FORMAT = 'zigoals-device-records-backup';
export const recordSectionSchema = z.strictObject({
  format: z.literal(SECTION_FORMAT),
  version: z.literal(1),
  // The records stay loose here: each is validated by its own record's schema on preview and restore.
  records: z.record(z.string().min(1).max(200), z.unknown()),
});
const OWN_SECTIONS = new Set([TASKS.key, CHECKLIST.key, CHECKLIST_DAYS.key]);
const GROUP_SECTION = {'Goals and Wealth': 'wealthRecords', Habits: 'habitRecords', 'Today and Life': 'lifeRecords', Health: 'healthRecords'} as const;
/** The section a part travels in, or null (Photos, and Tasks and the Checklist, which have their own sections). */
export function sectionOf(part: DevicePart): RecordSection | null {
  if (OWN_SECTIONS.has(part.key)) return null;
  if (part.health) return 'healthRecords';
  return part.group === 'Photos' ? null : GROUP_SECTION[part.group];
}
// Read on use, never at load: lib/restore/plan.ts and this file's preview import each other through backup-preview.ts.
const partsOf = (name: RecordSection) => DEVICE_PARTS.filter(p => sectionOf(p) === name);
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const same = (a: unknown, b: unknown) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } };
/** A part's own share of a parsed value, or null when it holds nothing of it (an empty value counts as nothing). */
function share(part: DevicePart, parsed: unknown): unknown | null {
  if (part.slice) { const mine = part.slice.pick(parsed); return part.slice.has(mine) ? mine : null; }
  const empty = part.schema.safeParse(part.empty());
  return empty.success && same(empty.data, parsed) ? null : parsed;
}

/** The sections this device's records make (Health's only with `health`), and one warning for the records that could not be read. */
export function exportRecordSections(storage: Pick<Storage, 'getItem'>, {health}: {health: boolean}): {sections: Partial<Record<RecordSection, string>>; warnings: string[]} {
  const sections: Partial<Record<RecordSection, string>> = {}, unreadable: string[] = [], tooLarge: string[] = [];
  for (const name of RECORD_SECTIONS) {
    if (name === 'healthRecords' && !health) continue;
    const records: Record<string, unknown> = {};
    for (const part of partsOf(name)) {
      let raw: string | null;
      try { raw = storage.getItem(part.key); } catch { unreadable.push(part.label); continue; }
      if (raw === null) continue;
      if (raw.length > MAX_DEVICE_PART_CHARS) { tooLarge.push(part.label); continue; }
      let parsed: unknown;
      try { const result = part.schema.safeParse(JSON.parse(raw)); if (!result.success) throw Error('invalid'); parsed = result.data; } catch { unreadable.push(part.label); continue; }
      const mine = share(part, parsed);
      if (mine !== null) records[part.id] = mine;
    }
    if (Object.keys(records).length) sections[name] = JSON.stringify(recordSectionSchema.parse({format: SECTION_FORMAT, version: 1, records}));
  }
  const warnings = [...(unreadable.length ? [RECORDS_UNREADABLE([...new Set(unreadable)])] : []), ...(tooLarge.length ? [RECORDS_TOO_LARGE(tooLarge)] : [])];
  return {sections, warnings};
}

type Checked = {part: DevicePart; value: unknown};
/** Every record of a section, each validated by its own schema; ids this app does not know are counted, a record that does not read throws. */
function check(name: RecordSection, raw: string): {records: Checked[]; skipped: number} {
  let parsed: z.infer<typeof recordSectionSchema>;
  try { parsed = recordSectionSchema.parse(JSON.parse(raw)); } catch { throw Error(RECORDS_INVALID); }
  const parts = partsOf(name), records: Checked[] = [];
  let skipped = 0;
  for (const [id, value] of Object.entries(parsed.records)) {
    const part = parts.find(p => p.id === id);
    if (!part) { skipped++; continue; }
    const result = part.schema.safeParse(value);
    if (result.success) { records.push({part, value: result.data}); continue; }
    // A newer version of a record this app knows: left as it is here, like an unknown one.
    if (isObject(value) && typeof value.version === 'number' && value.version > 1) { skipped++; continue; }
    throw Error(RECORDS_INVALID);
  }
  return {records, skipped};
}

export type RecordSummary = {counts: {label: string; count: number}[]; choices: string[]; skipped: number; from: string | null; through: string | null};
/** The preview's counts for a validated section: each record's label and how many entries it holds (never a value). Throws when it does not read. */
export function summarizeRecordSection(name: RecordSection, raw: string): RecordSummary {
  const {records, skipped} = check(name, raw), counts: RecordSummary['counts'] = [], choices: string[] = [];
  let from: string | null = null, through: string | null = null;
  for (const {part, value} of records) {
    const s = summarizeValue(value), n = Number(/^\d+/.exec(s.counts)?.[0] ?? 0);
    if (n > 0) counts.push({label: part.label, count: n}); else choices.push(part.label);
    if (s.from && (!from || s.from < from)) from = s.from;
    if (s.through && (!through || s.through > through)) through = s.through;
  }
  return {counts, choices, skipped, from, through};
}

const announce = (key: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: key}));
  if (key === PORTFOLIO_KEY) window.dispatchEvent(new Event('zigoals:portfolio-change'));
};
/**
 * Restores one validated section on this device and answers what it did. Everything is validated before anything is
 * written; a write that fails puts back what was written before it, so the device holds either the restored records or
 * its own. Each replaced record's bytes stay as `<key>:recovery:<uuid>`.
 */
export function restoreRecordSection(storage: RW, name: RecordSection, raw: string): {restored: string[]; skipped: number} {
  const {records, skipped} = check(name, raw), pending = new Map<string, unknown>(), labels: string[] = [];
  for (const {part, value} of records) {
    let current: unknown;
    if (pending.has(part.key)) current = pending.get(part.key);
    else {
      const here = storage.getItem(part.key);
      // A copy here that does not read is replaced; its bytes are kept as the recovery copy.
      if (here !== null) try { const r = part.schema.safeParse(JSON.parse(here)); if (r.success) current = r.data; } catch { /* replaced, kept as a copy */ }
    }
    const planned: PlannedPart = {...part, value, summary: null};
    const next = nextValue(planned, 'replace', current);
    if ('error' in next) throw Error(RECORDS_INVALID);
    pending.set(part.key, next.value); labels.push(part.label);
  }
  const before = [...pending.keys()].map(key => [key, storage.getItem(key)] as const);
  try { for (const [key, value] of pending) write(storage, key, value); }
  catch (error) {
    for (const [key, text] of before) try { if (text === null) storage.removeItem(key); else storage.setItem(key, text); } catch { /* left as written */ }
    throw error;
  }
  for (const key of pending.keys()) announce(key);
  return {restored: labels, skipped};
}
