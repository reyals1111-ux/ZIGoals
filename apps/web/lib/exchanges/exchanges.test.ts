import {expect, test} from 'vitest';
import {binanceSignature, coinbaseJwt, krakenSignature, signCall} from './sign';
import {checkPermissions, readBalances} from './read';
import {ROUTES} from './allowlist';

/** Session AI (J14): signing against the exchanges' published examples; fail-closed permission rules; parsers. */
test('Binance HMAC-SHA256 matches the example in Binance\'s request-security docs', async () => {
  expect(await binanceSignature('NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j', 'symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559'))
    .toBe('c8db56825ae71d6d79447849e617115f4a920fa2acdcab2b053c4b2838bd6b71');
});
test('Kraken HMAC-SHA512 matches the example in Kraken\'s spot REST authentication guide', async () => {
  expect(await krakenSignature('kQH5HW/8p1uGOVjbgWA7FunAmGO8lsSUXNsu3eow76sz84Q18fWxnyRzBHCd3pd5nE9qa99HAZtuZuj6F1huXg==', '/0/private/AddOrder', '1616492376594', 'nonce=1616492376594&ordertype=limit&pair=XBTUSD&price=37500&type=buy&volume=1.25'))
    .toBe('4/dpxb3iT4tp/ZCVEwSnEsLxx0bqyhLpdfOpc6fn7OR8+UClSV5n9E6aSS8MPtnRfp32bAb0nmbRn6H8ndwLUQ==');
});
test('Coinbase: a SEC1 PEM key signs an ES256 JWT that its public key verifies, with the claims Coinbase asks for', async () => {
  const pair = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey), raw = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
  const d = raw(jwk.d!), x = raw(jwk.x!), y = raw(jwk.y!);
  // SEC1: 30 77 02 01 01 04 20 <d> a0 0a 06 08 <prime256v1> a1 44 03 42 00 04 <x> <y>
  const der = new Uint8Array([0x30, 0x77, 0x02, 0x01, 0x01, 0x04, 0x20, ...d, 0xa0, 0x0a, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0xa1, 0x44, 0x03, 0x42, 0x00, 0x04, ...x, ...y]);
  let s = ''; for (const b of der) s += String.fromCharCode(b);
  // The key is generated above for this test only; the PEM armour is joined so the repository's secret scan (which
  // flags the literal header, scripts/secret-patterns.mjs) does not read it as a stored key, as secret-patterns.test.mjs does.
  const armour = (edge: string) => ['-----', edge, ' EC ', 'PRIVATE KEY-----'].join('');
  const pem = `${armour('BEGIN')}\n${btoa(s)}\n${armour('END')}`;
  const jwt = await coinbaseJwt('organizations/o/apiKeys/k', pem, 'GET', 'api.coinbase.com', '/api/v3/brokerage/accounts', Date.UTC(2026, 9, 28));
  const [h, c, sig] = jwt.split('.');
  const dec = (t: string) => JSON.parse(new TextDecoder().decode(raw(t)));
  expect(dec(h!)).toMatchObject({alg: 'ES256', kid: 'organizations/o/apiKeys/k', typ: 'JWT'});
  expect(dec(c!)).toMatchObject({iss: 'cdp', sub: 'organizations/o/apiKeys/k', uri: 'GET api.coinbase.com/api/v3/brokerage/accounts'});
  expect(dec(c!).exp - dec(c!).nbf).toBe(120);
  expect(await crypto.subtle.verify({name: 'ECDSA', hash: 'SHA-256'}, pair.publicKey, raw(sig!), new TextEncoder().encode(`${h}.${c}`))).toBe(true);
});
test('a signed call carries only the key id and a signature; the secret is never in it', async () => {
  const secret = btoa('fictional-secret-bytes-0123456789');
  const kraken = await signCall('kraken', 'balances', 'PUBLIC-KEY', secret, 1700000000000);
  expect(JSON.stringify(kraken)).not.toContain(secret);
  expect(Object.keys(kraken.headers).sort()).toEqual(['API-Key', 'API-Sign', 'Content-Type']);
  const binance = await signCall('binance', 'balances', 'PUBLIC', 'fictional-binance-secret', 1700000000000);
  expect(binance.query).toMatch(/^omitZeroBalances=true&recvWindow=10000&timestamp=1700000000000&signature=[0-9a-f]{64}$/);
  expect(JSON.stringify(binance)).not.toContain('fictional-binance-secret');
  expect(ROUTES.kraken.balances.path).toBe('/0/private/BalanceEx');
});
test('permissions: read-only keys pass; anything more, unknown or missing refuses', () => {
  expect(checkPermissions('kraken', {error: [], result: {permissions: ['query-funds', 'query-ledger']}})).toEqual({ok: true});
  expect(checkPermissions('kraken', {error: [], result: {permissions: ['query-funds', 'withdraw-funds']}}).ok).toBe(false);
  expect(checkPermissions('kraken', {error: [], result: {permissions: ['query-funds', 'brand-new-power']}}).ok).toBe(false);
  expect(checkPermissions('kraken', {error: [], result: {}}).ok).toBe(false);
  expect(checkPermissions('coinbase', {can_view: true, can_trade: false, can_transfer: false})).toEqual({ok: true});
  expect(checkPermissions('coinbase', {can_view: true, can_trade: true, can_transfer: false}).ok).toBe(false);
  expect(checkPermissions('coinbase', {can_view: true, can_trade: false}).ok).toBe(false);
  expect(checkPermissions('binance', {enableReading: true, enableWithdrawals: false, enableSpotAndMarginTrading: false, enableFixReadOnly: true, ipRestrict: false})).toEqual({ok: true});
  expect(checkPermissions('binance', {enableReading: true, enableWithdrawals: true}).ok).toBe(false);
  expect(checkPermissions('binance', {enableReading: true, enableSomethingNew: true}).ok).toBe(false);
});
test('balances: each exchange\'s answer as assets and amounts; zeros left out; an error is never a zero', () => {
  expect(readBalances('kraken', {error: [], result: {XXBT: {balance: '0.5', hold_trade: '0'}, ZEUR: {balance: '120.00'}, 'ETH.F': {balance: '1.25'}, ADA: {balance: '0'}}})).toEqual([{asset: 'BTC', amount: '0.5'}, {asset: 'ETH', amount: '1.25'}, {asset: 'EUR', amount: '120'}]);
  expect(readBalances('coinbase', {accounts: [{currency: 'BTC', available_balance: {value: '0.1'}, hold: {value: '0.05'}}, {currency: 'ETH', available_balance: {value: '0'}}]})).toEqual([{asset: 'BTC', amount: '0.15'}]);
  expect(readBalances('binance', {balances: [{asset: 'BNB', free: '1.5', locked: '0.5'}, {asset: 'USDT', free: '0', locked: '0'}]})).toEqual([{asset: 'BNB', amount: '2'}]);
  expect(() => readBalances('kraken', {error: ['EAPI:Invalid key']})).toThrow();
});
