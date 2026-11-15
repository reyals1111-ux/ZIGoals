import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {BRIDGE_WORDS, BridgeError, callTool, clampTimeout, closeSession, connect, failureLine, listTools, openSession, PROTOCOL_LATEST, PROTOCOLS_READ, RESPONSE_MAX_BYTES, TIMEOUT_DEFAULT_MS, TIMEOUT_MAX_MS, type McpSession} from './client';
import {answerIn, answerInBody, parseJson, rpcNotification, rpcRequest} from './jsonrpc';
import {parseSse, SSE_EVENTS_MAX, SseReader} from './sse';

/** Session AM-2 (step 4c, item 1): JSON-RPC framing, the event-stream reader, and the client against a pretend server. */
describe('JSON-RPC 2.0 framing', () => {
  it('a request carries an id, a notification never does', () => {
    expect(rpcRequest(3, 'tools/list')).toEqual({jsonrpc: '2.0', id: 3, method: 'tools/list'});
    expect(rpcRequest(4, 'tools/call', {name: 'x', arguments: {}})).toEqual({jsonrpc: '2.0', id: 4, method: 'tools/call', params: {name: 'x', arguments: {}}});
    expect(rpcNotification('notifications/initialized')).toEqual({jsonrpc: '2.0', method: 'notifications/initialized'});
    expect(rpcNotification('notifications/initialized')).not.toHaveProperty('id');
  });
  it('only the answer to NOVA’s own id is an answer', () => {
    expect(answerIn({jsonrpc: '2.0', id: 1, result: {ok: 1}}, 1)).toEqual({id: 1, ok: true, result: {ok: 1}});
    expect(answerIn({jsonrpc: '2.0', id: 1, error: {code: -32601, message: 'Method not found'}}, 1)).toEqual({id: 1, ok: false, error: {code: -32601, message: 'Method not found'}});
    const NOT: unknown[] = [
      {jsonrpc: '2.0', id: 2, result: {}}, // another id
      {jsonrpc: '2.0', id: '1', result: {}}, // the id as text
      {jsonrpc: '1.0', id: 1, result: {}}, {id: 1, result: {}}, // not 2.0
      {jsonrpc: '2.0', id: 1, method: 'sampling/createMessage', params: {}}, // the server's own request: never answered
      {jsonrpc: '2.0', method: 'notifications/progress', params: {}}, // a notification
      {jsonrpc: '2.0', id: 1, result: {}, error: {code: 1, message: 'x'}}, {jsonrpc: '2.0', id: 1}, // both, neither
      {jsonrpc: '2.0', id: 1, result: 'text'}, {jsonrpc: '2.0', id: 1, result: [1]}, {jsonrpc: '2.0', id: 1, result: null}, // a result that is not an object
      {jsonrpc: '2.0', id: 1, error: 'boom'}, {jsonrpc: '2.0', id: 1, error: {code: 'x', message: 'm'}}, // a malformed error
      null, undefined, 'x', 1, [], [{jsonrpc: '2.0', id: 1, result: {}}],
    ];
    for (const message of NOT) expect(answerIn(message, 1), JSON.stringify(message)).toBeNull();
  });
  it('an error’s message is one plain, short line', () => {
    const a = answerIn({jsonrpc: '2.0', id: 1, error: {code: -1, message: `bad\n\u0007thing ${'x'.repeat(900)}`}}, 1);
    expect(a).toMatchObject({ok: false}); if (a && !a.ok) { expect(a.error.message.length).toBeLessThanOrEqual(300); expect(a.error.message).not.toMatch(/[\n\u0007]/); }
    expect(answerIn({jsonrpc: '2.0', id: 1, error: {code: -1}}, 1)).toEqual({id: 1, ok: false, error: {code: -1, message: ''}});
  });
  it('a body may be one message or a batch; the server’s other messages are skipped', () => {
    expect(answerInBody([{jsonrpc: '2.0', method: 'notifications/message', params: {}}, {jsonrpc: '2.0', id: 9, method: 'roots/list'}, {jsonrpc: '2.0', id: 7, result: {a: 1}}], 7)).toEqual({id: 7, ok: true, result: {a: 1}});
    expect(answerInBody({jsonrpc: '2.0', id: 7, result: {}}, 7)).toMatchObject({ok: true});
    expect(answerInBody([], 7)).toBeNull(); expect(answerInBody(undefined, 7)).toBeNull();
    expect(parseJson('{"a":1}')).toEqual({a: 1}); expect(parseJson('not json')).toBeUndefined(); expect(parseJson('')).toBeUndefined();
  });
});

