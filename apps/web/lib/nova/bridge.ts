import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from '../device-record';
import {askZigi as askZigiPanel} from '../../components/ai/ask';
import {chatAreas} from '../ai/history';
import {MAX_CHATS, MAX_INPUT_CHARS} from '../ai/chats';
import {PAGE_AREAS, type PageArea} from '../ai/settings';

/**
 * NOVA and ZIGi, one engine (Session AK, owner follow-up 2 N1, ADR-036 Q28). NOVA's conversations ARE ZIGi's (one chat
 * store, lib/ai/chats.ts), so one list holds both. What the strict chat records cannot say lives here, in a small device
 * record of its own, `zigoals:nova-bridge:v1`, so every older build still reads every chat:
 * - `origins`: the chats started in NOVA (chat id → when), the newest 200 (the chat store's own cap). A chat that is not
 *   here started with ZIGi, on the page ZIGi's History index names (lib/ai/history.ts `chatAreas`), or on an unknown one.
 * - `delegated`: the turns of a task NOVA handed to ZIGi (turn id → its chat, the page, and whether it is the task or
 *   ZIGi's reply), the newest 400, so NOVA shows that exchange in two voices.
 * - `speechInput`: talking to NOVA with the browser's speech recognition, off until the person turns it on (some browsers
 *   send the audio to their vendor; the setup's voice step and NOVA's composer say which).
 * Every field is optional; an unreadable record reads as empty and is never rewritten by a read. Device-only: nothing
 * here leaves the device, and it holds no message text.
 *
 * The hand-offs (module memory for one tab, like components/ai/ask.ts): "Continue in NOVA" from ZIGi's chat, a message
 * from the ⌘/Ctrl+J command bar, and a page task handed to ZIGi wait here for NOVA's chat to take them (30 seconds, once).
 */
export const NOVA_BRIDGE_KEY = 'zigoals:nova-bridge:v1';
export const MAX_NOVA_ORIGINS = MAX_CHATS, MAX_DELEGATED_TURNS = 400;
const id = z.string().min(1).max(80);
const atMost = (n: number) => (r: Record<string, unknown>) => Object.keys(r).length <= n;
/** `agent` (owner follow-up 3 N11): who took the task, ZIGi (absent) or the person's own Hermes Agent. */
export const NOVA_AGENTS = ['zigi', 'hermes'] as const;
export type NovaAgentId = (typeof NOVA_AGENTS)[number];
export const delegatedTurnSchema = z.looseObject({chat: id, area: z.enum(PAGE_AREAS), role: z.enum(['task', 'reply']), agent: z.enum(NOVA_AGENTS).optional()});
export const novaBridgeSchema = z.looseObject({
  version: z.literal(1),
  origins: z.record(id, z.iso.datetime()).refine(atMost(MAX_NOVA_ORIGINS)).optional(),
  delegated: z.record(id, delegatedTurnSchema).refine(atMost(MAX_DELEGATED_TURNS)).optional(),
  speechInput: z.boolean().optional(),
});
export type NovaBridge = z.infer<typeof novaBridgeSchema>;
export type DelegatedTurn = z.infer<typeof delegatedTurnSchema>;
export const NOVA_BRIDGE: DeviceRecordSpec<NovaBridge> = {key: NOVA_BRIDGE_KEY, schema: novaBridgeSchema, empty: () => ({version: 1})};
type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;

/** Where a conversation started: in NOVA, or with ZIGi on a page (null: a chat from before the page index, or Settings). */
export type ChatOrigin = {by: 'nova'} | {by: 'zigi'; area: PageArea | null};
/** Keeps only the newest `max` entries (insertion order is age: a renewed entry moves to the end). */
function newest<T>(record: Record<string, T>, max: number): Record<string, T> {
  const ids = Object.keys(record);
  if (ids.length <= max) return record;
  const next = {...record};
  for (const old of ids.slice(0, ids.length - max)) delete next[old];
  return next;
}
export function chatOrigin(storage: Read, chatId: string): ChatOrigin {
  const record = readDeviceRecord(storage, NOVA_BRIDGE).data;
  if (record.origins?.[chatId]) return {by: 'nova'};
  let areas: Record<string, PageArea> = {};
  try { areas = chatAreas(storage); } catch { areas = {}; }
  return {by: 'zigi', area: areas[chatId] ?? null};
}
/** Every known origin at once, for a conversation list (one read of each record). */
export function chatOrigins(storage: Read, chatIds: readonly string[]): Record<string, ChatOrigin> {
  const nova = readDeviceRecord(storage, NOVA_BRIDGE).data.origins ?? {};
  let areas: Record<string, PageArea> = {};
  try { areas = chatAreas(storage); } catch { areas = {}; }
  return Object.fromEntries(chatIds.map(chatId => [chatId, nova[chatId] ? {by: 'nova'} : {by: 'zigi', area: areas[chatId] ?? null}] as const));
}
/** NOVA's chat started this conversation (written when its first message is asked; the chat record is untouched). */
export function rememberNovaChat(storage: ReadWrite, chatId: string, now = new Date()): void {
  if (readDeviceRecord(storage, NOVA_BRIDGE).data.origins?.[chatId]) return;
  updateDeviceRecord(storage, NOVA_BRIDGE, current => ({...current, origins: newest({...(current.origins ?? {}), [chatId]: now.toISOString()}, MAX_NOVA_ORIGINS)}));
}
/**
 * Session AK lane EXF (EX-18): the newest conversation started in NOVA (by its start time; on a tie, the later entry), or
 * null. NOVA's empty chat offers to continue it after a reload, instead of leaving it only under Conversations.
 */
