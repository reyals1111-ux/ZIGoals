import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from '../device-record';
import {STAKING_JOURNAL_KEY} from '../af-signing-keys';

/**
 * Session AF (ADR-028 H46, H60, L2 design §12; `TIER 3 (storage)`): the staking and vote transactions signed on this
 * device, so the pending → confirmed screen survives a reload and the person keeps every hash.
 * `{version: 1, entries: [{operationId, chainId, wallet, action, validator?, validators?, destination?, proposalId?,
 *   option?, amount, state, hash?, height?, code?, at, updatedAt?}]}` — at most 200 entries, the oldest dropped first.
 * - **States** are lib/transaction-journal.ts's (AWAITING_SIGNATURE → BROADCASTING → CONFIRMING → CONFIRMED | FAILED |
 *   REJECTED | UNKNOWN_AFTER_BROADCAST) with the same allowed moves; a finished entry never changes again.
 * - **Loose and versioned:** unknown fields of the record and of each entry are kept through every write; an entry this
 *   build cannot read is kept and left out of what it shows; a record that cannot be read is never overwritten.
 * - **Personal, device-only:** an address and amounts; in Export everything, erased with the account, never synced, never
 *   restored. Older builds never read the key.
 */
export {STAKING_JOURNAL_KEY};
export const MAX_STAKING_JOURNAL = 200;
export const STAKING_ACTIONS = ['delegate', 'undelegate', 'redelegate', 'claim', 'sweep', 'vote'] as const;
export type StakingAction = typeof STAKING_ACTIONS[number];
export const STAKING_JOURNAL_STATES = ['AWAITING_SIGNATURE', 'BROADCASTING', 'CONFIRMING', 'CONFIRMED', 'FAILED', 'REJECTED', 'UNKNOWN_AFTER_BROADCAST'] as const;
export type StakingJournalState = typeof STAKING_JOURNAL_STATES[number];
const NEXT: Record<StakingJournalState, readonly StakingJournalState[]> = {
  AWAITING_SIGNATURE: ['BROADCASTING', 'FAILED', 'REJECTED'],
  BROADCASTING: ['CONFIRMING', 'UNKNOWN_AFTER_BROADCAST', 'CONFIRMED', 'FAILED'],
  CONFIRMING: ['UNKNOWN_AFTER_BROADCAST', 'CONFIRMED', 'FAILED'],
  UNKNOWN_AFTER_BROADCAST: ['CONFIRMED', 'FAILED'],
  CONFIRMED: [], FAILED: [], REJECTED: [],
};
export const isFinished = (state: StakingJournalState) => state === 'CONFIRMED' || state === 'FAILED' || state === 'REJECTED';

const text = (max: number) => z.string().max(max).optional();
const entrySchema = z.looseObject({
  operationId: text(64), chainId: text(32), wallet: text(100), action: text(24),
  validator: text(100), validators: z.array(z.string().max(100)).max(100).optional(), destination: text(100),
  proposalId: text(24), option: text(24), amount: text(80), state: text(32),
  hash: text(64), height: text(24), code: z.number().int().min(0).max(0xffffffff).optional(),
  at: text(40), updatedAt: text(40),
});
export const stakingJournalSchema = z.looseObject({version: z.literal(1), entries: z.array(entrySchema).max(MAX_STAKING_JOURNAL * 2).optional()});
export type StakingJournal = z.infer<typeof stakingJournalSchema>;
type Entry = z.infer<typeof entrySchema>;
export type StakingJournalEntry = {
  operationId: string; chainId: string; wallet: string; action: StakingAction; amount: string; state: StakingJournalState; at: string;
  validator?: string; validators?: string[]; destination?: string; proposalId?: string; option?: string;
  hash?: string; height?: string; code?: number; updatedAt?: string;
};
export const emptyStakingJournal = (): StakingJournal => ({version: 1});
export const STAKING_JOURNAL: DeviceRecordSpec<StakingJournal> = {key: STAKING_JOURNAL_KEY, schema: stakingJournalSchema, empty: emptyStakingJournal};