describe('the event-stream reader', () => {
  it('reads events as the standard says: data lines joined, comments skipped, one space dropped, any line end', () => {
    expect(parseSse('data: one\n\n')).toEqual([{event: 'message', data: 'one'}]);
    expect(parseSse('event: message\ndata: {"a":1}\n\n')).toEqual([{event: 'message', data: '{"a":1}'}]);
    expect(parseSse('data: a\ndata: b\n\n')).toEqual([{event: 'message', data: 'a\nb'}]);
    expect(parseSse(': keep-alive\n\ndata:x\n\n')).toEqual([{event: 'message', data: 'x'}]);
    expect(parseSse('data:  two spaces\n\n')).toEqual([{event: 'message', data: ' two spaces'}]);
    expect(parseSse('data: a\r\n\r\ndata: b\r\rdata: c\n\n')).toEqual([{event: 'message', data: 'a'}, {event: 'message', data: 'b'}, {event: 'message', data: 'c'}]);
    expect(parseSse('﻿data: bom\n\n')).toEqual([{event: 'message', data: 'bom'}]);
    expect(parseSse('id: 7\nretry: 100\nevent: ping\ndata: x\n\n')).toEqual([{event: 'ping', data: 'x'}]);
    expect(parseSse('data\n\n')).toEqual([{event: 'message', data: ''}]); // a field with no colon has an empty value
    expect(parseSse('event: only\n\n')).toEqual([]); // no data: no event
    expect(parseSse('data: never finished')).toEqual([]); // no empty line: dropped
    expect(parseSse('data: a\n\r')).toEqual([{event: 'message', data: 'a'}]); // a last carriage return ends its (empty) line
    expect(parseSse('')).toEqual([]);
  });
  it('is incremental: a line, an event or a CR LF split anywhere across pieces reads the same', () => {
    const whole = 'event: message\r\ndata: {"jsonrpc":"2.0",\r\ndata: "id":1}\r\n\r\ndata: second\n\n', want = parseSse(whole);
    expect(want).toHaveLength(2);
    for (let cut = 0; cut <= whole.length; cut++) {
      const reader = new SseReader();
      expect([...reader.push(whole.slice(0, cut)), ...reader.push(whole.slice(cut)), ...reader.end()], `cut at ${cut}`).toEqual(want);
    }
    const reader = new SseReader(), out = [...whole].flatMap(c => reader.push(c));
    expect([...out, ...reader.end()]).toEqual(want);
  });
  it('is bounded: after the limit no more events come out', () => {
    const reader = new SseReader();
    expect(reader.push('data: x\n\n'.repeat(SSE_EVENTS_MAX + 50))).toHaveLength(SSE_EVENTS_MAX);
    expect(reader.push('data: y\n\n')).toEqual([]);
  });
});

