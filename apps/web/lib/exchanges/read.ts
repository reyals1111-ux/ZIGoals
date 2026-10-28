import type {ExchangeId} from './allowlist';

/**
 * Session AI (J14): what an exchange answered, read on the device. A key that can trade, withdraw or move money is
 * refused on the exchange's own word (fail closed: an unknown permission or a missing field refuses too). Balances are
 * decimal strings per asset; a zero is left out, an unreadable answer is an error, never a zero.
 */
export type PermissionVerdict = {ok: true} | {ok: false; reason: string};
const KRAKEN_READ = new Set(['query-funds', 'query-open-trades', 'query-closed-trades', 'query-ledger']);
const BINANCE_ALLOWED_TRUE = new Set(['enableReading', 'enableFixReadOnly']);
export function checkPermissions(exchange: ExchangeId, answer: unknown): PermissionVerdict {
  const a = answer as Record<string, unknown> | null;
  if (exchange === 'kraken') {
    const errors = (a?.error as unknown[] | undefined) ?? [];
    if (errors.length) return {ok: false, reason: `Kraken said: ${String(errors[0]).slice(0, 120)}`};
    const permissions = (a?.result as {permissions?: unknown} | undefined)?.permissions;
    if (!Array.isArray(permissions)) return {ok: false, reason: 'Kraken did not list the key\'s permissions, so it is not used.'};
    const extra = permissions.filter(p => typeof p !== 'string' || !KRAKEN_READ.has(p));
    if (extra.length) return {ok: false, reason: `This key can do more than read (${extra.map(String).join(', ')}). Create a key with only the Query permissions.`};
    if (!permissions.includes('query-funds')) return {ok: false, reason: 'This key cannot read balances: tick Query Funds.'};
    return {ok: true};
  }
  if (exchange === 'coinbase') {
    if (a?.can_view !== true) return {ok: false, reason: 'Coinbase did not confirm that this key can view.'};
    if (a?.can_trade !== false || a?.can_transfer !== false) return {ok: false, reason: 'This key can trade or transfer. Create a View-only key (Trade and Transfer off).'};
    return {ok: true};
  }
  if (!a || typeof a !== 'object' || a.enableReading !== true) return {ok: false, reason: 'Binance did not confirm that this key can read.'};
  const extra = Object.entries(a).filter(([k, v]) => /^(enable|permits)/.test(k) && !BINANCE_ALLOWED_TRUE.has(k) && v !== false);
  if (extra.length) return {ok: false, reason: `This key can do more than read (${extra.map(([k]) => k).join(', ')}). Leave only "Enable Reading" on.`};
  return {ok: true};
}
export type ExchangeBalance = {asset: string; amount: string};
const positive = (v: unknown) => typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) && /[1-9]/.test(v);
/** Kraken's own asset names, as the rest of the world writes them (the rest are kept as Kraken writes them). */
const KRAKEN_ASSETS: Readonly<Record<string, string>> = {XXBT: 'BTC', XBT: 'BTC', XETH: 'ETH', ZEUR: 'EUR', ZUSD: 'USD', XXRP: 'XRP', XLTC: 'LTC', XXLM: 'XLM', XZEC: 'ZEC'};
const add = (out: Map<string, number>, asset: string, amount: string) => out.set(asset, (out.get(asset) ?? 0) + Number(amount));
export function readBalances(exchange: ExchangeId, answer: unknown): ExchangeBalance[] {
  const a = answer as Record<string, unknown> | null, out = new Map<string, number>();
  if (exchange === 'kraken') {
    if ((a?.error as unknown[] | undefined)?.length || !a?.result || typeof a.result !== 'object') throw Error('Kraken did not answer with balances.');
    for (const [asset, v] of Object.entries(a.result as Record<string, {balance?: unknown}>)) if (positive(v?.balance)) add(out, KRAKEN_ASSETS[asset] ?? asset.replace(/\.(F|S|M|B|P)$/, ''), String(v.balance));
  } else if (exchange === 'coinbase') {
    if (!Array.isArray(a?.accounts)) throw Error('Coinbase did not answer with accounts.');
    for (const acc of a.accounts as {currency?: unknown; available_balance?: {value?: unknown}; hold?: {value?: unknown}}[]) {
      const v = Number(acc.available_balance?.value ?? 0) + Number(acc.hold?.value ?? 0);
      if (typeof acc.currency === 'string' && v > 0) add(out, acc.currency, String(v));
    }
  } else {
    if (!Array.isArray(a?.balances)) throw Error('Binance did not answer with balances.');
    for (const b of a.balances as {asset?: unknown; free?: unknown; locked?: unknown}[]) { const v = Number(b.free ?? 0) + Number(b.locked ?? 0); if (typeof b.asset === 'string' && v > 0) add(out, b.asset, String(v)); }
  }
  return [...out].map(([asset, n]) => ({asset, amount: String(Number(n.toPrecision(15)))})).sort((x, y) => x.asset.localeCompare(y.asset));
}
