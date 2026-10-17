import type {Domain} from './cloud-sync';
import type {ExtrasStatus,SectionSync} from '../../components/vault-sync-controls';
import type {PortfolioStatus} from '../../components/portfolio-sync-choice';

/**
 * Session AD item 11 (ADR-026): Settings → Sync, one plain line per section. Pure: it reads only what the provider and
 * this device already know (the last sync of this session, the changes still waiting in the local outbox, sections kept
 * on this device after a cloud deletion, the extras' and the Portfolio's own outcomes, the Health consent, the network)
 * and answers what each row says. Nothing here syncs, stores or sends anything.
 *
 * The sync journal keeps no time per section, and its record is strict (older builds refuse a field they do not know),
 * so "Up to date · 10:42" is the time of this session's last sync on this device; the panel says so.
 */
export type SectionId = Domain | 'extras' | 'portfolio';
export const SECTION_LABELS: Record<SectionId, string> = {finance: 'Goals & Wealth', habits: 'Habits', health: 'Health', settings: 'Today', extras: 'The extras', portfolio: 'Portfolio'};
/** The order of the rows. */
export const SECTION_ORDER: readonly SectionId[] = ['finance', 'habits', 'health', 'settings', 'extras', 'portfolio'];
/** The four sections' device keys (lib/vault/account-data.ts `modules`, kept equal by section-status.test.ts) without loading their schemas. */
export const SECTION_KEYS: Record<Domain, string> = {finance: 'zigoals:platform:v1', habits: 'zigoals:habits:v1', health: 'zigoals:health:v1', settings: 'zigoals:settings:v1'};

export type SectionTone = 'ok' | 'waiting' | 'offline' | 'syncing' | 'error' | 'off';
/** `retry` names what "Try again" runs: the account sync (which also carries the extras and the Portfolio) or the Portfolio alone. */
export type SectionRow = {id: SectionId; label: string; text: string; tone: SectionTone; retry: 'account' | 'portfolio' | null; notice: string | null};
export type SectionInput = {
  online: boolean; busy: boolean; error: string; health: boolean; held: readonly Domain[];
  synced: Partial<Record<Domain, SectionSync>>; pending: Partial<Record<Domain, number>>;
  extras: ExtrasStatus | null; extrasOn: boolean;
  portfolio: PortfolioStatus | null; portfolioAt: string; portfolioOn: boolean;
};

export const SECTION_TEXT = {
  upToDate: (at: string) => `Up to date · ${at}`,
  waiting: (n: number) => `${n} ${n === 1 ? 'change' : 'changes'} waiting to sync`,
  offline: 'Offline — will sync when you’re back online',
  offlineWaiting: (n: number) => `Offline — ${n} ${n === 1 ? 'change' : 'changes'} will sync when you’re back online`,
  syncing: 'Syncing…',
  error: 'Couldn’t sync. Your changes are kept on this device.',
  notYet: 'Not synced yet in this session',
  held: 'Kept on this device only, because its cloud copy was deleted',
  merged: 'Updated with changes from your other device.',
  extrasOff: 'Off — the extras stay on this device',
  extrasRemoved: 'Off — the extras’ cloud copy was deleted',
  extrasWaiting: 'Waiting to sync',
  portfolioOff: 'Off — your Portfolio stays on this device',
  portfolioRemoved: 'Off — the Portfolio’s cloud copy was deleted',
  portfolioConflict: 'Needs your choice: your Portfolio changed here and in its cloud copy (see “Also sync my Portfolio” above)',
  portfolioStale: 'Waiting — open ZIGoals on a device that has your Portfolio',
} as const;
/** Shown instead of a Health row while Health sync is off in this tab. */
export const HEALTH_STAYS_LOCAL = 'Health stays on this device until you turn on Health sync.';
/** Under the list: the times are this session's (see above). */
export const SECTION_TIMES_NOTE = 'Times are from this session on this device.';

