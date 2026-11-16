/**
 * Session AM-2 (owner's step 4c, decision of 15 Nov: "Connect your own agent and tools"): the one rule for an address
 * NOVA may reach on the person's own computer. It MUST be a loopback origin, written in one of exactly three ways:
 *
 *   http://127.0.0.1:<port>   http://localhost:<port>   http://[::1]:<port>      (any port, an optional path)
 *
 * Everything else is refused in plain words, before any request: another scheme (https, ws, file, javascript, data …),
 * a name and password in the address, a host that only looks local (`localhost.example.com`, `127.0.0.1.nip.io`,
 * `evil.localhost`), the same machine written another way (`2130706433`, `0x7f.0.0.1`, `0177.0.0.1`, `127.1`,
 * `127.0.0.2`, `[::ffff:127.0.0.1]`, `[0:0:0:0:0:0:0:1]`), a trailing dot, `0.0.0.0`, a private network address, a query
 * or a fragment (a token belongs in the token field, never in a stored address).
 *
 * Two readers must agree: the text the person typed (so a spelling the URL parser would quietly turn into 127.0.0.1 is
 * refused as written) and the URL parser's own answer (so nothing the text check misreads gets through). The check runs
 * when an address is typed AND again right before every request (`assertLoopback`): a stored record can be edited by
 * hand or arrive in a restore. Requests are sent with `redirect: 'error'`, so a server on this computer can never pass
 * NOVA on to another host; `sameLoopback` re-checks the address a response says it came from.
 *
 * Pure: no fetch, no storage.
 */
export const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'] as const;
export type LoopbackHost = (typeof LOOPBACK_HOSTS)[number];
export const ADDRESS_MAX = 300, PATH_MAX = 200;
export type LoopbackReason = 'empty' | 'too-long' | 'characters' | 'scheme' | 'userinfo' | 'host' | 'port' | 'query' | 'path' | 'parse';
export type Loopback =
  | {ok: true; /** `http://127.0.0.1:8000`, the host as typed (lower case), the port always written. */ origin: string; host: LoopbackHost; port: number;
      /** The path as the URL parser reads it (`/mcp`); `/` when none was typed. */ path: string; /** `origin` + `path`: where requests go. */ url: string;
      /** Said beside the address when it is accepted but may not be reachable from a browser. */ note?: string}
  | {ok: false; reason: LoopbackReason; message: string};

const WORDS: Readonly<Record<LoopbackReason, string>> = {
  empty: 'Type the address your server prints, for example http://127.0.0.1:8000/mcp.',
  'too-long': 'That address is too long. Use the short address your server prints, for example http://127.0.0.1:8000/mcp.',
  characters: 'That address holds a space, a backslash or a character that cannot be part of an address. Type it again, for example http://127.0.0.1:8000/mcp.',
  scheme: 'Only plain http on this computer can be reached: start the address with http://127.0.0.1, http://localhost or http://[::1].',
  userinfo: 'Leave the name and password out of the address. If the server needs a token, type it in the token field: it is sent only to that server.',
  host: 'Only a server on this computer can be connected: http://127.0.0.1:<port>, http://localhost:<port> or http://[::1]:<port>, written exactly like that. Another computer, a web address or another way of writing this one is refused.',
  port: 'Use a port between 1 and 65535 after the host, for example http://127.0.0.1:8000.',
  query: 'Leave out everything from “?” or “#” on. If the server needs a token, type it in the token field: it is never kept in the address.',
  path: 'That path cannot be used. Use the short path your server prints, for example /mcp.',
  parse: 'That is not an address this browser can read. Type it like http://127.0.0.1:8000/mcp.',
};
const refuse = (reason: LoopbackReason): Loopback => ({ok: false, reason, message: WORDS[reason]});
export const LOOPBACK_WORDS = WORDS;
/** Browsers cannot name an IPv6 address in a site's content security policy, so `[::1]` is a valid address a browser may still block. */
export const IPV6_NOTE = 'Most browsers cannot let a site reach an IPv6 address such as [::1]. If the connection is blocked, use http://127.0.0.1 or http://localhost with the same port.';

/** Only printable ASCII: no space, no control character, no backslash, nothing outside ASCII (full-width digits, look-alike letters, invisible marks). */
const PLAIN = /^[\x21-\x5b\x5d-\x7e]+$/;
const SCHEME = /^([a-z][a-z0-9+.-]*):\/\//i;
/** The three hosts, exactly as written (case only matters for "localhost"), then an optional port of digits. */
const AUTHORITY = /^(127\.0\.0\.1|localhost|\[::1\])(?::(\d{1,5}))?$/i;

