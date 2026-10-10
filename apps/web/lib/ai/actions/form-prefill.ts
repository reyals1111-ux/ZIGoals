import {ACCOUNT_KINDS, type AccountKind} from '../../accounts/schema';

/**
 * Two more money hand-offs (Session Z-Local Part 5, docs/product/ZIGI_ACTIONS_Z.md): ZIGi never records a contribution
 * and never creates an account. A confirmed `prefill-contribution` card stashes the goal, the amount, the asset and the
 * date in this tab's session storage and opens the goal's own page at its funding (`contributionPrefillRoute`); a
 * confirmed `prefill-account` card stashes the account's name, kind, currency, institution, opening balance and rate
 * and opens Wealth at its accounts. The page reads its stash once, opens its own form filled in, and forgets it; the
 * person reviews and saves, or closes the form. Nothing is written before that and nothing moves money. Plain field
 * texts, read with plain checks, as `balance-prefill.ts` (the runner stashes; the pages take).
 */
export const CONTRIBUTION_PREFILL_KEY = 'zigoals:ai:contribution-prefill:v1';
export const ACCOUNT_PREFILL_KEY = 'zigoals:ai:account-prefill:v1';
/** Told after a hand-off is written, so a page already on screen reads it too. */
export const CONTRIBUTION_PREFILL_EVENT = 'zigoals:ai:contribution-prefill';
export const ACCOUNT_PREFILL_EVENT = 'zigoals:ai:account-prefill';
export const ACCOUNT_PREFILL_ROUTE = '/app/wealth#accounts-title';
export const contributionPrefillRoute = (goalId: string): string => `/app/goals/${encodeURIComponent(goalId)}#funding-wealth`;
const MAX_AGE_MS = 10 * 60_000, AMOUNT = /^\d{1,16}(\.\d{1,8})?$/, DAY = /^\d{4}-\d{2}-\d{2}$/, RATE = /^\d{1,3}(\.\d{1,4})?$/;
export type ContributionPrefillInput = {goalId: string; goal: string; amount: string; asset: string; date: string; note?: string};
export type AccountPrefillInput = {name: string; accountKind: AccountKind; currency?: string; institution?: string; balance?: string; ratePercent?: string; date: string};
type Stamped<T> = T & {version: 1; at: number};

function stamped(value: unknown, allowed: readonly string[]): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>, keys = new Set(allowed);
  if (o.version !== 1 || typeof o.at !== 'number' || !Number.isInteger(o.at) || o.at < 0 || Object.keys(o).some(k => !keys.has(k))) return null;
  return o;
}
const text = (value: unknown, max: number): string => typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
const optionalText = (value: unknown, max: number, pattern?: RegExp): {ok: true; value?: string} | {ok: false} => {
  if (value === undefined) return {ok: true};
  if (typeof value !== 'string') return {ok: false};
  const v = value.trim(); if (!v || v.length > max || (pattern && !pattern.test(v))) return {ok: false};
  return {ok: true, value: v};
};

export function readContributionPrefill(value: unknown): Stamped<ContributionPrefillInput> | null {
  const o = stamped(value, ['version', 'at', 'goalId', 'goal', 'amount', 'asset', 'date', 'note']); if (!o) return null;
  const goalId = text(o.goalId, 80), goal = text(o.goal, 100), amount = text(o.amount, 40), asset = text(o.asset, 30), date = typeof o.date === 'string' ? o.date : '';
  if (!/^\d+$/.test(goalId) || !goal || !AMOUNT.test(amount) || !asset || !DAY.test(date)) return null;
  const note = optionalText(o.note, 200); if (!note.ok) return null;
  return {version: 1, at: o.at as number, goalId, goal, amount, asset, date, ...(note.value ? {note: note.value} : {})};
}
export function readAccountPrefill(value: unknown): Stamped<AccountPrefillInput> | null {
  const o = stamped(value, ['version', 'at', 'name', 'accountKind', 'currency', 'institution', 'balance', 'ratePercent', 'date']); if (!o) return null;
  const name = text(o.name, 80), date = typeof o.date === 'string' ? o.date : '';
  if (!name || !(ACCOUNT_KINDS as readonly unknown[]).includes(o.accountKind) || !DAY.test(date)) return null;
  const currency = optionalText(o.currency, 3, /^[A-Z]{3}$/), institution = optionalText(o.institution, 80), balance = optionalText(o.balance, 40, AMOUNT), ratePercent = optionalText(o.ratePercent, 12, RATE);
  if (!currency.ok || !institution.ok || !balance.ok || !ratePercent.ok) return null;
  return {version: 1, at: o.at as number, name, accountKind: o.accountKind as AccountKind, date, ...(currency.value ? {currency: currency.value} : {}), ...(institution.value ? {institution: institution.value} : {}),
    ...(balance.value ? {balance: balance.value} : {}), ...(ratePercent.value ? {ratePercent: ratePercent.value} : {})};
}

const tab = (storage?: Storage) => storage ?? (typeof window === 'undefined' ? null : window.sessionStorage);
function stash(key: string, record: Record<string, unknown> | null, storage?: Storage): boolean {
  const target = tab(storage); if (!target || !record) return false;
  try { target.setItem(key, JSON.stringify(record)); return true; } catch { return false; }
}
function take<T extends {version: 1; at: number}>(key: string, read: (value: unknown) => T | null, now: number, storage?: Storage): Omit<T, 'version' | 'at'> | null {
  const target = tab(storage); if (!target) return null;
  let raw: string | null = null;
  try { raw = target.getItem(key); target.removeItem(key); } catch { return null; }
  if (raw === null) return null;
  try {
    const record = read(JSON.parse(raw)); if (!record) return null;
    if (now - record.at > MAX_AGE_MS || record.at > now + 60_000) return null;
    const {version: _version, at: _at, ...fields} = record; void _version; void _at;
    return fields;
  } catch { return null; }
}
/** Writes a hand-off; false when the tab's storage is unavailable (the person then fills the form by hand). */
export const stashContributionPrefill = (input: ContributionPrefillInput, now = Date.now(), storage?: Storage): boolean => stash(CONTRIBUTION_PREFILL_KEY, readContributionPrefill({version: 1, at: now, ...input}), storage);
export const stashAccountPrefill = (input: AccountPrefillInput, now = Date.now(), storage?: Storage): boolean => stash(ACCOUNT_PREFILL_KEY, readAccountPrefill({version: 1, at: now, ...input}), storage);
/** Reads a hand-off once and removes it; stale (older than ten minutes) or unreadable ones are dropped silently. */
export const takeContributionPrefill = (now = Date.now(), storage?: Storage): ContributionPrefillInput | null => take(CONTRIBUTION_PREFILL_KEY, readContributionPrefill, now, storage);
export const takeAccountPrefill = (now = Date.now(), storage?: Storage): AccountPrefillInput | null => take(ACCOUNT_PREFILL_KEY, readAccountPrefill, now, storage);