export function latestNovaChat(record: NovaBridge): string | null {
  let best: string | null = null, at = -Infinity;
  for (const [chatId, when] of Object.entries(record.origins ?? {})) { const t = Date.parse(when); if (Number.isFinite(t) && t >= at) { best = chatId; at = t; } }
  return best;
}
/** The turns of one task NOVA handed to ZIGi: the task as asked, and ZIGi's reply (or replies). */
export function markDelegated(storage: ReadWrite, chatId: string, area: PageArea, turns: {task: string | null; replies: readonly string[]}, agent: NovaAgentId = 'zigi'): void {
  const add: Record<string, DelegatedTurn> = {}, who = agent === 'zigi' ? {} : {agent};
  if (turns.task) add[turns.task] = {chat: chatId, area, role: 'task', ...who};
  for (const reply of turns.replies) add[reply] = {chat: chatId, area, role: 'reply', ...who};
  if (!Object.keys(add).length) return;
  updateDeviceRecord(storage, NOVA_BRIDGE, current => {
    const delegated = {...(current.delegated ?? {})};
    for (const [turn, mark] of Object.entries(add)) { delete delegated[turn]; delegated[turn] = mark; }
    return {...current, delegated: newest(delegated, MAX_DELEGATED_TURNS)};
  });
}
export function delegatedTurns(storage: Read): Readonly<Record<string, DelegatedTurn>> {
  return readDeviceRecord(storage, NOVA_BRIDGE).data.delegated ?? {};
}
/** Deleted chats leave this record too (all of them when `ids` is omitted). */
export function forgetNovaChats(storage: ReadWrite, ids?: readonly string[]): void {
  const current = readDeviceRecord(storage, NOVA_BRIDGE).data;
  const gone = ids ? new Set(ids) : null;
  const origins = Object.fromEntries(Object.entries(current.origins ?? {}).filter(([chatId]) => gone ? !gone.has(chatId) : false));
  const delegated = Object.fromEntries(Object.entries(current.delegated ?? {}).filter(([, mark]) => gone ? !gone.has(mark.chat) : false));
  if (Object.keys(origins).length === Object.keys(current.origins ?? {}).length && Object.keys(delegated).length === Object.keys(current.delegated ?? {}).length) return;
  updateDeviceRecord(storage, NOVA_BRIDGE, record => ({...record, origins, delegated}));
}
export const speechInputOn = (record: NovaBridge): boolean => record.speechInput === true;
/** The setup's voice step and NOVA's composer: speech input on or off (off by default). */
export function setSpeechInput(storage: ReadWrite, on: boolean): void {
  updateDeviceRecord(storage, NOVA_BRIDGE, current => ({...current, speechInput: on}));
}

/** The pages ZIGi works on, and where each one lives. */
export const ZIGI_PAGES = ['today', 'goals', 'habits', 'health', 'wealth'] as const satisfies readonly PageArea[];
export type ZigiPage = (typeof ZIGI_PAGES)[number];
export const ZIGI_PAGE_PATHS: Record<PageArea, string> = {today: '/app', goals: '/app/goals', habits: '/app/habits', health: '/app/health', wealth: '/app/wealth', help: '/app/help'};
export const NOVA_PATH = '/app/nova';
/** The address that opens one conversation in NOVA (the id of a chat on this device; nothing else travels). */
export const NOVA_CHAT_PARAM = 'chat';
const CHAT_ID = /^[A-Za-z0-9_-]{1,80}$/;
export function novaChatHref(chatId: string): string { return `${NOVA_PATH}?${NOVA_CHAT_PARAM}=${encodeURIComponent(chatId)}`; }