const row = (id: SectionId, text: string, tone: SectionTone, retry: SectionRow['retry'] = null, notice: string | null = null): SectionRow => ({id, label: SECTION_LABELS[id], text, tone, retry, notice});
/** What is the same for every section that takes part in the account sync: the network, a sync running, the last error. */
function shared(id: SectionId, input: SectionInput, waiting = 0, retry: SectionRow['retry'] = 'account'): SectionRow | null {
  if (!input.online) return row(id, waiting ? SECTION_TEXT.offlineWaiting(waiting) : SECTION_TEXT.offline, 'offline');
  if (input.busy) return row(id, SECTION_TEXT.syncing, 'syncing');
  if (input.error) return row(id, SECTION_TEXT.error, 'error', retry);
  return null;
}
function domainRow(id: Domain, input: SectionInput): SectionRow {
  if (input.held.includes(id)) return row(id, SECTION_TEXT.held, 'off');
  const waiting = input.pending[id] ?? 0, now = shared(id, input, waiting);
  if (now) return now;
  if (waiting > 0) return row(id, SECTION_TEXT.waiting(waiting), 'waiting');
  const synced = input.synced[id];
  if (synced) return row(id, SECTION_TEXT.upToDate(synced.at), 'ok', null, synced.merged ? SECTION_TEXT.merged : null);
  return row(id, SECTION_TEXT.notYet, 'waiting');
}
function extrasRow(input: SectionInput): SectionRow {
  const status = input.extras;
  if (status?.state === 'removed' || status?.state === 'deleted-elsewhere') return row('extras', SECTION_TEXT.extrasRemoved, 'off');
  if (!input.extrasOn || status?.state === 'off') return row('extras', SECTION_TEXT.extrasOff, 'off');
  const now = shared('extras', input);
  if (now) return now;
  if (!status) return row('extras', SECTION_TEXT.notYet, 'waiting');
  if (status.state === 'error') return row('extras', SECTION_TEXT.error, 'error', 'account');
  if (status.state !== 'synced') return row('extras', SECTION_TEXT.notYet, 'waiting');
  // The Health extras take part only with the Health consent; without it their "skipped" is expected, not a problem.
  const outcomes = status.outcomes.filter(o => input.health || o.section !== 'health');
  if (outcomes.some(o => o.state === 'error' || o.state === 'unreadable')) return row('extras', SECTION_TEXT.error, 'error', 'account');
  const waiting = outcomes.filter(o => o.state === 'waiting');
  if (waiting.length) return row('extras', SECTION_TEXT.extrasWaiting, 'waiting', null, waiting.map(o => o.message).filter(Boolean).join(' ') || null);
  const merged = outcomes.some(o => o.state === 'pulled' || o.state === 'merged');
  return row('extras', SECTION_TEXT.upToDate(status.at), 'ok', null, merged ? SECTION_TEXT.merged : null);
}
function portfolioRow(input: SectionInput): SectionRow {
  const status = input.portfolio;
  if (status?.state === 'removed' || status?.state === 'deleted') return row('portfolio', SECTION_TEXT.portfolioRemoved, 'off');
  if (!input.portfolioOn) return row('portfolio', SECTION_TEXT.portfolioOff, 'off');
  const now = shared('portfolio', input);
  if (now) return now;
  if (!status) return row('portfolio', SECTION_TEXT.notYet, 'waiting');
  if (status.state === 'error') return row('portfolio', SECTION_TEXT.error, 'error', 'portfolio');
  if (status.state === 'conflict') return row('portfolio', SECTION_TEXT.portfolioConflict, 'error');
  if (status.state === 'stale') return row('portfolio', SECTION_TEXT.portfolioStale, 'waiting');
  const at = input.portfolioAt;
  return row('portfolio', at ? SECTION_TEXT.upToDate(at) : SECTION_TEXT.notYet, at ? 'ok' : 'waiting', null, status.state === 'pulled' ? SECTION_TEXT.merged : null);
}
/** One row per section, in SECTION_ORDER; Health only while Health sync is on in this tab. */
export function sectionRows(input: SectionInput): SectionRow[] {
  return SECTION_ORDER.flatMap((id): SectionRow[] => {
    if (id === 'health' && !input.health) return [];
    if (id === 'extras') return [extrasRow(input)];
    if (id === 'portfolio') return [portfolioRow(input)];
    return [domainRow(id, input)];
  });
}
/** The changes still waiting in the local outbox, per section (entries name their section by its device key). */
export function pendingBySection(entries: readonly {domain: string}[]): Partial<Record<Domain, number>> {
  const counts: Partial<Record<Domain, number>> = {};
  for (const [domain, key] of Object.entries(SECTION_KEYS) as [Domain, string][]) { const n = entries.filter(e => e.domain === key).length; if (n) counts[domain] = n; }
  return counts;
}