const INTEGER = /^(0|[1-9]\d{0,77})$/, HASH = /^[0-9A-F]{64}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isState = (v: unknown): v is StakingJournalState => (STAKING_JOURNAL_STATES as readonly unknown[]).includes(v);
const isAction = (v: unknown): v is StakingAction => (STAKING_ACTIONS as readonly unknown[]).includes(v);
function complete(e: Entry): e is Entry & StakingJournalEntry {
  return typeof e.operationId === 'string' && UUID.test(e.operationId) && typeof e.chainId === 'string' && e.chainId.length > 0
    && typeof e.wallet === 'string' && e.wallet.length > 0 && isAction(e.action) && typeof e.amount === 'string' && INTEGER.test(e.amount)
    && isState(e.state) && typeof e.at === 'string' && !Number.isNaN(Date.parse(e.at)) && (e.hash === undefined || HASH.test(e.hash))
    && (e.height === undefined || /^[1-9]\d{0,19}$/.test(e.height));
}
/** The entries this build can show, newest first, each operation once. */
export function stakingEntriesOf(record: StakingJournal): StakingJournalEntry[] {
  const seen = new Set<string>();
  return (record.entries ?? []).filter(complete).filter(e => !seen.has(e.operationId) && !!seen.add(e.operationId))
    .map(e => e as StakingJournalEntry).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
export type NewStakingEntry = Omit<StakingJournalEntry, 'operationId' | 'state' | 'at' | 'updatedAt' | 'hash' | 'height' | 'code'>;
export function newStakingEntry(input: NewStakingEntry, now = new Date(), operationId: string = crypto.randomUUID()): StakingJournalEntry {
  const entry: StakingJournalEntry = {...input, operationId, state: 'AWAITING_SIGNATURE', at: now.toISOString()};
  if (!complete(entry)) throw Error('This staking action could not be recorded, so nothing was signed.');
  return entry;
}
/** Adds an entry; past 200 the oldest are dropped (unreadable entries count and go first, oldest by position). */
export function withStakingEntry(record: StakingJournal, entry: StakingJournalEntry): StakingJournal {
  if (!complete(entry)) throw Error('This staking action could not be recorded, so nothing was signed.');
  const entries = [...(record.entries ?? [])];
  if (entries.some(e => e.operationId === entry.operationId)) throw Error('This staking action is already recorded.');
  entries.push(entry);
  while (entries.length > MAX_STAKING_JOURNAL) entries.shift();
  return {...record, entries};
}
export type StakingJournalPatch = {state: StakingJournalState; hash?: string; height?: string; code?: number};
/** Moves one entry along the allowed states; anything else throws and nothing is written. */
export function withStakingTransition(record: StakingJournal, operationId: string, patch: StakingJournalPatch, now = new Date()): StakingJournal {
  const entries = record.entries ?? [];
  const index = entries.findIndex(e => e.operationId === operationId);
  const current = index >= 0 ? entries[index]! : undefined;
  if (!current || !complete(current)) throw Error('This staking action is not in the journal.');
  if (current.state !== patch.state && !NEXT[current.state].includes(patch.state)) throw Error('This staking action cannot move to that state.');
  if (current.hash && patch.hash && current.hash !== patch.hash.toUpperCase()) throw Error('A different transaction hash was reported for this action.');
  const next: Entry = {...current, state: patch.state, updatedAt: now.toISOString(),
    ...(patch.hash ? {hash: patch.hash.toUpperCase()} : {}), ...(patch.height ? {height: patch.height} : {}), ...(patch.code !== undefined ? {code: patch.code} : {})};
  if (!complete(next)) throw Error('This staking action could not be updated.');
  return {...record, entries: entries.map((e, i) => i === index ? next : e)};
}
type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
export const readStakingJournal = (storage: Read) => readDeviceRecord(storage, STAKING_JOURNAL);
export function updateStakingJournal(storage: ReadWrite, change: (record: StakingJournal) => StakingJournal): StakingJournal {
  if (readStakingJournal(storage).unreadable) throw Error('Your staking history could not be read on this device, so nothing was changed.');
  return updateDeviceRecord(storage, STAKING_JOURNAL, change);
}