export type NovaHandoff = {kind: 'open'; chatId: string} | {kind: 'ask'; text: string; /** Security review Z1A-2: the words came (at least partly) from a paste. */ pasted?: true} | {kind: 'delegate'; text: string; area: PageArea; agent?: NovaAgentId};
/** Fired on `window` when a hand-off waits for NOVA's chat (NOVA's page opens its chat panel on it). */
export const NOVA_HANDOFF_EVENT = 'zigoals:nova-handoff';
export const HANDOFF_MS = 30_000;
let pending: (NovaHandoff & {at: number}) | null = null;
function hand(handoff: NovaHandoff): void {
  pending = {...handoff, at: Date.now()};
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(NOVA_HANDOFF_EVENT, {detail: handoff}));
}
const words = (text: string) => text.trim().slice(0, MAX_INPUT_CHARS);
/** "Continue in NOVA" (ZIGi's chat): the conversation opens in NOVA; returns the address to go to. */
export function continueInNova(chatId: string): string {
  if (!CHAT_ID.test(chatId)) return NOVA_PATH;
  hand({kind: 'open', chatId});
  return novaChatHref(chatId);
}
/** The command bar's message: NOVA asks it as typed once its chat is open (the person pressed Enter; nothing else is sent). */
export function sendToNova(text: string, options: {pasted?: boolean} = {}): boolean {
  const t = words(text); if (!t) return false;
  hand({kind: 'ask', text: t, ...(options.pasted ? {pasted: true as const} : {})}); return true;
}
/**
 * A page task asked from NOVA: ZIGi (or, with `agent: 'hermes'`, the person's own Hermes Agent) answers it in NOVA's chat
 * with that page's records (lib/nova/bridge-pack.ts), under the same privacy mode and scopes.
 */
export function delegate(task: {question: string; area: PageArea; agent?: NovaAgentId}): boolean {
  const t = words(task.question); if (!t || !PAGE_AREAS.includes(task.area) || (task.agent && !NOVA_AGENTS.includes(task.agent))) return false;
  hand({kind: 'delegate', text: t, area: task.area, ...(task.agent && task.agent !== 'zigi' ? {agent: task.agent} : {})}); return true;
}
/** Whether a hand-off waits (NOVA's page opens its chat for it). */
export function novaHandoffPending(now = Date.now()): boolean { return !!pending && now - pending.at <= HANDOFF_MS; }
/** The waiting hand-off, once: the tab's own first, else a chat named in NOVA's address (`?chat=`). */
export function takeNovaHandoff(search = typeof window === 'undefined' ? '' : window.location.search, now = Date.now()): NovaHandoff | null {
  if (pending) { const {at, ...handoff} = pending; pending = null; if (now - at <= HANDOFF_MS) return handoff as NovaHandoff; }
  let chatId: string | null = null;
  try { chatId = new URLSearchParams(search).get(NOVA_CHAT_PARAM); } catch { chatId = null; }
  return chatId && CHAT_ID.test(chatId) ? {kind: 'open', chatId} : null;
}
/** Tests only: forget what waits. */
export function clearNovaHandoff(): void { pending = null; }

/**
 * "Ask ZIGi about this page" (from NOVA): ZIGi opens on that page with NOVA's question in its box, exactly like a page's
 * own "Ask ZIGi about this" (components/ai/ask.ts): nothing is sent before the person presses Send there. `go` navigates
 * (the router's push); the ask goes once the page is the one asked for (the ask also waits 30 seconds for a late panel).
 */
export async function askZigi(question: string, area: PageArea, go: (href: string) => void, {waitMs = 4000, here = () => window.location.pathname}: {waitMs?: number; here?: () => string} = {}): Promise<boolean> {
  const text = words(question); if (!text) return false;
  const path = ZIGI_PAGE_PATHS[area], arrived = () => (here().replace(/\/+$/, '') || '/') === path;
  if (!arrived()) go(path);
  const started = Date.now();
  while (!arrived() && Date.now() - started < waitMs) await new Promise(resolve => setTimeout(resolve, 40));
  // One more frame for the page's own components, then the same ask a page's button sends.
  await new Promise(resolve => setTimeout(resolve, 60));
  askZigiPanel(text);
  return arrived();
}

/**
 * The Duo (NOVA's dashboard): while ZIGi works on a task NOVA handed over, both figures show side by side with the step
 * they are on. Memory only, one tab; NOVA's chat writes it, the Duo view and the orb read it.
 */
export type DuoStep = 'handed' | 'reading' | 'answering' | 'reported' | 'stopped';
export type DuoState = {active: boolean; area: PageArea | null; step: DuoStep | null; task: string; looked: readonly string[]; agent?: NovaAgentId};
export const DUO_IDLE: DuoState = {active: false, area: null, step: null, task: '', looked: []};
let duo: DuoState = DUO_IDLE;
const duoListeners = new Set<() => void>();
export const duoState = (): DuoState => duo;
export function subscribeDuo(listener: () => void): () => void { duoListeners.add(listener); return () => { duoListeners.delete(listener); }; }
export function setDuo(next: DuoState): void { duo = next; for (const listener of [...duoListeners]) listener(); }
