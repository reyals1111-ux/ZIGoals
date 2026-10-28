import {expect, test, vi} from 'vitest';
import {exchangeRelay} from './exchange-relay';

/** Session AI (J14): the relay forwards only the listed read-only calls, only the signature headers, and stores nothing. */
const post = (body: unknown) => new Request('http://local/api/exchange', {method: 'POST', body: JSON.stringify(body)});
test('a listed call goes to its one host and path with only the signature headers; the answer comes back as data', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({error: [], result: {XXBT: {balance: '0.5'}}}), {status: 200}));
  const res = await exchangeRelay(post({exchange: 'kraken', call: 'balances', query: '', body: 'nonce=1', headers: {'API-Key': 'k', 'API-Sign': 's', 'Content-Type': 'application/x-www-form-urlencoded'}}), fetcher as unknown as typeof fetch);
  expect(await res.json()).toEqual({status: 200, data: {error: [], result: {XXBT: {balance: '0.5'}}}});
  const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://api.kraken.com/0/private/BalanceEx');
  expect(init.method).toBe('POST'); expect(init.body).toBe('nonce=1'); expect(init.redirect).toBe('error');
  expect([...(init.headers as Headers).keys()].sort()).toEqual(['api-key', 'api-sign', 'content-type']);
  expect(res.headers.get('cache-control')).toBe('no-store');
});
test('anything else is refused before a request leaves', async () => {
  const fetcher = vi.fn();
  for (const body of [
    {exchange: 'kraken', call: 'withdraw', headers: {}},
    {exchange: 'bitvavo', call: 'balances', headers: {}},
    {exchange: 'binance', call: 'balances', query: 'a=1\r\nHost: evil', headers: {}},
    {exchange: 'binance', call: 'balances', query: '', headers: {Cookie: 'x'}},
    {exchange: 'coinbase', call: 'balances', body: 'x', headers: {}},
    {exchange: 'coinbase', call: 'balances', headers: {Authorization: 'Bearer a\nb'}},
  ]) expect((await exchangeRelay(post(body), fetcher as unknown as typeof fetch)).status, JSON.stringify(body)).toBe(400);
  expect((await exchangeRelay(new Request('http://local/api/exchange', {method: 'GET'}), fetcher as unknown as typeof fetch)).status).toBe(405);
  expect((await exchangeRelay(new Request('http://local/api/exchange', {method: 'POST', body: 'x'.repeat(5000)}), fetcher as unknown as typeof fetch)).status).toBe(413);
  expect(fetcher).not.toHaveBeenCalled();
});
test('an unreachable exchange or a non-JSON answer is an error, never data', async () => {
  expect((await exchangeRelay(post({exchange: 'binance', call: 'permissions', query: 'timestamp=1&signature=ab', headers: {'X-MBX-APIKEY': 'k'}}), (async () => { throw Error('down'); }) as unknown as typeof fetch)).status).toBe(502);
  expect((await exchangeRelay(post({exchange: 'binance', call: 'permissions', query: '', headers: {}}), (async () => new Response('<html>')) as unknown as typeof fetch)).status).toBe(502);
});