// ── A pretend tool server ────────────────────────────────────────────────────────────────────────────────────────────
type Seen = {url: string; init: RequestInit; body: Record<string, unknown> | null};
type Reply = (seen: Seen, n: number) => Response | Promise<Response>;
const json = (value: unknown, headers: Record<string, string> = {}, status = 200) => new Response(JSON.stringify(value), {status, headers: {'content-type': 'application/json', ...headers}});
const sse = (events: unknown[], headers: Record<string, string> = {}) => new Response(events.map(e => `event: message\ndata: ${JSON.stringify(e)}\n\n`).join(''), {status: 200, headers: {'content-type': 'text/event-stream', ...headers}});
function server(reply: Reply) {
  const seen: Seen[] = [];
  const fetcher = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const entry: Seen = {url: String(input), init, body: typeof init.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : null};
    seen.push(entry);
    return reply(entry, seen.length);
  }) as typeof fetch;
  return {seen, fetcher};
}
const TOOLS = [{name: 'search', description: 'Search the web', inputSchema: {type: 'object', properties: {query: {type: 'string'}}, required: ['query']}}, {name: 'send_mail', description: 'Send a mail'}];
/** A well-behaved server: initialize, the initialized notice (202), the tool list, a call. */
const good = (extra: {session?: string; stream?: boolean; protocol?: string} = {}): Reply => seen => {
  const m = seen.body?.method, id = seen.body?.id, wrap = (result: unknown, headers = {}) => extra.stream ? sse([{jsonrpc: '2.0', method: 'notifications/message', params: {level: 'info'}}, {jsonrpc: '2.0', id, result}], headers) : json({jsonrpc: '2.0', id, result}, headers);
  if (m === 'initialize') return wrap({protocolVersion: extra.protocol ?? PROTOCOL_LATEST, capabilities: {tools: {}}, serverInfo: {name: 'Pretend', version: '1.2'}}, extra.session ? {'mcp-session-id': extra.session} : {});
  if (m === 'notifications/initialized') return new Response(null, {status: 202});
  if (m === 'tools/list') return wrap({tools: TOOLS});
  if (m === 'tools/call') return wrap({content: [{type: 'text', text: 'three results'}]});
  return json({jsonrpc: '2.0', id, error: {code: -32601, message: 'Method not found'}});
};
const ADDRESS = 'http://127.0.0.1:8000/mcp';
const headersOf = (seen: Seen) => seen.init.headers as Record<string, string>;

