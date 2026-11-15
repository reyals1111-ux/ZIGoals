import {answerInBody, parseJson, rpcNotification, rpcRequest, type RpcAnswer} from './jsonrpc';
import {assertLoopback, NotLoopback, sameLoopback} from './loopback';
import {readTools, type ListedTool} from './schema';
import {SseReader} from './sse';
import {logLine, outcomeOf, plainLine, type ToolOutcome} from './untrusted';

/**
 * Session AM-2 (owner's step 4c, item 1): a minimal, hand-written Model Context Protocol client over Streamable HTTP, for
 * tool servers on the person's own computer only. No library, no stdio, no remote host.
 *
 * What it speaks: JSON-RPC 2.0 `initialize` (with protocol version negotiation), `notifications/initialized`,
 * `tools/list` (with its paging) and `tools/call`; every message is one HTTP POST to the one address the person typed;
 * the answer may be `application/json` or a `text/event-stream` that carries it; the `Mcp-Session-Id` a server hands out
 * is sent back on every later request and never stored. NOVA declares no client capability, so it never answers a
 * server's own requests (sampling, roots, elicitation) and never opens a listening stream.
 *
 * What every request obeys:
 * - the address is checked as a loopback address right before it is used (./loopback.ts), whatever was stored;
 * - `redirect: 'error'`: a server can never pass the request on to another host, and the answer's own address is checked
 *   again (`sameLoopback`);
 * - `credentials: 'omit'` (no cookie, no browser sign-in), `referrerPolicy: 'no-referrer'`, `cache: 'no-store'`;
 * - a time limit (15 s unless asked otherwise, never more than 60 s) over the whole exchange, body included;
 * - at most 1 MB of answer is read, then the request is dropped;
 * - never while the page is hidden (`visible`);
 * - the person's token, when the server needs one, is sent as `Authorization: Bearer …` to that address only, and is
 *   taken out of every message this module makes (./untrusted.ts `logLine`).
 * Whatever a server answers is untrusted data: read, bounded, shown as plain text; nothing in it is followed.
 */
export const PROTOCOL_LATEST = '2025-06-18';
/**
 * The revisions NOVA reads: the specification's dated versions this client was written against (2024-11-05, 2025-03-26,
 * 2025-06-18), whose `initialize`, `tools/list` and `tools/call` are the same. Any other answer, an earlier or a later
 * date included, is "not understood": NOVA stops there in plain words rather than guess at a revision it has not read.
 */
export const PROTOCOLS_READ: readonly string[] = ['2025-06-18', '2025-03-26', '2024-11-05'];
export const TIMEOUT_DEFAULT_MS = 15_000, TIMEOUT_MAX_MS = 60_000, TIMEOUT_MIN_MS = 1000, RESPONSE_MAX_BYTES = 1_000_000, LIST_PAGES_MAX = 5;
export const CLIENT_INFO = {name: 'ZIGoals NOVA', version: '1'} as const;
export const clampTimeout = (ms: number | null | undefined): number => typeof ms === 'number' && Number.isFinite(ms) ? Math.min(TIMEOUT_MAX_MS, Math.max(TIMEOUT_MIN_MS, Math.round(ms))) : TIMEOUT_DEFAULT_MS;

