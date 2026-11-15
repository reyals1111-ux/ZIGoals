import * as z from 'zod';
import type {DeviceRecordSpec} from '../../device-record';
import {baseOf, parseLoopback} from './loopback';

/**
 * Session AM-2 (owner's step 4c, item 8; TIER 3 stored format, additive): NOVA's own-agent record,
 * `zigoals:nova-agent:v1`. Device only. It holds what the person connected on THIS computer:
 * - `servers`: the tool servers (Model Context Protocol) on this computer: an id, the loopback address as typed, a label
 *   of the person's own, when it was added, and the names of the tools switched to "Ask every time" (`ask`). A tool that
 *   is not named there is Off, which is every tool's state until the person switches it. There is no "always allow";
 * - `agent`: the person's own OpenAI-compatible agent on this computer: its loopback address, the model it reported, the
 *   last live check, and whether the person confirmed it answers with a model on this computer.
 * It never holds a token, a password, a tool's description or schema (those are read from the server each visit), an
 * argument or a result. A token the person asks to remember is sealed in the device's key store (lib/ai/keys.ts, slot
 * `mcp-<id>`), never here.
 *
 * A loose object, version 1, every field optional, every list bounded. Reads are tolerant: a server whose address is not
 * one of the three loopback forms (./loopback.ts) is left out, so a hand-edited or crafted record can never hold another
 * host. Exported, restored and erased; never synced. A restore brings the addresses and labels and nothing else: every
 * tool comes back Off and the agent comes back unconfirmed (`novaAgentRestoreSchema`).
 */
export const NOVA_AGENT_KEY = 'zigoals:nova-agent:v1';
export const MAX_SERVERS = 8, MAX_ASK = 100, MAX_LABEL = 40, MAX_MODEL = 200;
const UNSAFE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/;
const plain = (max: number) => z.string().max(max).refine(s => !UNSAFE.test(s), 'Plain text.');
const iso = z.string().min(10).max(40).refine(s => !Number.isNaN(Date.parse(s)), 'A time.');
const loopback = z.string().max(300).refine(s => parseLoopback(s).ok, 'An address on this computer.');
const toolName = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/);
export const SERVER_ID = /^[a-z0-9]{6,12}$/;
export const agentServerSchema = z.looseObject({
  id: z.string().regex(SERVER_ID),
  address: loopback,
  label: plain(MAX_LABEL).min(1),
  addedAt: iso.optional().catch(undefined),
  /** The tools on "Ask every time"; absent or empty: every tool Off. */
  ask: z.array(z.unknown()).transform(list => [...new Set(list.flatMap(n => toolName.safeParse(n).success ? [n as string] : []))].slice(0, MAX_ASK)).optional().catch(undefined),
});
export type AgentServer = {id: string; address: string; label: string; addedAt?: string; ask?: string[]} & Record<string, unknown>;
export const ownAgentSchema = z.looseObject({
  address: loopback,
  model: plain(MAX_MODEL).optional().catch(undefined),
  checkedAt: iso.optional().catch(undefined),
  /** The person confirmed, for this address, that their agent answers with a model on this computer. */
  localConfirmed: z.boolean().optional().catch(undefined),
});
export type OwnAgent = {address: string; model?: string; checkedAt?: string; localConfirmed?: boolean} & Record<string, unknown>;
/** Every server this build can read, in order, one per id and per address, at most `MAX_SERVERS`. */
const serversSchema = z.array(z.unknown()).transform(list => {
  const out: AgentServer[] = [], ids = new Set<string>(), urls = new Set<string>();
  for (const item of list) {
    const read = agentServerSchema.safeParse(item); if (!read.success) continue;
    const at = parseLoopback(read.data.address); if (!at.ok || ids.has(read.data.id) || urls.has(at.url)) continue;
    ids.add(read.data.id); urls.add(at.url); out.push(read.data as AgentServer);
    if (out.length >= MAX_SERVERS) break;
  }
  return out;
});
export const novaAgentSchema = z.looseObject({version: z.literal(1), servers: serversSchema.optional(), agent: ownAgentSchema.optional().catch(undefined)});
export type NovaAgentRecord = {version: 1; servers?: AgentServer[]; agent?: OwnAgent} & Record<string, unknown>;
export const emptyAgentRecord = (): NovaAgentRecord => ({version: 1});
export const NOVA_AGENT: DeviceRecordSpec<NovaAgentRecord> = {key: NOVA_AGENT_KEY, schema: novaAgentSchema as unknown as z.ZodType<NovaAgentRecord>, empty: emptyAgentRecord};
/**
 * What a restore or a backup may bring to a device: the addresses and their labels. Never a switch: every tool comes back
 * Off, and the agent comes back unconfirmed and unchecked (a confirmation is given on a device, for that device).
 */
export const novaAgentRestoreSchema = novaAgentSchema.transform((r): NovaAgentRecord => {
  const next = {...r} as NovaAgentRecord;
  if (next.servers) next.servers = next.servers.map(s => { const kept = {...s}; delete kept.ask; return kept; });
  if (next.agent) { const kept = {...next.agent}; delete kept.localConfirmed; delete kept.checkedAt; next.agent = kept; }
  return next;
});
export const NOVA_AGENT_RESTORE: DeviceRecordSpec<NovaAgentRecord> = {key: NOVA_AGENT_KEY, schema: novaAgentRestoreSchema as unknown as z.ZodType<NovaAgentRecord>, empty: emptyAgentRecord};

