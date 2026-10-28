import {ROUTES, type ExchangeCall, type ExchangeId} from './allowlist';

/**
 * Session AI (J14): each exchange's request signed in the browser with WebCrypto, so the secret never leaves the device:
 * the relay sees the key id and a signature bound to a nonce or a time (Kraken, Binance), or a two-minute token bound to
 * one method and path (Coinbase). No dependency: HMAC-SHA512 (Kraken), HMAC-SHA256 (Binance), ES256 (Coinbase).
 */
export type SignedRequest = {exchange: ExchangeId; call: ExchangeCall; query: string; body: string; headers: Record<string, string>};
const enc = new TextEncoder();
const b64 = (bytes: ArrayBuffer | Uint8Array) => { let s = ''; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s); };
const unb64 = (text: string) => Uint8Array.from(atob(text.replace(/\s+/g, '')), c => c.charCodeAt(0));
const b64url = (bytes: ArrayBuffer | Uint8Array) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hmac(hash: 'SHA-256' | 'SHA-512', key: Uint8Array, message: Uint8Array): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key as Uint8Array<ArrayBuffer>, {name: 'HMAC', hash}, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, message as Uint8Array<ArrayBuffer>);
}
/** Kraken: API-Sign = base64(HMAC-SHA512(base64decode(secret), path + SHA256(nonce + postData))). */
export async function krakenSignature(secret: string, path: string, nonce: string, postData: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(nonce + postData)));
  const message = new Uint8Array([...enc.encode(path), ...digest]);
  return b64(await hmac('SHA-512', unb64(secret), message));
}
/** Binance: signature = hex(HMAC-SHA256(secret, queryString + body)). */
export async function binanceSignature(secret: string, payload: string): Promise<string> {
  return hex(await hmac('SHA-256', enc.encode(secret), enc.encode(payload)));
}
/** Coinbase's private key is a PEM "EC PRIVATE KEY" (SEC1); WebCrypto imports it as a JWK built from its d, x and y. */
export async function coinbaseKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----(BEGIN|END) [A-Z ]+-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '');
  const der = unb64(body);
  // SEC1 ECPrivateKey: SEQUENCE { INTEGER 1, OCTET STRING (32) d, [0] OID, [1] BIT STRING 04||x||y }.
  const at = der.indexOf(0x04, 2); // the OCTET STRING tag after the version
  if (der[0] !== 0x30 || at < 0 || der[at + 1] !== 0x20) throw Error('This does not look like a Coinbase ECDSA private key (EC PRIVATE KEY).');
  const d = der.slice(at + 2, at + 34), pubAt = der.lastIndexOf(0x04, der.length - 65);
  const pub = der.slice(der.length - 65);
  if (pub[0] !== 0x04 || pubAt < 0) throw Error('The key has no public part; create an ECDSA key in Coinbase.');
  return crypto.subtle.importKey('jwk', {kty: 'EC', crv: 'P-256', d: b64url(d), x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33, 65)), ext: false}, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']);
}
/** Coinbase: a fresh ES256 JWT for one request (two minutes), header kid = the key name, claim uri = "METHOD host+path". */
export async function coinbaseJwt(keyName: string, pem: string, method: string, host: string, path: string, now = Date.now()): Promise<string> {
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)).buffer), nbf = Math.floor(now / 1000);
  const header = b64url(enc.encode(JSON.stringify({alg: 'ES256', kid: keyName, nonce, typ: 'JWT'})));
  const claims = b64url(enc.encode(JSON.stringify({iss: 'cdp', sub: keyName, nbf, exp: nbf + 120, uri: `${method} ${host}${path}`})));
  const signature = await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, await coinbaseKey(pem), enc.encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64url(signature)}`;
}
/** One read-only call, signed: the relay forwards it as is (lib/exchanges/allowlist.ts). */
export async function signCall(exchange: ExchangeId, call: ExchangeCall, keyId: string, secret: string, now = Date.now()): Promise<SignedRequest> {
  const route = ROUTES[exchange][call];
  if (exchange === 'kraken') {
    const nonce = String(now * 1000), body = `nonce=${nonce}`;
    return {exchange, call, query: '', body, headers: {'API-Key': keyId, 'API-Sign': await krakenSignature(secret, route.path, nonce, body), 'Content-Type': 'application/x-www-form-urlencoded'}};
  }
  if (exchange === 'binance') {
    const query = `${call === 'balances' ? 'omitZeroBalances=true&' : ''}recvWindow=10000&timestamp=${now}`;
    return {exchange, call, query: `${query}&signature=${await binanceSignature(secret, query)}`, body: '', headers: {'X-MBX-APIKEY': keyId}};
  }
  const query = call === 'balances' ? 'limit=250' : '';
  return {exchange, call, query, body: '', headers: {Authorization: `Bearer ${await coinbaseJwt(keyId, secret, route.method, route.host, route.path, now)}`}};
}