export type BridgeProblem = 'address' | 'hidden' | 'unreachable' | 'refused' | 'timeout' | 'too-big' | 'needs-token' | 'wrong-token' | 'session' | 'http' | 'protocol' | 'version' | 'tool' | 'stopped';
export const BRIDGE_WORDS: Readonly<Record<Exclude<BridgeProblem, 'address' | 'tool' | 'http'>, string>> = {
  hidden: 'Nothing was sent: NOVA only reaches a tool while this page is in front of you.',
  unreachable: 'Nothing answered at that address. Start your tool server, check the port, and try again. (On Safari a secure site cannot reach this computer: use Chrome, Edge or Firefox.)',
  refused: 'Something is running at that address, but it does not allow this site. In the server’s own settings, allow this site’s address (its CORS or allowed-origins setting), let it accept and expose the Mcp-Session-Id header, then try again.',
  timeout: 'The server did not answer in time, so NOVA stopped waiting. Nothing more was sent.',
  'too-big': 'The server’s answer was larger than 1 MB, so NOVA stopped reading it.',
  'needs-token': 'The server asks for a token and none was given. Type the token your server shows; it is sent only to that address.',
  'wrong-token': 'The server refused the token. Check it in your server’s own settings and type it again.',
  session: 'The server no longer knows this connection (it restarted, or the connection ran out). Connect again.',
  protocol: 'The server answered, but not in a way NOVA can read (it must speak the Model Context Protocol over Streamable HTTP at this exact address).',
  version: 'The server answered with a version of the Model Context Protocol that NOVA does not understand (it reads 2024-11-05, 2025-03-26 and 2025-06-18). Nothing more was sent. Set the server to one of those, if it can.',
  stopped: 'Stopped.',
};
export class BridgeError extends Error {
  readonly problem: BridgeProblem;
  constructor(problem: BridgeProblem, message?: string) { super(message ?? (problem in BRIDGE_WORDS ? BRIDGE_WORDS[problem as keyof typeof BRIDGE_WORDS] : 'The tool server could not be used.')); this.name = 'BridgeError'; this.problem = problem; }
}
export type ClientDeps = {
  fetcher?: typeof fetch; signal?: AbortSignal; timeoutMs?: number;
  /** The person's token for this server, in memory; never part of a message this module makes. */ token?: string | null;
  /** Whether the page is in front of the person now (default: yes where there is no document). */ visible?: () => boolean;
};
export type McpSession = {
  /** Where every request goes: the address the person typed, as ./loopback.ts reads it. */ url: string; origin: string;
  protocol: string; sessionId: string | null;
  /** What the server calls itself (untrusted, one plain line). */ server: string;
  nextId: number;
};
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const SESSION_ID = /^[\x21-\x7e]{1,256}$/;
const visibleNow = (deps: ClientDeps): boolean => deps.visible ? deps.visible() : typeof document === 'undefined' || document.visibilityState !== 'hidden';

type Sent = {answer: RpcAnswer | null; response: Response};
/**
 * One POST. `id`: the request's id whose answer is read (null for a notification: the body is not read). The session's
 * headers are added when there is one. Throws a `BridgeError` in plain words; never returns a redirected answer.
 */