describe('the client: connect, list, call', () => {
  it('initialize → notifications/initialized → tools/list, each one POST to the one address, with the request rules', async () => {
    const s = server(good({session: 'sess-1'}));
    const {session, tools, skipped} = await connect(ADDRESS, {fetcher: s.fetcher, token: 'tok-secret-123'});
    expect(s.seen.map(x => x.body?.method)).toEqual(['initialize', 'notifications/initialized', 'tools/list']);
    expect(s.seen[0]!.body).toEqual({jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: PROTOCOL_LATEST, capabilities: {}, clientInfo: {name: 'ZIGoals NOVA', version: '1'}}});
    expect(s.seen[1]!.body).not.toHaveProperty('id');
    for (const x of s.seen) {
      expect(x.url).toBe(ADDRESS);
      expect(x.init).toMatchObject({method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store'});
      expect(x.init.signal).toBeInstanceOf(AbortSignal);
      expect(headersOf(x)).toMatchObject({'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer tok-secret-123'});
      expect(Object.keys(headersOf(x)).map(k => k.toLowerCase())).not.toContain('cookie');
    }
    // The session id and the negotiated version go back on every later request, never on the first.
    expect(headersOf(s.seen[0]!)).not.toHaveProperty('mcp-session-id'); expect(headersOf(s.seen[0]!)).not.toHaveProperty('mcp-protocol-version');
    for (const x of s.seen.slice(1)) expect(headersOf(x)).toMatchObject({'mcp-session-id': 'sess-1', 'mcp-protocol-version': PROTOCOL_LATEST});
    expect(session).toMatchObject({url: ADDRESS, origin: 'http://127.0.0.1:8000', protocol: PROTOCOL_LATEST, sessionId: 'sess-1', server: 'Pretend 1.2'});
    expect(tools.map(t => t.name)).toEqual(['search', 'send_mail']); expect(skipped).toBe(0);
  });
  it('without a token no Authorization header is sent; without a session id none is sent back', async () => {
    const s = server(good());
    const {session} = await connect(ADDRESS, {fetcher: s.fetcher});
    expect(session.sessionId).toBeNull();
    for (const x of s.seen) { expect(headersOf(x)).not.toHaveProperty('authorization'); expect(headersOf(x)).not.toHaveProperty('mcp-session-id'); }
  });
  it('reads an event-stream answer and skips the server’s own notifications and requests', async () => {
    const s = server(good({stream: true, session: 'abc'}));
    const {session, tools} = await connect(ADDRESS, {fetcher: s.fetcher});
    expect(tools).toHaveLength(2);
    expect(await callTool(session, 'search', {query: 'boots'}, {fetcher: s.fetcher})).toEqual({text: 'three results', failed: false, cut: false});
    expect(s.seen.at(-1)!.body).toEqual({jsonrpc: '2.0', id: 3, method: 'tools/call', params: {name: 'search', arguments: {query: 'boots'}}});
  });
  it('stops reading a stream the moment its answer is there (a server may keep it open)', async () => {
    let cancelled = false;
    const s = server(seen => {
      if (seen.body?.method !== 'tools/call') return good()(seen, 0);
      const enc = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(c) { c.enqueue(enc.encode(`data: ${JSON.stringify({jsonrpc: '2.0', id: seen.body!.id, result: {content: [{type: 'text', text: 'done'}]}})}\n\n`)); /* never closed */ },
        cancel() { cancelled = true; },
      });
      return new Response(body, {status: 200, headers: {'content-type': 'text/event-stream'}});
    });
    const {session} = await connect(ADDRESS, {fetcher: s.fetcher});
    expect((await callTool(session, 'search', {query: 'x'}, {fetcher: s.fetcher})).text).toBe('done');
    expect(cancelled).toBe(true);
  });
  it('negotiates the protocol version: a revision NOVA reads is used, another is refused', async () => {
    for (const protocol of PROTOCOLS_READ) {
      const s = server(good({protocol}));
      const {session} = await connect(ADDRESS, {fetcher: s.fetcher});
      expect(session.protocol).toBe(protocol); expect(headersOf(s.seen[2]!)['mcp-protocol-version']).toBe(protocol);
    }
    for (const protocol of ['1999-01-01', '2099-01-01', '', 3]) {
      const s = server(seen => seen.body?.method === 'initialize' ? json({jsonrpc: '2.0', id: 1, result: {protocolVersion: protocol, capabilities: {}}}) : good()(seen, 0));
      await expect(openSession(ADDRESS, {fetcher: s.fetcher})).rejects.toMatchObject({problem: 'version', message: BRIDGE_WORDS.version});
      expect(s.seen).toHaveLength(1); // nothing after the refused version
    }
  });
  it('follows the tool list’s pages, within limits', async () => {
    const page = (n: number) => Array.from({length: 40}, (_, i) => ({name: `t${n}_${i}`}));
    const s = server(seen => {
      if (seen.body?.method !== 'tools/list') return good()(seen, 0);
      const cursor = (seen.body.params as {cursor?: string} | undefined)?.cursor, n = cursor ? Number(cursor) : 0;
      return json({jsonrpc: '2.0', id: seen.body.id, result: {tools: page(n), nextCursor: String(n + 1)}});
    });
    const session = await openSession(ADDRESS, {fetcher: s.fetcher});
    const {tools, skipped} = await listTools(session, {fetcher: s.fetcher});
    expect(tools).toHaveLength(100); expect(skipped).toBe(100); // five pages of 40 asked, a hundred kept
    expect(s.seen.filter(x => x.body?.method === 'tools/list')).toHaveLength(5);
  });
  it('a tool’s result is plain text; an error of the tool is marked; a JSON-RPC error is a failure in the server’s (cleaned) words', async () => {
    const s = server(seen => seen.body?.method === 'tools/call'
      ? (seen.body.params as {name: string}).name === 'broken' ? json({jsonrpc: '2.0', id: seen.body.id, error: {code: -32000, message: 'No such mailbox Bearer abcdef123456'}})
        : json({jsonrpc: '2.0', id: seen.body.id, result: {content: [{type: 'text', text: 'could not send'}, {type: 'image', data: 'AAAA', mimeType: 'image/png'}], isError: true}})
      : good()(seen, 0));
    const {session} = await connect(ADDRESS, {fetcher: s.fetcher});
    expect(await callTool(session, 'send_mail', {}, {fetcher: s.fetcher})).toEqual({text: 'could not send\n\n[image not shown: NOVA shows text only]', failed: true, cut: false});
    const failure = await callTool(session, 'broken', {}, {fetcher: s.fetcher}).catch((e: unknown) => e) as BridgeError;
    expect(failure).toBeInstanceOf(BridgeError); expect(failure.problem).toBe('tool');
    expect(failure.message).toBe('The tool did not run. The server said: “No such mailbox Bearer [token]”');
  });
  it('ids go up by one per request and are never reused in a session', async () => {
    const s = server(good());
    const {session} = await connect(ADDRESS, {fetcher: s.fetcher});
    await callTool(session, 'search', {query: 'a'}, {fetcher: s.fetcher}); await callTool(session, 'search', {query: 'b'}, {fetcher: s.fetcher});
    expect(s.seen.filter(x => x.body && 'id' in x.body).map(x => x.body!.id)).toEqual([1, 2, 3, 4]);
  });
});

