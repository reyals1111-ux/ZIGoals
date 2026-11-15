import {describe, expect, it} from 'vitest';
import {ADDRESS_MAX, assertLoopback, baseOf, IPV6_NOTE, isLoopback, loopbackOrigin, LOOPBACK_WORDS, NotLoopback, parseLoopback, sameLoopback, type LoopbackReason} from './loopback';

/** Session AM-2 (step 4c, item 1): the address rule — three loopback forms, any port, an optional path; everything else refused in plain words. */
describe('accepted: exactly the three loopback forms', () => {
  const ACCEPTED: readonly [typed: string, origin: string, path: string][] = [
    ['http://127.0.0.1:8000', 'http://127.0.0.1:8000', '/'],
    ['http://127.0.0.1:8000/mcp', 'http://127.0.0.1:8000', '/mcp'],
    ['http://localhost:3000/mcp', 'http://localhost:3000', '/mcp'],
    ['http://[::1]:8080/mcp', 'http://[::1]:8080', '/mcp'],
    ['http://127.0.0.1:1', 'http://127.0.0.1:1', '/'],
    ['http://127.0.0.1:65535/a/b', 'http://127.0.0.1:65535', '/a/b'],
    ['http://127.0.0.1', 'http://127.0.0.1:80', '/'], // no port is port 80, written out
    ['http://localhost/', 'http://localhost:80', '/'],
    ['  http://localhost:8000/mcp  ', 'http://localhost:8000', '/mcp'], // spaces around it
    ['HTTP://LOCALHOST:8000/mcp', 'http://localhost:8000', '/mcp'],
    ['127.0.0.1:8000/mcp', 'http://127.0.0.1:8000', '/mcp'], // no scheme reads as http
    ['localhost:8000', 'http://localhost:8000', '/'],
    ['[::1]:9000/mcp', 'http://[::1]:9000', '/mcp'],
    ['http://127.0.0.1:8000/mcp/', 'http://127.0.0.1:8000', '/mcp/'],
    ['http://127.0.0.1:08000/mcp', 'http://127.0.0.1:8000', '/mcp'], // a port is a number
  ];
  it.each(ACCEPTED)('%s', (typed, origin, path) => {
    const read = parseLoopback(typed);
    expect(read).toMatchObject({ok: true, origin, path, url: `${origin}${path}`});
    expect(isLoopback(typed)).toBe(true); expect(loopbackOrigin(typed)).toBe(origin);
    // What is kept reads back as itself.
    if (read.ok) expect(parseLoopback(read.url)).toMatchObject({ok: true, url: read.url});
  });
  it('[::1] is accepted with the note that a browser may block it', () => {
    expect(parseLoopback('http://[::1]:8080')).toMatchObject({ok: true, host: '[::1]', note: IPV6_NOTE});
    expect(parseLoopback('http://127.0.0.1:8080')).not.toHaveProperty('note');
  });
  it('an agent’s base drops the trailing slash and the wire’s /v1', () => {
    const base = (typed: string) => { const at = parseLoopback(typed); return at.ok ? baseOf(at) : null; };
    expect(base('http://127.0.0.1:8000/v1/')).toBe('http://127.0.0.1:8000');
    expect(base('http://localhost:8000')).toBe('http://localhost:8000');
    expect(base('http://localhost:8000/api/v1')).toBe('http://localhost:8000/api');
  });
});

