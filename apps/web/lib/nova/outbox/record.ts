import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {ZIGI_STORE_EVENT} from '../../ai/store/keys';

/**
 * Session AM-2 (owner's step 4, decision of 15 Nov): NOVA's outbox record, `zigoals:nova-outbox:v1`. "Sent out from this
 * device": the short history of what the person approved to leave this device through NOVA — a built-in hand-off (an
 * email draft opened in their own mail app, a calendar file, a share, a link, a copy: `kind: 'handoff'`) or one call to a
 * tool of the person's own agent or MCP server (`kind: 'tool'`). NOVA sends nothing by itself; every entry is something
 * the person pressed a button for.
 *
 * An entry holds when, what kind of thing it was (`what`: a few words, "Email draft", a tool's name), the target that was
 * shown on the card (`target`: an address, a host, a file's name) and whether it went through (`ok`). It never holds the
 * body: no mail text, no note, no shared text, no link's path or query, no tool arguments or results.
 *
 * A loose object, version 1, the list optional (absent: nothing yet), newest first, at most `MAX_OUTBOX` entries, each
 * field plain and bounded. Device only: exported, restored and erased; never synced. Reads are tolerant: an entry this
 * build cannot read (a `kind` a later build adds) is left out, the rest of the list still reads.
 */
export const NOVA_OUTBOX_KEY = 'zigoals:nova-outbox:v1';
export const MAX_OUTBOX = 200, MAX_OUTBOX_WHAT = 60, MAX_OUTBOX_TARGET = 160;
export const OUTBOX_KINDS = ['handoff', 'tool'] as const;
export type OutboxKind = (typeof OUTBOX_KINDS)[number];
export type OutboxEntry = {at: string; kind: OutboxKind; what: string; target: string; ok: boolean};

/** Control characters, and the direction overrides and invisible marks that could make a stored target read as another one. */
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/;
const UNSAFE_ALL = new RegExp(UNSAFE.source, 'g');
const iso = z.string().min(10).max(40).refine(s => !Number.isNaN(Date.parse(s)), 'A time.');
const plain = (max: number) => z.string().max(max).refine(s => !UNSAFE.test(s), 'Plain text.');
export const outboxEntrySchema = z.looseObject({
  at: iso,
  kind: z.enum(OUTBOX_KINDS),
  what: plain(MAX_OUTBOX_WHAT).min(1),
  target: plain(MAX_OUTBOX_TARGET),
  ok: z.boolean(),
});
/** The list as it reads: every entry this build understands, in its order, at most `MAX_OUTBOX` (a longer list keeps its newest). */
const entriesSchema = z.array(z.unknown()).transform(list => list.flatMap(item => { const read = outboxEntrySchema.safeParse(item); return read.success ? [read.data as OutboxEntry] : []; }).slice(0, MAX_OUTBOX));
export const novaOutboxSchema = z.looseObject({version: z.literal(1), entries: entriesSchema.optional()});
export type NovaOutbox = {version: 1; entries?: OutboxEntry[]} & Record<string, unknown>;
export const emptyOutbox = (): NovaOutbox => ({version: 1});
export const NOVA_OUTBOX: DeviceRecordSpec<NovaOutbox> = {key: NOVA_OUTBOX_KEY, schema: novaOutboxSchema as unknown as z.ZodType<NovaOutbox>, empty: emptyOutbox};

// ---- Reading ----
/** Newest first. */
export const outboxOf = (r: NovaOutbox): readonly OutboxEntry[] => r.entries ?? [];

// ---- Changes (pure; each returns a record the schema accepts) ----
const parse = (r: NovaOutbox): NovaOutbox => novaOutboxSchema.parse(r) as NovaOutbox;
/** One bounded, plain line: control and invisible characters become a space, runs of space one space. */
export const outboxLine = (text: string, max: number): string => String(text ?? '').replace(UNSAFE_ALL, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
/**
 * Adds an entry (newest first; the list keeps the newest `MAX_OUTBOX`). The words are cleaned to one bounded line each;
 * an entry without a `what`, with a time that is no time or with a kind this build does not know is not added (the
 * record comes back as it was). The caller passes the target the card showed — an address or a host — never a body.
 */
export function appendOutbox(record: NovaOutbox, entry: OutboxEntry): NovaOutbox {
  const next = {at: entry.at, kind: entry.kind, what: outboxLine(entry.what, MAX_OUTBOX_WHAT), target: outboxLine(entry.target, MAX_OUTBOX_TARGET), ok: entry.ok === true};
  if (!outboxEntrySchema.safeParse(next).success) return record;
  return parse({...record, entries: [next, ...outboxOf(record)].slice(0, MAX_OUTBOX)});
}
/** Forgets the whole history (the record stays, empty). */
export function clearOutbox(record: NovaOutbox): NovaOutbox { const next = {...record}; delete next.entries; return parse(next); }

// ---- On the device ----
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const announce = () => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: NOVA_OUTBOX_KEY})); };
/**
 * Writes one entry to the device's storage and tells the open views (components read the record with
 * `useDeviceRecord(NOVA_OUTBOX)`, components/ai/use-device-record.ts, like the stage record). The history is a
 * convenience: a record that cannot be read is left exactly as it is, and a refused write changes nothing; neither ever
 * stops the hand-off or the tool call the person approved. Returns whether the entry was written.
 */
export function noteOutbox(storage: Store, entry: OutboxEntry): boolean {
  try {
    const before = readDeviceRecord(storage, NOVA_OUTBOX);
    if (before.unreadable || appendOutbox(before.data, entry) === before.data) return false;
    updateDeviceRecord(storage, NOVA_OUTBOX, r => appendOutbox(r, entry));
    announce();
    return true;
  } catch { return false; }
}
/** Forgets the history on the device's storage; `false` when the write was refused. */
export function forgetOutbox(storage: Store): boolean {
  try { updateDeviceRecord(storage, NOVA_OUTBOX, clearOutbox); announce(); return true; } catch { return false; }
}
