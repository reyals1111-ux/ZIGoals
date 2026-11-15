'use client';
import {useCallback, useEffect, useMemo, useRef, useSyncExternalStore} from 'react';
import {forgetKey, forgetSlots, hasRememberedKey, holdKey, readKey, rememberKey, SHOWCASE_SCOPE} from '../../../lib/ai/keys';
import {currentAiScope} from '../../../lib/ai/scope';
import {callTool, closeSession, connect, failureLine} from '../../../lib/nova/agent-bridge/client';
import {parseLoopback} from '../../../lib/nova/agent-bridge/loopback';
import {mayRun, offeredTools, type CardContext, type ToolCard} from '../../../lib/nova/agent-bridge/propose';
import {addServer, allOff, keepListed, NOVA_AGENT, removeServer, serverById, serverId, serversOf, setToolAsk, tokenSlot, tokenSlots, type AgentServer} from '../../../lib/nova/agent-bridge/record';
import type {ToolOutcome} from '../../../lib/nova/agent-bridge/untrusted';
import {noteOutbox} from '../../../lib/nova/outbox/record';
import {getAppStorage} from '../../../lib/showcase-storage';
import {useDeviceRecord} from '../../ai/use-device-record';
import {dropLive, EMPTY_LIVE, liveEntry, liveIds, liveServers, liveSnapshot, offeredNow, setLive, subscribeLive} from './live-store';

export {offeredNow, type LiveEntry} from './live-store';

/**
 * Session AM-2 (step 4c): the person's tool servers in a component. The stored part is the device record
 * (`zigoals:nova-agent:v1`: addresses, labels, the tools on "Ask every time"). Everything else lives in this page's memory
 * for the visit and is gone on reload: the connection to each server (its session id, the tools it listed) and a token
 * the person did not ask to remember. One store for the page, so NOVA's chat (a model's proposal) and the panel (a call
 * filled in by hand) see the same connections.
 *
 * Nothing here reaches a server by itself: a connection is made by the person's press ("Connect"), and a tool is called
 * only from a confirm card's button (`run`), after the last look (lib/nova/agent-bridge/propose.ts `mayRun`). Each call
 * that was sent is noted in the device's history: when, the server's loopback address, the tool's name, ok or failed.
 */
const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';
/** The token typed for THIS server at THIS address (security review, finding 8: the slot is the id and the origin together), or none. */
const tokenFor = async (id: string, address: string): Promise<string | null> => { const slot = tokenSlot(id, address); if (!slot) return null; try { return await readKey(currentAiScope(), slot); } catch { return null; } };
export type RunResult = {ok: true; outcome: ToolOutcome; /** The call is in the history (not for a conversation the person chose not to keep). */ noted: boolean} | {ok: false; message: string; /** The call was sent (and failed). */ sent: boolean; noted: boolean};