async function post(target: {url: string; protocol?: string; sessionId?: string | null}, body: unknown, id: number | null, deps: ClientDeps): Promise<Sent> {
  let where: string;
  try { where = assertLoopback(target.url).url; } catch (cause) { throw new BridgeError('address', cause instanceof NotLoopback ? cause.message : 'That address cannot be used.'); }
  if (!visibleNow(deps)) throw new BridgeError('hidden');
  if (deps.signal?.aborted) throw new BridgeError('stopped');
  const fetcher = deps.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const control = new AbortController(), limit = clampTimeout(deps.timeoutMs);
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; control.abort(); }, limit), stop = () => control.abort();
  deps.signal?.addEventListener('abort', stop, {once: true});
  const headers: Record<string, string> = {'content-type': 'application/json', accept: 'application/json, text/event-stream'};
  if (target.protocol) headers['mcp-protocol-version'] = target.protocol;
  if (target.sessionId) headers['mcp-session-id'] = target.sessionId;
  if (deps.token) headers.authorization = `Bearer ${deps.token}`;
  const init: RequestInit = {method: 'POST', headers, body: JSON.stringify(body), mode: 'cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store', signal: control.signal};
  const failed = (cause: unknown): BridgeError => cause instanceof BridgeError ? cause : timedOut ? new BridgeError('timeout') : deps.signal?.aborted ? new BridgeError('stopped') : new BridgeError('protocol');
  try {
    let response: Response;
    try { response = await fetcher(where, init); }
    catch {
      if (timedOut) throw new BridgeError('timeout');
      if (deps.signal?.aborted) throw new BridgeError('stopped');
      // A page cannot tell "nothing listens" from "the browser hid the answer": one opaque knock (nothing is read from it) tells them apart.
      const up = await fetcher(where, {method: 'GET', mode: 'no-cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store', signal: control.signal}).then(r => { void r.body?.cancel().catch(() => undefined); return true; }, () => false);
      throw new BridgeError(up ? 'refused' : 'unreachable');
    }
    if (!sameLoopback(where, response)) { void response.body?.cancel().catch(() => undefined); throw new BridgeError('protocol', 'The server tried to send NOVA on to another address. NOVA does not follow it, and nothing more was sent.'); }
    if (response.status === 401 || response.status === 403) { void response.body?.cancel().catch(() => undefined); throw new BridgeError(deps.token ? 'wrong-token' : 'needs-token'); }
    if (response.status === 404 && target.sessionId) { void response.body?.cancel().catch(() => undefined); throw new BridgeError('session'); }
    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined);
      // After "initialize" without a session id NOVA could read: a server that hands one out must let this site read it.
      if (response.status === 400 && target.protocol && !target.sessionId) throw new BridgeError('http', 'The server refused the request after it had started the connection (400). If it hands out a session id, it must let this site read it: expose the Mcp-Session-Id header in its CORS settings, then connect again.');
      throw new BridgeError('http', `The server answered with an error (${response.status}). Check that this is the server’s Model Context Protocol address, usually ending in /mcp.`);
    }
    if (id === null) { void response.body?.cancel().catch(() => undefined); return {answer: null, response}; }
    const declared = Number(response.headers.get('content-length') ?? '');
    if (Number.isFinite(declared) && declared > RESPONSE_MAX_BYTES) { void response.body?.cancel().catch(() => undefined); throw new BridgeError('too-big'); }
    const type = (response.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
    if (type !== 'application/json' && type !== 'text/event-stream') { void response.body?.cancel().catch(() => undefined); throw new BridgeError('protocol'); }
    const answer = await readAnswer(response, type === 'text/event-stream', id);
    if (!answer) throw new BridgeError('protocol');
    return {answer, response};
  } catch (cause) { throw failed(cause); }
  finally { clearTimeout(timer); deps.signal?.removeEventListener('abort', stop); }
}
/** Reads the body up to the cap, as it arrives: a JSON body whole, an event stream until the answer to `id` is there (then the stream is dropped). */
async function readAnswer(response: Response, stream: boolean, id: number): Promise<RpcAnswer | null> {
  const body = response.body;
  if (!body || typeof body.getReader !== 'function') {
    const text = await response.text();
    if (text.length > RESPONSE_MAX_BYTES) throw new BridgeError('too-big');
    if (!stream) return answerInBody(parseJson(text), id);
    const sse = new SseReader();
    for (const event of [...sse.push(text), ...sse.end()]) { const answer = answerInBody(parseJson(event.data), id); if (answer) return answer; }
    return null;
  }
  const reader = body.getReader(), decoder = new TextDecoder(), sse = new SseReader();
  let bytes = 0, text = '';
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (value) {
        bytes += value.byteLength;
        if (bytes > RESPONSE_MAX_BYTES) throw new BridgeError('too-big');
        const piece = decoder.decode(value, {stream: true});
        if (!stream) text += piece;
        else for (const event of sse.push(piece)) { const answer = answerInBody(parseJson(event.data), id); if (answer) return answer; }
      }
      if (done) break;
    }
    if (!stream) return answerInBody(parseJson(text + decoder.decode()), id);
    for (const event of [...sse.push(decoder.decode()), ...sse.end()]) { const answer = answerInBody(parseJson(event.data), id); if (answer) return answer; }
    return null;
  } finally { void reader.cancel().catch(() => undefined); }
}
const rpcFailure = (answer: Extract<RpcAnswer, {ok: false}>, what: string, deps: ClientDeps): BridgeError =>
  new BridgeError('tool', `${what} The server said: “${logLine(answer.error.message, [deps.token]) || `error ${answer.error.code}`}”`);

