/**
 * Session AF Part 11 A10 (ADR-028 H71, TIER 3 (egress routes)): the recipe import's DNS-rebinding exposure, reduced.
 * The route checked the host's literal form only, so a public name that resolves to a private, loopback or link-local
 * address was fetched. A Worker's fetch() cannot pin the address it connects to, so a true resolve-then-pin would need a
 * hand-written HTTP client over raw sockets; the honest version built here is resolve-then-check: before the page is
 * fetched, the host is resolved through Cloudflare's DNS-over-HTTPS JSON API (server-only egress, never in connect-src)
 * and refused when any A/AAAA answer is not a public unicast address, or when the resolver cannot answer (fail closed).
 * Residual risk, documented in docs/security/THREAT_MODEL.md: a name whose answer changes between this check and the
 * fetch's own resolution (seconds) — the window an attacker-controlled DNS server with a zero TTL could still use; the
 * other limits (https on 443 only, no redirects, no credentials, 1 MB, JSON-LD only, rate limits) stay.
 */
export const RECIPE_RESOLVER = 'https://cloudflare-dns.com/dns-query';
export const RECIPE_RESOLVE_TIMEOUT_MS = 3_000;
export type Resolution = {ok: true; addresses: string[]} | {ok: false};
export type Resolve = (hostname: string) => Promise<Resolution>;

type Quad = [number, number, number, number];
const v4 = (text: string): Quad | null => { const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text); if (!m) return null; const p: Quad = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]; return p.every(n => n <= 255) ? p : null; };
function publicV4([a, b, c]: Quad): boolean {
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;            // this network, private, loopback, multicast + reserved
  if (a === 100 && b >= 64 && b <= 127) return false;                        // carrier-grade NAT
  if (a === 169 && b === 254) return false;                                  // link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return false;                         // private
  if (a === 192 && b === 168) return false;                                  // private
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;            // IETF protocol assignments, TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false;                     // benchmarking
  if (a === 198 && b === 51 && c === 100) return false;                      // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false;                       // TEST-NET-3
  return true;
}
function expandV6(text: string): number[] | null {
  let s = text.toLowerCase(); if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
  if (!/^[0-9a-f:.]+$/.test(s) || !s.includes(':')) return null;
  let tail: [number, number] | null = null;
  const lastColon = s.lastIndexOf(':'), maybeV4 = s.slice(lastColon + 1);
  if (maybeV4.includes('.')) { const p = v4(maybeV4); if (!p) return null; tail = [(p[0] << 8) | p[1], (p[2] << 8) | p[3]]; s = s.slice(0, lastColon + 1) + '0:0'; }
  const halves = s.split('::'); if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [], rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = 8 - head.length - rest.length; if (halves.length === 1 ? fill !== 0 : fill < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? fill : 0).fill('0'), ...rest].map(g => (g === '' ? NaN : parseInt(g, 16)));
  if (groups.length !== 8 || groups.some(g => !Number.isInteger(g) || g < 0 || g > 0xffff)) return null;
  if (tail) { groups[6] = tail[0]; groups[7] = tail[1]; }
  return groups;
}
function publicV6(g: number[]): boolean {
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0, g6 = 0, g7 = 0] = g;
  const zero = (...xs: number[]) => xs.every(x => x === 0);
  if (zero(g0, g1, g2, g3, g4, g5, g6, g7)) return false;                                // ::
  if (zero(g0, g1, g2, g3, g4, g5, g6) && g7 === 1) return false;                        // ::1
  const embedded: Quad = [g6 >> 8, g6 & 255, g7 >> 8, g7 & 255];
  if (zero(g0, g1, g2, g3, g4) && g5 === 0xffff) return publicV4(embedded);              // ::ffff:a.b.c.d
  if (g0 === 0x64 && g1 === 0xff9b && zero(g2, g3, g4, g5)) return publicV4(embedded);   // NAT64 64:ff9b::/96
  if ((g0 & 0xfe00) === 0xfc00) return false;                                            // unique local fc00::/7
  if ((g0 & 0xffc0) === 0xfe80) return false;                                            // link-local fe80::/10
  if ((g0 & 0xff00) === 0xff00) return false;                                            // multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return false;                                      // documentation
  if (g0 === 0x0100 && zero(g1, g2, g3)) return false;                                   // discard 100::/64
  if (zero(g0, g1, g2, g3, g4, g5)) return false;                                        // IPv4-compatible (deprecated) ::a.b.c.d
  return true;
}
/** True only for a public unicast IPv4 or IPv6 address; anything unparsable is not public. */
export function isPublicAddress(address: string): boolean {
  const p4 = v4(address); if (p4) return publicV4(p4);
  const p6 = expandV6(address); return p6 ? publicV6(p6) : false;
}

type Fetch = (input: string, init: RequestInit) => Promise<Response>;
/** Cloudflare DNS-over-HTTPS (JSON): A and AAAA answers for `hostname`; any failure is {ok:false}. */
export function dohResolver(fetchImpl: Fetch = fetch): Resolve {
  return async hostname => {
    const ask = async (type: 'A' | 'AAAA') => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), RECIPE_RESOLVE_TIMEOUT_MS);
      try {
        const res = await fetchImpl(`${RECIPE_RESOLVER}?name=${encodeURIComponent(hostname)}&type=${type}`, {method: 'GET', headers: {accept: 'application/dns-json'}, redirect: 'manual', credentials: 'omit', signal: controller.signal});
        if (!res.ok) return null;
        const text = await res.text(); if (text.length > 65_536) return null;
        const body = JSON.parse(text) as {Status?: unknown; Answer?: {type?: unknown; data?: unknown}[]};
        if (body.Status !== 0 && body.Status !== 3) return null;   // NOERROR or NXDOMAIN; anything else is a resolver failure
        return (body.Answer ?? []).filter(a => (a.type === 1 || a.type === 28) && typeof a.data === 'string').map(a => a.data as string);
      } catch { return null; } finally { clearTimeout(timer); }
    };
    const [a, aaaa] = await Promise.all([ask('A'), ask('AAAA')]);
    if (a === null || aaaa === null) return {ok: false};
    return {ok: true, addresses: [...a, ...aaaa]};
  };
}