describe('refused, in plain words, before any request', () => {
  const HOSTILE: readonly [typed: string, reason: LoopbackReason, why: string][] = [
    // ── other schemes ──
    ['https://127.0.0.1:8000/mcp', 'scheme', 'https'],
    ['https://localhost:8000', 'scheme', 'https'],
    ['ws://127.0.0.1:8000', 'scheme', 'a socket'],
    ['wss://localhost:8000', 'scheme', 'a secure socket'],
    ['ftp://127.0.0.1/', 'scheme', 'ftp'],
    ['file:///etc/passwd', 'scheme', 'a file'],
    ['javascript:alert(1)', 'scheme', 'script'],
    ['javascript://127.0.0.1:80/%0aalert(1)', 'scheme', 'script with slashes'],
    ['data:text/html,<script>1</script>', 'scheme', 'a data URL'],
    ['blob:http://127.0.0.1/x', 'scheme', 'a blob'],
    ['view-source:http://127.0.0.1', 'scheme', 'view-source'],
    ['chrome://settings', 'scheme', 'a browser page'],
    ['mailto:me@localhost', 'scheme', 'mail'],
    ['http:/127.0.0.1:8000', 'scheme', 'one slash'],
    ['//127.0.0.1:8000/mcp', 'host', 'scheme-relative'],
    ['http:///127.0.0.1:8000', 'host', 'three slashes'],
    ['http:127.0.0.1:8000', 'host', 'no slashes'],
    // ── a name and password in the address ──
    ['http://user@127.0.0.1:8000', 'userinfo', 'a user'],
    ['http://user:pass@127.0.0.1:8000', 'userinfo', 'a user and password'],
    ['http://127.0.0.1@evil.example', 'userinfo', 'the real host hidden behind @'],
    ['http://127.0.0.1:8000@evil.example/mcp', 'userinfo', 'the real host hidden behind @'],
    ['http://localhost@evil.example', 'userinfo', 'the real host hidden behind @'],
    ['http://evil.example@localhost:8000', 'userinfo', 'credentials that look like a host'],
    ['http://@127.0.0.1:8000', 'userinfo', 'an empty user'],
    ['http://:@localhost:8000', 'userinfo', 'an empty user and password'],
    // ── hosts that only look local ──
    ['http://localhost.evil.example:8000', 'host', 'a name that starts like localhost'],
    ['http://127.0.0.1.evil.example', 'host', 'a name that starts like 127.0.0.1'],
    ['http://127.0.0.1.nip.io:8000', 'host', 'a wildcard DNS name'],
    ['http://evil.localhost:8000', 'host', 'a subdomain of localhost'],
    ['http://localhost.localdomain:8000', 'host', 'another local name'],
    ['http://local:8000', 'host', 'a short name'],
    ['http://my-computer.local:8000', 'host', 'an mDNS name'],
    ['http://evil.example/127.0.0.1', 'host', 'loopback only in the path'],
    ['http://evil.example:8000/mcp', 'host', 'a web address'],
    ['http://example.com', 'host', 'a web address'],
    ['http://loca1host:8000', 'host', 'a look-alike'],
    ['http://1ocalhost:8000', 'host', 'a look-alike'],
    ['http://locаlhost:8000', 'characters', 'a Cyrillic а'],
    ['http://ⓛocalhost:8000', 'characters', 'a circled letter the URL parser folds to l'],
    ['http://localhost​:8000', 'characters', 'a zero-width space'],
    ['http://xn--loclhost-8bg:8000', 'host', 'punycode'],
    // ── the same machine, written another way ──
    ['http://2130706433:8000', 'host', 'decimal'],
    ['http://2130706433', 'host', 'decimal, no port'],
    ['http://0x7f000001:8000', 'host', 'hexadecimal'],
    ['http://0x7f.0.0.1:8000', 'host', 'hexadecimal part'],
    ['http://0x7f.0x0.0x0.0x1', 'host', 'hexadecimal parts'],
    ['http://017700000001', 'host', 'octal'],
    ['http://0177.0.0.1:8000', 'host', 'octal part'],
    ['http://0177.0000.0000.0001', 'host', 'octal parts'],
    ['http://127.1:8000', 'host', 'short form'],
    ['http://127.0.1:8000', 'host', 'short form'],
    ['http://127.000.000.001:8000', 'host', 'padded with zeros'],
    ['http://127.0.0.01:8000', 'host', 'padded with a zero'],
    ['http://127.0.0.2:8000', 'host', 'another loopback address'],
    ['http://127.255.255.255', 'host', 'another loopback address'],
    ['http://１２７.０.０.１:8000', 'characters', 'full-width digits the URL parser folds'],
    ['http://127。0。0。1:8000', 'characters', 'ideographic full stops the URL parser folds'],
    ['http://127.0.0.%31:8000', 'host', 'a percent-encoded digit'],
    ['http://%6c%6f%63%61%6c%68%6f%73%74:8000', 'host', 'percent-encoded localhost'],
    ['http://[::]:8000', 'host', 'the unspecified IPv6 address'],
    ['http://[0:0:0:0:0:0:0:1]:8000', 'host', '::1 written long'],
    ['http://[::0001]:8000', 'host', '::1 with zeros'],
    ['http://[::ffff:127.0.0.1]:8000', 'host', 'IPv4-mapped IPv6'],
    ['http://[::ffff:7f00:1]:8000', 'host', 'IPv4-mapped IPv6, hexadecimal'],
    ['http://[::1%25lo0]:8000', 'host', 'a zone id'],
    ['http://[fe80::1]:8000', 'host', 'a link-local IPv6 address'],
    ['http://::1:8000', 'host', 'IPv6 without brackets'],
    ['http://[::1', 'host', 'an open bracket'],
    // ── trailing dots, 0.0.0.0, private networks ──
    ['http://localhost.:8000', 'host', 'a trailing dot'],
    ['http://127.0.0.1.:8000', 'host', 'a trailing dot'],
    ['http://localhost..:8000', 'host', 'two trailing dots'],
    ['http://.localhost:8000', 'host', 'a leading dot'],
    ['http://0.0.0.0:8000', 'host', 'every interface'],
    ['http://0:8000', 'host', 'short for 0.0.0.0'],
    ['http://0.0.0.0', 'host', 'every interface, no port'],
    ['http://192.168.1.10:8000', 'host', 'the home network'],
    ['http://10.0.0.5:8000', 'host', 'a private network'],
    ['http://172.16.0.1:8000', 'host', 'a private network'],
    ['http://169.254.169.254/latest/meta-data', 'host', 'a cloud metadata address'],
    ['http://100.64.0.1:8000', 'host', 'carrier-grade NAT'],
    ['http://host.docker.internal:8000', 'host', 'a container host name'],
    // ── ports ──
    ['http://127.0.0.1:0', 'port', 'port 0'],
    ['http://127.0.0.1:65536', 'port', 'above the range'],
    ['http://127.0.0.1:99999', 'port', 'above the range'],
    ['http://127.0.0.1:123456', 'port', 'six digits'],
    ['http://127.0.0.1:', 'port', 'an empty port'],
    ['http://127.0.0.1:80a', 'port', 'letters in the port'],
    ['http://127.0.0.1:-1', 'port', 'a negative port'],
    ['http://127.0.0.1:8000:9000', 'port', 'two ports'],
    ['http://localhost:port', 'port', 'a word for a port'],
    ['http://127.0.0.1:８０００', 'characters', 'full-width digits in the port'],
    // ── query, fragment, path tricks ──
    ['http://127.0.0.1:8000/mcp?token=abc', 'query', 'a token in the address'],
    ['http://127.0.0.1:8000?x=1', 'query', 'a query'],
    ['http://127.0.0.1:8000/mcp#frag', 'query', 'a fragment'],
    ['http://127.0.0.1:8000#@evil.example', 'query', 'a fragment that hides a host'],
    ['http://127.0.0.1:8000/../admin', 'path', 'a parent step'],
    ['http://127.0.0.1:8000/a/./b', 'path', 'a dot step'],
    ['http://127.0.0.1:8000/%2e%2e/admin', 'path', 'an encoded parent step'],
    ['http://127.0.0.1:8000/a%2fb', 'path', 'an encoded slash'],
    ['http://127.0.0.1:8000/a%00b', 'path', 'an encoded NUL'],
    ['http://127.0.0.1:8000//evil.example/mcp', 'path', 'a double slash'],
    ['http://127.0.0.1:8000/@evil.example', 'path', 'an @ in the path'],
    [`http://127.0.0.1:8000/${'a'.repeat(220)}`, 'path', 'a very long path'],
    // ── characters ──
    ['http://127.0.0.1 :8000', 'characters', 'a space'],
    ['http://127.0.0.1:8000/a b', 'characters', 'a space in the path'],
    ['http:\\\\127.0.0.1:8000', 'characters', 'backslashes (the URL parser reads them as slashes)'],
    ['http://127.0.0.1:8000\\@evil.example', 'characters', 'a backslash before @'],
    ['http://evil.example\\@127.0.0.1:8000', 'characters', 'a backslash before @'],
    ['http://127.0.0.1\t.evil.example', 'characters', 'a tab the URL parser would drop'],
    ['http://127.0.0.1\n.evil.example', 'characters', 'a line feed the URL parser would drop'],
    ['http://loc\ralhost:8000', 'characters', 'a carriage return'],
    ['http://127.0.0.1:8000/\u0000', 'characters', 'a NUL'],
    ['http://127.0.0.1:8000/‮evil', 'characters', 'a direction override'],
    ['http://127.0.0.1:8000/é', 'characters', 'a letter outside ASCII'],
    // ── nothing, or too much ──
    ['', 'empty', 'nothing'],
    ['   ', 'empty', 'spaces'],
    [`http://127.0.0.1:8000/${'a'.repeat(ADDRESS_MAX)}`, 'too-long', 'too long'],
    ['http://', 'host', 'a scheme alone'],
    ['http://:8000', 'host', 'a port alone'],
    ['localhost:', 'port', 'a host and a colon'],
    ['mcp', 'host', 'a word'],
    ['/mcp', 'host', 'a path alone'],
  ];
  it(`the table holds ${HOSTILE.length} hostile addresses`, () => { expect(HOSTILE.length).toBeGreaterThanOrEqual(110); expect(new Set(HOSTILE.map(h => h[0])).size).toBe(HOSTILE.length); });
  it.each(HOSTILE)('%j → %s (%s)', (typed, reason) => {
    const read = parseLoopback(typed);
    expect(read).toEqual({ok: false, reason, message: LOOPBACK_WORDS[reason]});
    expect(isLoopback(typed)).toBe(false); expect(loopbackOrigin(typed)).toBeNull();
    expect(() => assertLoopback(typed)).toThrow(NotLoopback);
  });
  it('whatever the URL parser itself would turn into a loopback or another host is refused as typed', () => {
    // The parser normalises these to 127.0.0.1 — the reason the text is read first.
    for (const typed of ['http://2130706433', 'http://0x7f.1', 'http://127.1', 'http://0177.0.0.1']) { expect(new URL(typed).hostname, typed).toBe('127.0.0.1'); expect(isLoopback(typed), typed).toBe(false); }
    // And it reads a backslash as a slash and drops a tab.
    expect(new URL('http:\\\\127.0.0.1:8000').hostname).toBe('127.0.0.1'); expect(isLoopback('http:\\\\127.0.0.1:8000')).toBe(false);
  });
  it('things that are not text', () => {
    for (const value of [null, undefined, 8000, {}, ['http://127.0.0.1'], new URL('http://127.0.0.1:8000')]) expect(parseLoopback(value)).toMatchObject({ok: false, reason: 'empty'});
  });
  it('every refusal is a full sentence that names the way to write it', () => {
    for (const words of Object.values(LOOPBACK_WORDS)) { expect(words.length).toBeGreaterThan(40); expect(words).toMatch(/\.$/); expect(words).not.toMatch(/undefined|null|\[object/); }
    expect(LOOPBACK_WORDS.host).toMatch(/http:\/\/127\.0\.0\.1:<port>, http:\/\/localhost:<port> or http:\/\/\[::1\]:<port>/);
    expect(LOOPBACK_WORDS.userinfo).toMatch(/token field/); expect(LOOPBACK_WORDS.query).toMatch(/token field/);
  });
});

describe('before every request, and after every answer', () => {
  it('assertLoopback gives where to send, or throws with nothing sent', () => {
    expect(assertLoopback('http://127.0.0.1:8000/mcp').url).toBe('http://127.0.0.1:8000/mcp');
    try { assertLoopback('http://192.168.1.10:8000'); expect.unreachable(); } catch (cause) { expect(cause).toBeInstanceOf(NotLoopback); expect((cause as NotLoopback).reason).toBe('host'); expect((cause as Error).message).toBe(LOOPBACK_WORDS.host); }
  });
  it('an answer that was redirected, or that reports another address, is not this server’s', () => {
    const asked = 'http://127.0.0.1:8000/mcp';
    expect(sameLoopback(asked, {redirected: false, url: 'http://127.0.0.1:8000/mcp'})).toBe(true);
    expect(sameLoopback(asked, {})).toBe(true); // a browser that reports no address
    expect(sameLoopback(asked, {redirected: true, url: 'http://127.0.0.1:8000/mcp'})).toBe(false);
    expect(sameLoopback(asked, {redirected: false, url: 'https://evil.example/mcp'})).toBe(false);
    expect(sameLoopback(asked, {redirected: false, url: 'http://127.0.0.1:9000/mcp'})).toBe(false); // another port is another server
    expect(sameLoopback(asked, {redirected: false, url: 'http://localhost:8000/mcp'})).toBe(false); // another spelling was not asked
    expect(sameLoopback('http://127.0.0.1/mcp', {redirected: false, url: 'http://127.0.0.1/other'})).toBe(true); // the same origin (port 80)
    expect(sameLoopback('http://evil.example', {redirected: false, url: 'http://evil.example'})).toBe(false);
  });
});
