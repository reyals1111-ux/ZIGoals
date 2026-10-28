import {FORWARDED_HEADERS, ROUTES, isExchange, type ExchangeCall} from '../exchanges/allowlist';

/**
 * Session AI (J14; `TIER 3 (egress routes)`): the exchange relay. The exchanges' private APIs send no CORS headers, so the
 * browser's signed, read-only request goes through this same-origin route, which forwards it unchanged to the one host,
 * method and path the allowlist names for that call (balances or the key's own permissions) and returns the answer.
 * Stateless: nothing is logged, stored or cached; only the key id and signature headers are passed on (never a cookie);
 * bodies are capped; the secret never reaches it (Kraken and Binance sign with HMAC in the browser; Coinbase's token is
 * bound to one method and path for two minutes). Anything else is refused before any request leaves.
 */
export const MAX_BODY = 4_096, MAX_ANSWER = 512_000, TIMEOUT_MS = 15_000;
const CALLS: readonly ExchangeCall[] = ['permissions', 'balances'];
const json = (body: unknown, status: number) => Response.json(body, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'}});
export async function exchangeRelay(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return json({error: 'POST only.'}, 405);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({error: 'Too large.'}, 413);
  let input: {exchange?: unknown; call?: unknown; query?: unknown; body?: unknown; headers?: unknown};
  try { input = JSON.parse(text) as typeof input; } catch { return json({error: 'Not JSON.'}, 400); }
  if (!isExchange(input.exchange) || !CALLS.includes(input.call as ExchangeCall)) return json({error: 'Only the listed read-only calls are relayed.'}, 400);
  const route = ROUTES[input.exchange][input.call as ExchangeCall];
  const query = typeof input.query === 'string' ? input.query : '', body = typeof input.body === 'string' ? input.body : '';
  if (query.length > 1024 || !/^[A-Za-z0-9_.=&%-]*$/.test(query) || body.length > 1024 || (route.method === 'GET' && body)) return json({error: 'The request does not fit the read-only call.'}, 400);
  const headers = new Headers();
  for (const [name, value] of Object.entries((input.headers ?? {}) as Record<string, unknown>)) {
    if (typeof value !== 'string' || value.length > 2048 || /[\r\n]/.test(value)) return json({error: 'A header is not allowed.'}, 400);
    if (!(FORWARDED_HEADERS as readonly string[]).includes(name.toLowerCase())) return json({error: `The header ${name.slice(0, 40)} is not relayed.`}, 400);
    headers.set(name, value);
  }
  const url = `https://${route.host}${route.path}${query ? `?${query}` : ''}`;
  try {
    const answer = await fetcher(url, {method: route.method, headers, ...(route.method === 'POST' ? {body} : {}), redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS)});
    const raw = await answer.text();
    if (raw.length > MAX_ANSWER) return json({error: 'The exchange answered with too much.'}, 502);
    let data: unknown; try { data = JSON.parse(raw); } catch { return json({error: 'The exchange did not answer with JSON.', status: answer.status}, 502); }
    return json({status: answer.status, data}, 200);
  } catch { return json({error: 'The exchange could not be reached.'}, 502); }
}