/** `initialize`, then `notifications/initialized`: the session for this visit. Nothing is listed or called yet. */
export async function openSession(address: string, deps: ClientDeps = {}): Promise<McpSession> {
  let read;
  try { read = assertLoopback(address); } catch (cause) { throw new BridgeError('address', cause instanceof NotLoopback ? cause.message : 'That address cannot be used.'); }
  const {answer, response} = await post({url: read.url}, rpcRequest(1, 'initialize', {protocolVersion: PROTOCOL_LATEST, capabilities: {}, clientInfo: CLIENT_INFO}), 1, deps);
  if (!answer!.ok) throw rpcFailure(answer as Extract<RpcAnswer, {ok: false}>, 'The server refused to start a connection.', deps);
  const result = answer!.result, protocol = result.protocolVersion;
  if (typeof protocol !== 'string' || !PROTOCOLS_READ.includes(protocol)) throw new BridgeError('version');
  const given = response.headers.get('mcp-session-id');
  if (given !== null && !SESSION_ID.test(given)) throw new BridgeError('protocol');
  const info = isObject(result.serverInfo) ? result.serverInfo : {};
  const server = plainLine(`${typeof info.name === 'string' ? info.name : ''} ${typeof info.version === 'string' ? info.version : ''}`, 80);
  const session: McpSession = {url: read.url, origin: read.origin, protocol, sessionId: given, server, nextId: 2};
  await post(session, rpcNotification('notifications/initialized'), null, deps);
  return session;
}
/** `tools/list`, every page up to the limits: the tools NOVA can keep and how many it left out. */
export async function listTools(session: McpSession, deps: ClientDeps = {}): Promise<{tools: ListedTool[]; skipped: number}> {
  let tools: ListedTool[] = [], skipped = 0, cursor: string | undefined;
  for (let page = 0; page < LIST_PAGES_MAX; page++) {
    const id = session.nextId++;
    const {answer} = await post(session, rpcRequest(id, 'tools/list', cursor ? {cursor} : undefined), id, deps);
    if (!answer!.ok) throw rpcFailure(answer as Extract<RpcAnswer, {ok: false}>, 'The server did not list its tools.', deps);
    const read = readTools(answer!.result.tools, tools);
    tools = [...tools, ...read.tools]; skipped += read.skipped;
    const next = answer!.result.nextCursor;
    if (typeof next !== 'string' || !next || next.length > 500) break;
    cursor = next;
  }
  return {tools, skipped};
}
/** Connects and lists in one go: what the panel's "Connect" and the guide's live check do. */
export async function connect(address: string, deps: ClientDeps = {}): Promise<{session: McpSession; tools: ListedTool[]; skipped: number}> {
  const session = await openSession(address, deps);
  return {session, ...(await listTools(session, deps))};
}
/**
 * `tools/call`: ONE call, sent only because the person pressed the card's button (the caller's rule, ./propose.ts). The
 * arguments are the ones the card showed (already checked and guarded). The result is untrusted text.
 */
export async function callTool(session: McpSession, name: string, args: Record<string, unknown>, deps: ClientDeps = {}): Promise<ToolOutcome> {
  const id = session.nextId++;
  const {answer} = await post(session, rpcRequest(id, 'tools/call', {name, arguments: args}), id, deps);
  if (!answer!.ok) throw rpcFailure(answer as Extract<RpcAnswer, {ok: false}>, 'The tool did not run.', deps);
  return outcomeOf(answer!.result, [deps.token]);
}
/** Tells the server the visit is over (HTTP DELETE with the session id), when it gave one. Best effort: never throws, nothing is read. */
export async function closeSession(session: McpSession, deps: ClientDeps = {}): Promise<void> {
  if (!session.sessionId) return;
  try {
    const where = assertLoopback(session.url).url, fetcher = deps.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
    const control = new AbortController(), timer = setTimeout(() => control.abort(), 3000);
    const headers: Record<string, string> = {'mcp-session-id': session.sessionId, 'mcp-protocol-version': session.protocol};
    if (deps.token) headers.authorization = `Bearer ${deps.token}`;
    try { const r = await fetcher(where, {method: 'DELETE', headers, mode: 'cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store', signal: control.signal}); void r.body?.cancel().catch(() => undefined); }
    finally { clearTimeout(timer); }
  } catch { /* the server forgets the session by itself */ }
}
/** One plain line for a failure, with nothing of the token in it. */
export function failureLine(cause: unknown, token?: string | null): string {
  if (cause instanceof BridgeError) return cause.message;
  if (cause instanceof NotLoopback) return cause.message;
  return logLine(cause instanceof Error ? cause.message : 'The tool server could not be used.', [token]) || 'The tool server could not be used.';
}
