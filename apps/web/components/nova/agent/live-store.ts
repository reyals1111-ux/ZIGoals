import {ACCOUNT_CHANGE} from '../../../lib/account-session';
import {readDeviceRecord} from '../../../lib/device-record';
import type {McpSession} from '../../../lib/nova/agent-bridge/client';
import {offeredTools, type LiveServer, type OfferedTool} from '../../../lib/nova/agent-bridge/offer';
import {NOVA_AGENT, serversOf, type AgentServer} from '../../../lib/nova/agent-bridge/record';
import type {ListedTool} from '../../../lib/nova/agent-bridge/schema';
import {getAppStorage} from '../../../lib/showcase-storage';

/**
 * Session AM-2 (step 4c): this page's connections to the person's tool servers, for the visit only (never stored): each
 * server's session and the tools it listed. One store for the page, so NOVA's chat (a model's proposal) and the panel (a
 * call filled in by hand) see the same connections. Small on purpose: NOVA's chat reads `offeredNow` at the moment of a
 * send, and the client, the guard and the card load only when they are needed.
 */
export type LiveEntry = {session: McpSession; tools: readonly ListedTool[]; skipped: number; at: number};
const live = new Map<string, LiveEntry>(), listeners = new Set<() => void>();
let snapshot: ReadonlyMap<string, LiveEntry> = new Map();
export const EMPTY_LIVE: ReadonlyMap<string, LiveEntry> = new Map();
const publish = () => { snapshot = new Map(live); for (const listener of listeners) listener(); };
export const subscribeLive = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const liveSnapshot = (): ReadonlyMap<string, LiveEntry> => snapshot;
export const liveEntry = (id: string): LiveEntry | undefined => live.get(id);
export const liveIds = (): string[] => [...live.keys()];
export function setLive(id: string, entry: LiveEntry): void { live.set(id, entry); publish(); }
export function dropLive(id: string): LiveEntry | undefined { const entry = live.get(id); if (entry) { live.delete(id); publish(); } return entry; }
if (typeof window !== 'undefined') window.addEventListener(ACCOUNT_CHANGE, () => { if (live.size) { live.clear(); publish(); } }); // another account has its own connections
export const liveServers = (servers: readonly AgentServer[], entries: ReadonlyMap<string, LiveEntry>): LiveServer[] => servers.flatMap(server => { const entry = entries.get(server.id); return entry ? [{server, tools: entry.tools}] : []; });
/** The tools on "Ask every time" right now — listed in this visit and switched on in the device record as it is at this moment. */
export function offeredNow(): OfferedTool[] {
  if (!live.size) return [];
  try { const read = readDeviceRecord(getAppStorage(), NOVA_AGENT); return read.unreadable ? [] : offeredTools(liveServers(serversOf(read.data), snapshot)); } catch { return []; }
}