export function useAgentBridge() {
  const record = useDeviceRecord(NOVA_AGENT), entries = useSyncExternalStore(subscribeLive, liveSnapshot, () => EMPTY_LIVE);
  const servers = serversOf(record.data);
  const offered = useMemo(() => offeredTools(liveServers(servers, entries)), [servers, entries]);
  // A server whose row is gone, or whose address changed (removed here, in another tab or by a restore): its connection
  // ends here too, and its token is forgotten on this device — the rows that were here a moment ago by their own slots,
  // and any other tool-server token that no row points at any more (finding 8). Never while the record cannot be read.
  const slotsBefore = useRef<ReadonlySet<string> | null>(null);
  useEffect(() => {
    if (!record.loaded || record.unreadable) return;
    for (const id of liveIds()) {
      const row = serverById(record.data, id), at = row ? parseLoopback(row.address) : null, entry = liveEntry(id);
      if (!at?.ok || (entry && at.url !== entry.session.url)) { const gone = dropLive(id); if (gone) void closeSession(gone.session); }
    }
    const now = tokenSlots(record.data), scope = currentAiScope(), key = [...now].sort().join(' ');
    for (const slot of slotsBefore.current ?? []) if (!now.has(slot)) void forgetKey(scope, slot as `mcp-${string}`).catch(() => undefined);
    if (slotsBefore.current === null || [...slotsBefore.current].sort().join(' ') !== key) void forgetSlots(scope, 'mcp-', now).catch(() => undefined);
    slotsBefore.current = now;
  }, [record.loaded, record.unreadable, record.data]);
  /** Connects (or connects again) and lists the tools. Returns a plain line for the status. */
  const connectServer = useCallback(async (id: string): Promise<{ok: boolean; line: string}> => {
    const server = serverById(record.data, id);
    if (!server) return {ok: false, line: 'That server is no longer in the list.'};
    const token = await tokenFor(id, server.address);
    try {
      const before = liveEntry(id);
      if (before) void closeSession(before.session, {token});
      const made = await connect(server.address, {token, visible});
      setLive(id, {session: made.session, tools: made.tools, skipped: made.skipped, at: Date.now()});
      // A tool the server no longer lists is no longer switched on.
      try { record.update(r => keepListed(r, id, made.tools.map(t => t.name))); } catch { /* the switches stay as they were; an unlisted tool is not offered anyway */ }
      return {ok: true, line: `${made.session.server || 'The server'} answered. ${made.tools.length === 0 ? 'It lists no tools.' : `${made.tools.length} tool${made.tools.length === 1 ? '' : 's'} found.`}${made.skipped ? ` ${made.skipped} could not be read and ${made.skipped === 1 ? 'is' : 'are'} left out.` : ''}`};
    } catch (cause) {
      dropLive(id);
      return {ok: false, line: failureLine(cause, token)};
    }
  }, [record]);
  /** Adds a server (every tool Off), keeps its token as asked, and connects. Throws a plain sentence when the address is refused. */
  const add = useCallback(async (input: {address: string; label: string; token: string; remember: boolean}): Promise<{id: string; ok: boolean; line: string}> => {
    const at = parseLoopback(input.address);
    if (!at.ok) throw Error(at.message);
    const id = serverId(crypto.getRandomValues(new Uint8Array(8)));
    let made: AgentServer | null = null;
    record.update(r => { const out = addServer(r, {id, address: input.address, label: input.label, at: new Date()}); made = out.server; return out.record; });
    const server = made as AgentServer | null;
    if (!server) throw Error('The server could not be added. Try again.');
    const scope = currentAiScope(), secret = input.token.trim(), slot = tokenSlot(server.id, server.address);
    if (secret && slot) {
      // Sealed only when asked (never in the Showcase); otherwise held for this page, and an older sealed one must not come back.
      if (input.remember && scope !== SHOWCASE_SCOPE) await rememberKey(scope, slot, secret);
      else { await forgetKey(scope, slot).catch(() => undefined); holdKey(scope, slot, secret); }
    }
    return {id: server.id, ...(await connectServer(server.id))};
  }, [record, connectServer]);
  const setToken = useCallback(async (id: string, token: string, remember: boolean) => {
    const scope = currentAiScope(), secret = token.trim(), server = serverById(record.data, id), slot = server ? tokenSlot(id, server.address) : null;
    if (!slot) return;
    await forgetKey(scope, slot).catch(() => undefined);
    if (!secret) return;
    if (remember && scope !== SHOWCASE_SCOPE) await rememberKey(scope, slot, secret); else holdKey(scope, slot, secret);
  }, [record.data]);
  const tokenState = useCallback(async (id: string): Promise<'none' | 'visit' | 'remembered'> => {
    const scope = currentAiScope(), server = serverById(record.data, id), slot = server ? tokenSlot(id, server.address) : null;
    if (!slot) return 'none';
    try { if (scope !== SHOWCASE_SCOPE && await hasRememberedKey(scope, slot)) return 'remembered'; return (await readKey(scope, slot)) ? 'visit' : 'none'; } catch { return 'none'; }
  }, [record.data]);
  const disconnect = useCallback((id: string) => {
    const entry = dropLive(id); if (!entry) return;
    void tokenFor(id, entry.session.url).then(token => closeSession(entry.session, {token}));
  }, []);
  /** Removes the server: its address and switches from the record, its token from this device, its connection from this page. */
  const remove = useCallback(async (id: string) => {
    const slot = (() => { const server = serverById(record.data, id); return server ? tokenSlot(id, server.address) : null; })();
    disconnect(id);
    record.update(r => removeServer(r, id));
    if (slot) await forgetKey(currentAiScope(), slot).catch(() => undefined);
  }, [record, disconnect]);
  const setAsk = useCallback((id: string, tool: string, ask: boolean) => { record.update(r => setToolAsk(r, id, tool, ask)); }, [record]);
  const everythingOff = useCallback(() => { record.update(allOff); }, [record]);
  /**
   * The card's button. The last look first; then ONE `tools/call`; then the history entry (when, the server's address,
   * the tool's name, ok or failed — never the arguments or the result). `keep: false`: the card came from a conversation
   * the person chose not to keep ("Don't keep this chat": nothing of it is written on this device), so no entry is made.
   */
  const run = useCallback(async (card: ToolCard, ctx: CardContext, options: {keep?: boolean} = {}): Promise<RunResult> => {
    const now = offeredNow(), look = mayRun(card, {visible: visible(), offered: now, ...ctx});
    if (!look.ok) return {ok: false, message: look.message, sent: false, noted: false};
    const entry = liveEntry(card.serverId);
    if (!entry) return {ok: false, message: 'Nothing was sent: this server is not connected in this visit. Connect it again first.', sent: false, noted: false};
    const token = await tokenFor(card.serverId, entry.session.url), note = (ok: boolean): boolean => options.keep !== false && noteOutbox(getAppStorage(), {at: new Date().toISOString(), kind: 'tool', what: card.tool.name, target: card.origin, ok});
    try {
      const outcome = await callTool(entry.session, card.tool.name, card.args, {token, visible});
      return {ok: true, outcome, noted: note(!outcome.failed)};
    } catch (cause) {
      const problem = (cause as {problem?: string} | null)?.problem;
      // Refused before anything left (the address, the hidden page): not a call, so not in the history.
      const sent = problem !== 'address' && problem !== 'hidden' && problem !== 'stopped';
      if (problem === 'session') dropLive(card.serverId);
      return {ok: false, message: failureLine(cause, token), sent, noted: sent && note(false)};
    }
  }, []);
  return {record, servers, entries, offered, add, connectServer, disconnect, remove, setAsk, everythingOff, setToken, tokenState, run};
}
export type AgentBridge = ReturnType<typeof useAgentBridge>;