export function parseLoopback(input: unknown): Loopback {
  if (typeof input !== 'string') return refuse('empty');
  const typed = input.trim();
  if (!typed) return refuse('empty');
  if (typed.length > ADDRESS_MAX) return refuse('too-long');
  if (!PLAIN.test(typed)) return refuse('characters');
  // "127.0.0.1:8000/mcp" is read as http; anything that names another scheme is refused as that scheme.
  const scheme = SCHEME.exec(typed);
  if (scheme && scheme[1]!.toLowerCase() !== 'http') return refuse('scheme');
  if (!scheme && /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(typed) && !/^localhost:/i.test(typed)) return refuse('scheme'); // "javascript:…", "data:…", "file:/…"
  const rest = scheme ? typed.slice(scheme[0].length) : typed;
  if (rest.startsWith('/')) return refuse('host'); // "http:///…", "//host"
  const cut = rest.search(/[/?#]/), authority = cut < 0 ? rest : rest.slice(0, cut), tail = cut < 0 ? '' : rest.slice(cut);
  if (authority.includes('@')) return refuse('userinfo');
  if (authority.includes('%')) return refuse('host');
  const written = AUTHORITY.exec(authority);
  if (!written) {
    // A host of the three with a port that is not digits is a port problem; anything else is a host problem.
    return /^(127\.0\.0\.1|localhost|\[::1\]):/i.test(authority) ? refuse('port') : refuse('host');
  }
  const host = written[1]!.toLowerCase() as LoopbackHost, portText = written[2];
  const port = portText === undefined ? 80 : Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return refuse('port');
  if (/[?#]/.test(tail)) return refuse('query');
  if (tail.length > PATH_MAX || tail.includes('@') || tail.includes('//')) return refuse('path');
  // The second reader: the URL parser must see the same scheme, host and port, and no credentials.
  let url: URL;
  try { url = new URL(`http://${host}:${port}${tail}`); } catch { return refuse('parse'); }
  if (url.protocol !== 'http:') return refuse('scheme');
  if (url.username || url.password) return refuse('userinfo');
  if (url.hostname.toLowerCase() !== host) return refuse('host');
  if (Number(url.port || '80') !== port) return refuse('port');
  if (url.search || url.hash) return refuse('query');
  const path = url.pathname || '/';
  if (path.length > PATH_MAX || /(^|\/)\.\.?(\/|$)/.test(tail) || /%(?:2f|5c|2e|00)/i.test(tail)) return refuse('path');
  const origin = `http://${host}:${port}`;
  return {ok: true, origin, host, port, path, url: `${origin}${path}`, ...(host === '[::1]' ? {note: IPV6_NOTE} : {})};
}
export const isLoopback = (input: unknown): boolean => parseLoopback(input).ok;
/** An OpenAI-compatible agent's base: the accepted address without a trailing slash and without the wire's own /v1 ("http://127.0.0.1:8000/v1/" → "http://127.0.0.1:8000"). */
export const baseOf = (at: Extract<Loopback, {ok: true}>): string => `${at.origin}${at.path}`.replace(/\/+$/, '').replace(/\/v1$/i, '');
/** The origin of an accepted address, or null. */
export const loopbackOrigin = (input: unknown): string | null => { const read = parseLoopback(input); return read.ok ? read.origin : null; };

/** Thrown before a request when an address is not one of the three loopback forms (nothing is sent). */
export class NotLoopback extends Error {
  readonly reason: LoopbackReason;
  constructor(reason: LoopbackReason, message: string) { super(message); this.name = 'NotLoopback'; this.reason = reason; }
}
/** Right before every request: the address as it is NOW must still be a loopback address; returns where to send. */
export function assertLoopback(input: unknown): Extract<Loopback, {ok: true}> {
  const read = parseLoopback(input);
  if (!read.ok) throw new NotLoopback(read.reason, read.message);
  return read;
}
/**
 * After a response: it must not have been redirected, and the address it reports (when the browser reports one) must be
 * the very origin that was asked. `redirect: 'error'` already refuses a redirect; this is the second look.
 */
export function sameLoopback(asked: string, response: {redirected?: boolean; url?: string}): boolean {
  if (response.redirected === true) return false;
  if (!response.url) return true; // a test double or an opaque answer reports none
  const a = parseLoopback(asked), b = parseLoopback(response.url);
  return a.ok && b.ok && a.origin === b.origin;
}