describe('the client: what it refuses', () => {
  const session = (): McpSession => ({url: ADDRESS, origin: 'http://127.0.0.1:8000', protocol: PROTOCOL_LATEST, sessionId: 's', server: '', nextId: 2});
  it('an address that is not loopback: nothing is sent', async () => {
    for (const address of ['https://example.com/mcp', 'http://192.168.1.10:8000', 'http://2130706433:8000', 'http://user:pw@127.0.0.1:8000', 'http://127.0.0.1:8000/mcp?token=x']) {
      const s = server(good());
      await expect(connect(address, {fetcher: s.fetcher})).rejects.toMatchObject({problem: 'address'});
      expect(s.seen, address).toHaveLength(0);
    }
    // And a session whose address was changed after it was made (a hand-edited record): checked again before each request.
    const s = server(good()), moved = {...session(), url: 'http://evil.example/mcp'};
    await expect(callTool(moved, 'search', {}, {fetcher: s.fetcher})).rejects.toMatchObject({problem: 'address'});
    await expect(listTools(moved, {fetcher: s.fetcher})).rejects.toMatchObject({problem: 'address'});
    await closeSession(moved, {fetcher: s.fetcher});
    expect(s.seen).toHaveLength(0);
  });
  it('never while the page is hidden', async () => {
    const s = server(good());
    await expect(connect(ADDRESS, {fetcher: s.fetcher, visible: () => false})).rejects.toMatchObject({problem: 'hidden', message: BRIDGE_WORDS.hidden});
    await expect(callTool(session(), 'search', {}, {fetcher: s.fetcher, visible: () => false})).rejects.toMatchObject({problem: 'hidden'});
    expect(s.seen).toHaveLength(0);
  });
  it('a redirect is an error, and an answer from another address is not read', async () => {
    // What a browser does with `redirect: 'error'`: the request fails. The knock that follows fails the same way.
    const refusing = server(() => { throw new TypeError('Failed to fetch'); });
    await expect(connect(ADDRESS, {fetcher: refusing.fetcher})).rejects.toMatchObject({problem: 'unreachable'});
    expect(refusing.seen.every(x => x.init.redirect === 'error')).toBe(true);
    // A fetch that followed one anyway: the answer says where it came from.
    for (const lie of [{redirected: true, url: ADDRESS}, {redirected: false, url: 'https://evil.example/mcp'}, {redirected: false, url: 'http://127.0.0.1:9999/mcp'}]) {
      const s = server(seen => { const r = good()(seen, 0) as Response; Object.defineProperties(r, {redirected: {value: lie.redirected}, url: {value: lie.url}}); return r; });
      const failure = await connect(ADDRESS, {fetcher: s.fetcher}).catch((e: unknown) => e) as BridgeError;
      expect(failure.problem).toBe('protocol'); expect(failure.message).toMatch(/another address/);
      expect(s.seen).toHaveLength(1); // nothing more was sent
    }
  });
  it('tells "nothing answers" from "it does not allow this site" with one opaque knock that reads nothing', async () => {
    const s = server(seen => { if (seen.init.mode === 'no-cors') return new Response(null, {status: 200}); throw new TypeError('Failed to fetch'); });
    await expect(connect(ADDRESS, {fetcher: s.fetcher})).rejects.toMatchObject({problem: 'refused', message: BRIDGE_WORDS.refused});
    expect(s.seen).toHaveLength(2);
    expect(s.seen[1]!.init).toMatchObject({method: 'GET', mode: 'no-cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'});
    expect(s.seen[1]!.init.headers).toBeUndefined(); expect(s.seen[1]!.init.body).toBeUndefined(); // no token, no body in the knock
  });
  it('401 and 403: a token is needed, or the one given was refused', async () => {
    for (const status of [401, 403]) {
      const s = server(() => new Response('nope', {status}));
      await expect(connect(ADDRESS, {fetcher: s.fetcher})).rejects.toMatchObject({problem: 'needs-token'});
      await expect(connect(ADDRESS, {fetcher: s.fetcher, token: 'abc123'})).rejects.toMatchObject({problem: 'wrong-token'});
    }
  });
  it('a 404 for a known session means "connect again"; other statuses name themselves', async () => {
    const s = server(() => new Response('gone', {status: 404}));
    await expect(callTool(session(), 'search', {}, {fetcher: s.fetcher})).rejects.toMatchObject({problem: 'session', message: BRIDGE_WORDS.session});
    await expect(connect(ADDRESS, {fetcher: s.fetcher})).rejects.toMatchObject({problem: 'http'});
    const five = server(() => new Response('<html>secret-internal-trace</html>', {status: 500}));
    const failure = await connect(ADDRESS, {fetcher: five.fetcher}).catch((e: unknown) => e) as BridgeError;
    expect(failure.problem).toBe('http'); expect(failure.message).toMatch(/\(500\)/); expect(failure.message).not.toMatch(/secret-internal-trace/); // the server's page is never echoed
  });
  it('a server whose session id this site may not read: the refusal that follows says which setting to change', async () => {
    // The browser hides Mcp-Session-Id unless the server exposes it; the server then refuses the next request for lack of it.
    const s = server(seen => seen.body?.method === 'initialize' ? good()(seen, 0) : new Response('Bad Request: no session', {status: 400}));
    const failure = await connect(ADDRESS, {fetcher: s.fetcher}).catch((e: unknown) => e) as BridgeError;
    expect(failure.problem).toBe('http'); expect(failure.message).toMatch(/expose the Mcp-Session-Id header in its CORS settings/); expect(failure.message).not.toMatch(/no session/);
  });
  it('an answer that is not JSON-RPC over JSON or an event stream is not read', async () => {
    const cases: Reply[] = [
      () => new Response('<html>hello</html>', {status: 200, headers: {'content-type': 'text/html'}}),
      () => new Response('not json', {status: 200, headers: {'content-type': 'application/json'}}),
      () => json({jsonrpc: '2.0', id: 99, result: {}}), // an answer to another id
      () => json({jsonrpc: '2.0', id: 1, method: 'sampling/createMessage'}), // the server asking NOVA something
      () => sse([{jsonrpc: '2.0', method: 'notifications/message'}]), // a stream that ends without the answer
      () => new Response(null, {status: 200}),
    ];
    for (const reply of cases) { const s = server(reply); await expect(connect(ADDRESS, {fetcher: s.fetcher})).rejects.toMatchObject({problem: 'protocol'}); expect(s.seen).toHaveLength(1); }
  });
  it('a session id that is not printable ASCII is refused', async () => {
    const s = server(seen => seen.body?.method === 'initialize' ? json({jsonrpc: '2.0', id: 1, result: {protocolVersion: PROTOCOL_LATEST, capabilities: {}}}, {'mcp-session-id': 'a b'}) : good()(seen, 0));
    await expect(connect(ADDRESS, {fetcher: s.fetcher})).rejects.toMatchObject({problem: 'protocol'});
  });
  it('reads at most 1 MB: a declared length above it is not read, and a body that grows past it is dropped', async () => {
    const declared = server(() => new Response('{}', {status: 200, headers: {'content-type': 'application/json', 'content-length': String(RESPONSE_MAX_BYTES + 1)}}));
    await expect(connect(ADDRESS, {fetcher: declared.fetcher})).rejects.toMatchObject({problem: 'too-big', message: BRIDGE_WORDS['too-big']});
    let pulled = 0, cancelled = false;
    const endless = server(() => new Response(new ReadableStream<Uint8Array>({pull(c) { pulled++; c.enqueue(new Uint8Array(64 * 1024).fill(32)); }, cancel() { cancelled = true; }}), {status: 200, headers: {'content-type': 'text/event-stream'}}));
    await expect(connect(ADDRESS, {fetcher: endless.fetcher})).rejects.toMatchObject({problem: 'too-big'});
    expect(cancelled).toBe(true); expect(pulled * 64 * 1024).toBeLessThan(RESPONSE_MAX_BYTES + 5 * 64 * 1024);
  });
  it('stops waiting: 15 s unless asked otherwise, never more than 60 s, and the request is aborted', async () => {
    expect(clampTimeout(undefined)).toBe(TIMEOUT_DEFAULT_MS); expect(TIMEOUT_DEFAULT_MS).toBe(15_000); expect(TIMEOUT_MAX_MS).toBe(60_000);
    expect(clampTimeout(600_000)).toBe(60_000); expect(clampTimeout(Infinity)).toBe(TIMEOUT_DEFAULT_MS); expect(clampTimeout(NaN)).toBe(TIMEOUT_DEFAULT_MS); expect(clampTimeout(5)).toBe(1000); expect(clampTimeout(30_000)).toBe(30_000);
    let aborted = false;
    const hanging = server(seen => new Promise<Response>((_, reject) => { seen.init.signal!.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }); }));
    await expect(connect(ADDRESS, {fetcher: hanging.fetcher, timeoutMs: 1000})).rejects.toMatchObject({problem: 'timeout', message: BRIDGE_WORDS.timeout});
    expect(aborted).toBe(true); expect(hanging.seen).toHaveLength(1); // no knock after a timeout
  });
  it('the person’s Stop ends it', async () => {
    const control = new AbortController();
    const hanging = server(seen => new Promise<Response>((_, reject) => { seen.init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))); queueMicrotask(() => control.abort()); }));
    await expect(connect(ADDRESS, {fetcher: hanging.fetcher, signal: control.signal})).rejects.toMatchObject({problem: 'stopped'});
    const never = server(good());
    await expect(connect(ADDRESS, {fetcher: never.fetcher, signal: control.signal})).rejects.toMatchObject({problem: 'stopped'}); expect(never.seen).toHaveLength(0);
  });
  it('the token is never in a failure’s words', async () => {
    const token = 'tok-9f8e7d6c5b4a';
    const s = server(seen => seen.body?.method === 'initialize' ? json({jsonrpc: '2.0', id: 1, error: {code: -1, message: `bad header Authorization: Bearer ${token} for ${token}`}}) : good()(seen, 0));
    const failure = await connect(ADDRESS, {fetcher: s.fetcher, token}).catch((e: unknown) => e) as BridgeError;
    expect(failure.problem).toBe('tool'); expect(failure.message).not.toContain(token); expect(failureLine(failure, token)).not.toContain(token);
    expect(failureLine(new Error(`boom ${token}`), token)).toBe('boom [token]');
    expect(failureLine('odd')).toBe('The tool server could not be used.');
    for (const words of Object.values(BRIDGE_WORDS)) expect(words).toMatch(/\.\)?$/);
  });
  it('closing a session is one DELETE with the session id, and never throws', async () => {
    const s = server(() => new Response(null, {status: 204}));
    await closeSession(session(), {fetcher: s.fetcher, token: 't0ken'});
    expect(s.seen).toHaveLength(1);
    expect(s.seen[0]!.init).toMatchObject({method: 'DELETE', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'});
    expect(headersOf(s.seen[0]!)).toMatchObject({'mcp-session-id': 's', authorization: 'Bearer t0ken'});
    await closeSession({...session(), sessionId: null}, {fetcher: s.fetcher}); expect(s.seen).toHaveLength(1); // no session: nothing to close
    const down = server(() => { throw new TypeError('Failed to fetch'); });
    await expect(closeSession(session(), {fetcher: down.fetcher})).resolves.toBeUndefined();
  });
  it('the module speaks only to the address it is given: no other host, no stdio, no cookie, no listening stream', () => {
    const source = readFileSync(join(__dirname, 'client.ts'), 'utf8'), code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(/https?:\/\/(?!127\.0\.0\.1)/); // no address of its own
    expect(code).not.toMatch(/child_process|node:|require\(|EventSource|WebSocket|localStorage|sessionStorage|document\.cookie|credentials: 'include'|credentials: 'same-origin'/);
    expect(code.match(/redirect: '(\w+)'/g)).toEqual(["redirect: 'error'", "redirect: 'error'", "redirect: 'error'"]);
    expect(code.match(/credentials: '(\w+)'/g)).toEqual(["credentials: 'omit'", "credentials: 'omit'", "credentials: 'omit'"]);
    expect(code.match(/referrerPolicy: '([\w-]+)'/g)).toEqual(["referrerPolicy: 'no-referrer'", "referrerPolicy: 'no-referrer'", "referrerPolicy: 'no-referrer'"]);
  });
});
