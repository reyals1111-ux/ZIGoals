/**
 * Session AI (J14; `TIER 3 (egress routes)`): the only exchange requests the relay forwards — a host, a method and a path
 * each, all read-only (balances and the key's own permissions). Shared by the browser (to build a request) and the relay
 * (to refuse anything else). Docs read 2026-10-28 (docs/research/session-ai/EXCHANGES.md).
 */
export const EXCHANGES = ['kraken', 'coinbase', 'binance'] as const;
export type ExchangeId = (typeof EXCHANGES)[number];
export const EXCHANGE_NAMES: Record<ExchangeId, string> = {kraken: 'Kraken', coinbase: 'Coinbase', binance: 'Binance'};
export type ExchangeCall = 'permissions' | 'balances';
export const ROUTES: Readonly<Record<ExchangeId, Readonly<Record<ExchangeCall, {method: 'GET' | 'POST'; host: string; path: string}>>>> = {
  kraken: {permissions: {method: 'POST', host: 'api.kraken.com', path: '/0/private/GetApiKeyInfo'}, balances: {method: 'POST', host: 'api.kraken.com', path: '/0/private/BalanceEx'}},
  coinbase: {permissions: {method: 'GET', host: 'api.coinbase.com', path: '/api/v3/brokerage/key_permissions'}, balances: {method: 'GET', host: 'api.coinbase.com', path: '/api/v3/brokerage/accounts'}},
  binance: {permissions: {method: 'GET', host: 'api.binance.com', path: '/sapi/v1/account/apiRestrictions'}, balances: {method: 'GET', host: 'api.binance.com', path: '/api/v3/account'}},
};
/** The request headers the relay passes on (every other header is dropped): the key id and the signature, never a cookie. */
export const FORWARDED_HEADERS = ['api-key', 'api-sign', 'authorization', 'x-mbx-apikey', 'content-type'] as const;
export const isExchange = (value: unknown): value is ExchangeId => typeof value === 'string' && (EXCHANGES as readonly string[]).includes(value);
