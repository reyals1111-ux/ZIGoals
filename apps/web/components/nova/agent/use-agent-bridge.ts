'use client';
import {useCallback, useEffect, useMemo, useSyncExternalStore} from 'react';
import {forgetKey, hasRememberedKey, holdKey, readKey, rememberKey, SHOWCASE_SCOPE} from '../../../lib/ai/keys';
import {currentAiScope} from '../../../lib/ai/scope';
import {callTool, closeSession, connect, failureLine} from '../../../lib/nova/agent-bridge/client';
import {parseLoopback} from '../../../lib/nova/agent-bridge/loopback';
import {mayRun, offeredTools, type CardContext, type ToolCard} from '../../../lib/nova/agent-bridge/propose';
import {addServer, allOff, keepListed, NOVA_AGENT, removeServer, serverById, serverId, serversOf, setToolAsk, tokenSlot, type AgentServer} from '../../../lib/nova/agent-bridge/record';
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
const tokenFor = async (id: string): Promise<string | null> => { try { return await readKey(currentAiScope(), tokenSlot(id)); } catch { return null; } };
export type RunResult = {ok: true; outcome: ToolOutcome; /** The call is in the history (not for a conversation the person chose not to keep). */ noted: boolean} | {ok: false; message: string; /** The call was sent (and failed). */ sent: boolean; noted: boolean};

export function useAgentBridge() {
  const record = useDeviceRecord(NOVA_AGENT), entries = useSyncExternalStore(subscribeLive, liveSnapshot, () => EMPTY_LIVE);
  const servers = serversOf(record.data);
  const offered = useMemo(() => offeredTools(liveServers(servers, entries)), [servers, entries]);
  // A server removed in another tab: its connection ends here too.
  useEffect(() => {
    if (!record.loaded) return;
    for (const id of liveIds()) if (!serverById(record.data, id)) { const entry = dropLive(id); if (entry) void closeSession(entry.session); }
  }, [record.loaded, record.data]);
  /** Connects (or connects again) and lists the tools. Returns a plain line for the status. */
  const connectServer = useCallback(async (id: string): Promise<{ok: boolean; line: string}> => {
    const server = serverById(record.data, id);
    if (!server) return {ok: false, line: 'That server is no longer in the list.'};
    const token = await tokenFor(id);
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
    const scope = currentAiScope(), secret = input.token.trim();
    if (secret) {
      // Sealed only when asked (never in the Showcase); otherwise held for this page, and an older sealed one must not come back.
      if (input.remember && scope !== SHOWCASE_SCOPE) await rememberKey(scope, tokenSlot(server.id), secret);
      else { await forgetKey(scope, tokenSlot(server.id)).catch(() => undefined); holdKey(scope, tokenSlot(server.id), secret); }
    }
    return {id: server.id, ...(await connectServer(server.id))};
  }, [record, connectServer]);
  const setToken = useCallback(async (id: string, token: string, remember: boolean) => {
    const scope = currentAiScope(), secret = token.trim();
    await forgetKey(scope, tokenSlot(id)).catch(() => undefined);
    if (!secret) return;
    if (remember && scope !== SHOWCASE_SCOPE) await rememberKey(scope, tokenSlot(id), secret); else holdKey(scope, tokenSlot(id), secret);
  }, []);
  const tokenState = useCallback(async (id: string): Promise<'none' | 'visit' | 'remembered'> => {
    const scope = currentAiScope();
    try { if (scope !== SHOWCASE_SCOPE && await hasRememberedKey(scope, tokenSlot(id))) return 'remembered'; return (await readKey(scope, tokenSlot(id))) ? 'visit' : 'none'; } catch { return 'none'; }
  }, []);
  const disconnect = useCallback((id: string) => {
    const entry = dropLive(id); if (!entry) return;
    void tokenFor(id).then(token => closeSession(entry.session, {token}));
  }, []);
  /** Removes the server: its address and switches from the record, its token from this device, its connection from this page. */
  const remove = useCallback(async (id: string) => {
    disconnect(id);
    record.update(r => removeServer(r, id));
    await forgetKey(currentAiScope(), tokenSlot(id)).catch(() => undefined);
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
    const token = await tokenFor(card.serverId), note = (ok: boolean): boolean => options.keep !== false && noteOutbox(getAppStorage(), {at: new Date().toISOString(), kind: 'tool', what: card.tool.name, target: card.origin, ok});
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