// ---- Reading ----
export const serversOf = (r: NovaAgentRecord): readonly AgentServer[] => r.servers ?? [];
export const serverById = (r: NovaAgentRecord, id: string): AgentServer | null => serversOf(r).find(s => s.id === id) ?? null;
/** Whether a tool is on "Ask every time" (anything else is Off). */
export const toolAsks = (server: Pick<AgentServer, 'ask'>, tool: string): boolean => (server.ask ?? []).includes(tool);
export const askCount = (r: NovaAgentRecord): number => serversOf(r).reduce((n, s) => n + (s.ask?.length ?? 0), 0);
export const ownAgentOf = (r: NovaAgentRecord): OwnAgent | null => r.agent ?? null;
/** The key store slot of a server's token (lib/ai/keys.ts): never part of the record. */
export const tokenSlot = (id: string) => `mcp-${id}` as const;

// ---- Changes (pure; each returns a record the schema accepts, or throws a plain sentence) ----
const parse = (r: NovaAgentRecord): NovaAgentRecord => novaAgentSchema.parse(r) as NovaAgentRecord;
const cleanLabel = (text: string): string => text.replace(new RegExp(UNSAFE.source, 'g'), ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL).trim();
/** A new id from random bytes (the caller's `crypto.getRandomValues`): eight of a–z and 0–9. */
export function serverId(bytes: Uint8Array): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = ''; for (let i = 0; i < 8; i++) out += letters[(bytes[i] ?? 0) % letters.length];
  return out;
}
/**
 * Adds a server with every tool Off. The address must be a loopback address; one already connected (the same address)
 * is returned as it is. Throws when the address is refused or the list is full.
 */
export function addServer(r: NovaAgentRecord, input: {id: string; address: string; label?: string; at: Date}): {record: NovaAgentRecord; server: AgentServer} {
  const at = parseLoopback(input.address);
  if (!at.ok) throw Error(at.message);
  const existing = serversOf(r).find(s => { const a = parseLoopback(s.address); return a.ok && a.url === at.url; });
  if (existing) return {record: r, server: existing};
  if (serversOf(r).length >= MAX_SERVERS) throw Error(`At most ${MAX_SERVERS} tool servers can be connected. Remove one first.`);
  if (!SERVER_ID.test(input.id) || serverById(r, input.id)) throw Error('The server could not be added. Try again.');
  const server: AgentServer = {id: input.id, address: at.url, label: cleanLabel(input.label ?? '') || at.origin.replace(/^http:\/\//, ''), addedAt: input.at.toISOString()};
  return {record: parse({...r, version: 1, servers: [...serversOf(r), server]}), server};
}
export function removeServer(r: NovaAgentRecord, id: string): NovaAgentRecord {
  const servers = serversOf(r).filter(s => s.id !== id), next = {...r};
  if (servers.length) next.servers = servers; else delete next.servers;
  return parse(next);
}
export function renameServer(r: NovaAgentRecord, id: string, label: string): NovaAgentRecord {
  const clean = cleanLabel(label); if (!clean) throw Error('Give the server a name.');
  return parse({...r, servers: serversOf(r).map(s => s.id === id ? {...s, label: clean} : s)});
}
/** One tool's switch: "Ask every time" (`true`) or Off. Only the person's press calls this. */
export function setToolAsk(r: NovaAgentRecord, id: string, tool: string, ask: boolean): NovaAgentRecord {
  if (!toolName.safeParse(tool).success) throw Error('That tool’s name cannot be used.');
  return parse({...r, servers: serversOf(r).map(s => {
    if (s.id !== id) return s;
    const list = (s.ask ?? []).filter(n => n !== tool), next = {...s};
    if (ask) list.push(tool);
    if (list.length) next.ask = list.slice(0, MAX_ASK); else delete next.ask;
    return next;
  })});
}
/** After a fresh listing: a tool the server no longer lists is no longer on "Ask every time" (a new tool of the same name starts Off again). */
export function keepListed(r: NovaAgentRecord, id: string, listed: readonly string[]): NovaAgentRecord {
  const server = serverById(r, id);
  if (!server?.ask?.length || server.ask.every(n => listed.includes(n))) return r;
  return parse({...r, servers: serversOf(r).map(s => { if (s.id !== id) return s; const next = {...s}, kept = (s.ask ?? []).filter(n => listed.includes(n)); if (kept.length) next.ask = kept; else delete next.ask; return next; })});
}
/** Every tool of every server Off. */
export function allOff(r: NovaAgentRecord): NovaAgentRecord {
  return parse({...r, ...(r.servers ? {servers: r.servers.map(s => { const next = {...s}; delete next.ask; return next; })} : {})});
}
/** The person's own agent: a new address starts unconfirmed; the same address keeps its confirmation. */
export function setOwnAgent(r: NovaAgentRecord, input: {address: string; model?: string | null; at?: Date}): NovaAgentRecord {
  const at = parseLoopback(input.address);
  if (!at.ok) throw Error(at.message);
  const before = ownAgentOf(r), base = baseOf(at), same = !!before && (() => { const b = parseLoopback(before.address); return b.ok && baseOf(b) === base; })();
  const model = input.model ? input.model.replace(new RegExp(UNSAFE.source, 'g'), ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_MODEL) : '';
  return parse({...r, version: 1, agent: {address: base, ...(model ? {model} : {}), ...(input.at ? {checkedAt: input.at.toISOString()} : {}), ...(same && before!.localConfirmed ? {localConfirmed: true} : {})}});
}
export function confirmOwnAgentLocal(r: NovaAgentRecord, confirmed: boolean): NovaAgentRecord {
  if (!r.agent) return r;
  const agent = {...r.agent}; if (confirmed) agent.localConfirmed = true; else delete agent.localConfirmed;
  return parse({...r, agent});
}
export function clearOwnAgent(r: NovaAgentRecord): NovaAgentRecord { const next = {...r}; delete next.agent; return parse(next); }
