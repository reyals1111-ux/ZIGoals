/**
 * The balance hand-off (Session W Part 21, W7): ZIGi never records an account's balance. A confirmed
 * `update-account-balance` card stashes the account's name, the balance and the date in this tab's session storage and
 * opens Wealth at its accounts (`/app/wealth#accounts-title`, which also opens their fold on a phone); the accounts
 * section reads them once, opens that account's own balance form filled in, and forgets them. The person reviews and
 * saves, or closes the form; nothing is written before that, and nothing moves money. Plain field texts only, read with
 * plain checks (Wealth ships this module).
 */
export const BALANCE_PREFILL_KEY = 'zigoals:ai:balance-prefill:v1';
export const BALANCE_PREFILL_ROUTE = '/app/wealth#accounts-title';
/** Told after a hand-off is written, so accounts already on screen (the person is on Wealth) read it too. */
export const BALANCE_PREFILL_EVENT = 'zigoals:ai:balance-prefill';
const MAX_AGE_MS = 10 * 60_000;
export type BalancePrefillInput = {account: string; balance: string; currency?: string; date: string};
type BalancePrefillRecord = BalancePrefillInput & {version: 1; at: number};
export function readBalancePrefill(value: unknown): BalancePrefillRecord | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>, allowed = new Set(['version', 'at', 'account', 'balance', 'currency', 'date']);
  if (o.version !== 1 || typeof o.at !== 'number' || !Number.isInteger(o.at) || o.at < 0 || Object.keys(o).some(k => !allowed.has(k))) return null;
  const account = typeof o.account === 'string' ? o.account.trim() : '', balance = typeof o.balance === 'string' ? o.balance.trim() : '', date = typeof o.date === 'string' ? o.date : '';
  if (!account || account.length > 80 || !/^\d{1,16}(\.\d{1,8})?$/.test(balance) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (o.currency !== undefined && (typeof o.currency !== 'string' || !/^[A-Z]{3}$/.test(o.currency))) return null;
  return {version: 1, at: o.at, account, balance, date, ...(typeof o.currency === 'string' ? {currency: o.currency} : {})};
}
const tab = (storage?: Storage) => storage ?? (typeof window === 'undefined' ? null : window.sessionStorage);
/** Writes the hand-off; false when the tab's storage is unavailable (the person then types the balance). */
export function stashBalancePrefill(input: BalancePrefillInput, now = Date.now(), storage?: Storage): boolean {
  const target = tab(storage); if (!target) return false;
  const record = readBalancePrefill({version: 1, at: now, ...input}); if (!record) return false;
  try { target.setItem(BALANCE_PREFILL_KEY, JSON.stringify(record)); return true; } catch { return false; }
}
/** Reads the hand-off once and removes it; stale (older than ten minutes) or unreadable ones are dropped silently. */
export function takeBalancePrefill(now = Date.now(), storage?: Storage): BalancePrefillInput | null {
  const target = tab(storage); if (!target) return null;
  let raw: string | null = null;
  try { raw = target.getItem(BALANCE_PREFILL_KEY); target.removeItem(BALANCE_PREFILL_KEY); } catch { return null; }
  if (raw === null) return null;
  try {
    const record = readBalancePrefill(JSON.parse(raw)); if (!record) return null;
    if (now - record.at > MAX_AGE_MS || record.at > now + 60_000) return null;
    const {version: _version, at: _at, ...fields} = record; void _version; void _at;
    return fields;
  } catch { return null; }
}
/** The person's account a hand-off names: the same name (any case), else the one account whose name contains it. */
export function accountForPrefill<T extends {name: string; archivedAt?: string}>(accounts: readonly T[], name: string): T | null {
  const live = accounts.filter(a => !a.archivedAt), wanted = name.trim().toLowerCase();
  const exact = live.filter(a => a.name.trim().toLowerCase() === wanted);
  if (exact.length === 1) return exact[0]!;
  const partial = live.filter(a => a.name.toLowerCase().includes(wanted) || wanted.includes(a.name.trim().toLowerCase()));
  return partial.length === 1 ? partial[0]! : null;
}
