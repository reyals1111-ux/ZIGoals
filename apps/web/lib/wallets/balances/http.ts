import {BALANCE_ORIGINS} from './chains';

/**
 * Session AF (L2b, Part 3, ADR-028 H16 (c), H50): the one way the balance readers reach the network. Only the fixed read
 * hosts (lib/wallets/balances/chains.ts, the same list as `csp.app.connect`); no cookies (`credentials: 'omit'`), no
 * referrer, no redirect, no cache; a 12 s limit; at most 64 KiB read; a POST carries only `content-type: application/json`
 * (PublicNode answers its preflight, read 2026-10-18 22:36 UTC) and a GET no header at all (no preflight). Every failure
 * becomes a plain sentence the page shows, never a number.
 */
export const READ_TIMEOUT_MS = 12_000;
export const MAX_BODY = 64 * 1024;
export class BalanceReadError extends Error {}
export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
const host = (url: string) => { try { return new URL(url).hostname; } catch { return 'the service'; } };
export async function readJson(url: string, init: {method: 'GET'} | {method: 'POST'; body: string}, fetcher: Fetcher = (input, request) => fetch(input, request)): Promise<unknown> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !BALANCE_ORIGINS.includes(parsed.origin) || parsed.username || parsed.password) throw new BalanceReadError('That address is not one of ZIGoals’ balance sources.');
  let response: Response;
  try {
    response = await fetcher(url, {
      method: init.method, ...(init.method === 'POST' ? {body: init.body, headers: {'content-type': 'application/json'}} : {}),
      credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store', mode: 'cors', signal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
  } catch (error) {
    throw new BalanceReadError(error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError') ? `${host(url)} did not answer in time.` : `${host(url)} could not be reached just now.`);
  }
  if (!response.ok) { await response.body?.cancel().catch(() => undefined); throw new BalanceReadError(`${host(url)} answered with an error (HTTP ${response.status}).`); }
  const text = await response.text().catch(() => { throw new BalanceReadError(`${host(url)} stopped answering.`); });
  if (text.length > MAX_BODY) throw new BalanceReadError(`${host(url)} sent more than ZIGoals reads.`);
  try { return JSON.parse(text); } catch { throw new BalanceReadError(`${host(url)} sent something ZIGoals could not read.`); }
}
/** A JSON-RPC batch answer by id, with an error per call kept as a sentence. */
export function rpcResults(answer: unknown, ids: readonly number[], origin: string): Map<number, {result?: unknown; error?: string}> {
  if (!Array.isArray(answer)) throw new BalanceReadError(`${host(origin)} sent something ZIGoals could not read.`);
  const out = new Map<number, {result?: unknown; error?: string}>();
  for (const item of answer) {
    if (!item || typeof item !== 'object') continue;
    const {id, result, error} = item as {id?: unknown; result?: unknown; error?: {message?: unknown}};
    if (typeof id !== 'number' || !ids.includes(id) || out.has(id)) continue;
    out.set(id, error ? {error: `${host(origin)} refused the read${typeof error.message === 'string' ? `: ${error.message.slice(0, 120)}` : ''}.`} : {result});
  }
  return out;
}
