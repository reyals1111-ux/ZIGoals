'use client';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {hasOpenFence, parseReply, type ParsedReply} from '../../lib/ai/actions/parse';
import {streamChat} from '../../lib/ai/chat';
import {nextFrame} from '../../lib/ai/chat-window';
import {newChat, type Chat, type ChatStore, type ChatSummary} from '../../lib/ai/chats';
import {fitToBudget, type Fit} from '../../lib/ai/context/budget';
import {buildSystemParts, buildSystemPrompt} from '../../lib/ai/context/specialists';
import type {Handle} from '../../lib/ai/context/types';
import {AiError, errorSteps, isAbortLike, mapNetworkError} from '../../lib/ai/errors';
import {readKey} from '../../lib/ai/keys';
import {PROVIDERS} from '../../lib/ai/providers';
import {currentChatStore} from '../../lib/ai/scope';
import {appendTurn, assistantTurn, editTarget, isFull, messagesFor, regenerateTarget, stopReason, userTurn, type Usage} from '../../lib/ai/session';
import type {AiSettings} from '../../lib/ai/settings';
import {zigiSignals} from '../zigi/bus';
import {fenceStructured, needsRepair, REPAIR_NOTE, repairPrompt, structuredFormat} from '../../lib/ai/actions/repair';
import {detectIntent, refusedBlocksMayRepair, wantsCard} from '../../lib/ai/intent';
import {localSignal} from '../../lib/ai/zigi-reactions';
import {extractHint} from '../../lib/ai/emotion-hint';
import type {AiContextState} from './use-ai-context';
import {examplesReply, localAnswer, type LocalChoice, type LocalReply, type ToolCallRecord} from '../../lib/ai/local-answers/engine';
import {toolEnv} from '../../lib/ai/tools/env';
import {runTool} from '../../lib/ai/tools/registry';
import {recordsForAi} from '../../lib/ai/local-answers/more';
import {dataMode, fallbackKey, isToolRejection, readCapability, type Capability, type DataMode} from '../../lib/ai/capabilities';
import {Handles} from '../../lib/ai/handles';
import {readDeviceRecord} from '../../lib/device-record';
import {AI_OPTIONS, type AiOptions} from '../../lib/ai/store/records';
import {AI_USAGE_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {runWithTools, toolsFor} from '../../lib/ai/tool-loop';
import {ANSWER_CHARS, type ToolResult} from '../../lib/ai/tools/types';
import {capNote, capState, monthKey, needsSpendConfirmation, readUsage, recordUsage} from '../../lib/ai/usage';
import {getAppStorage} from '../../lib/showcase-storage';
import {LOG_MODE_NOTE} from '../../lib/ai/context/specialists';
import {PHOTO_NOTE} from '../../lib/ai/photo';
import type {ChatImage, ChatRequest} from '../../lib/ai/types';
import {rememberChatArea} from '../../lib/ai/history';
import {PLAN_NOTE} from '../../lib/ai/slash';
import {carefulNote, detectRisk} from '../../lib/ai/safety';
import {localDate} from '../../lib/local-date';
import {applyDayCue} from '../../lib/ai/actions/day-cue';
import {reviseEdits} from '../../lib/ai/actions/revise';
import {stripDeclinedBlocks} from '../../lib/ai/actions/decline';
import {languageModel, onDeviceAvailability, onDeviceSession} from '../../lib/ai/on-device';
import {streamHosted} from '../../lib/ai/hosted';
import type {HostedState} from './use-hosted';
import {getAccountScope} from '../../lib/account-session';
import {ON_DEVICE_FAILED, ON_DEVICE_NOT_READY, onDevicePrompts, parseRewrite, readAs, shortReply} from '../../lib/ai/on-device-chat';
import {staleHandles} from '../../lib/ai/handles';

/**
 * One conversation with the person's own AI (ADR-012, Part 6). The request goes from this browser straight to the
 * provider with the key read for that call only; the reply streams in and is rendered in batches of one animation
 * frame; proposals are parsed after the reply ends. Chats are saved on this device per scope. Errors carry plain
 * words and fix steps, never request headers or bodies.
 */
export type ChatFailure = {kind: AiError['kind'] | 'missing-key' | 'not-connected' | 'full' | 'save'; title: string; steps: string[]};
/** Records sent with a question on top of the page's data ("Ask my AI for more"): the exact text and the reply's handles. */
export type ExtraData = {text: string; handles: readonly Handle[];
  /** Whether the Health gate was open when these records were chosen (set by `send`); a resend drops them once it closed (Session Y Part 4, F4). */
  health?: boolean};
export type Confirmation = {text: string; fit: Fit; budget: number; reuse: boolean; extra?: ExtraData; deep?: boolean; images?: readonly ChatImage[]; log?: boolean;
  /** Session V Part 10: every option of the message, so "Send anyway" sends it exactly as asked. */
  options: SendOptions};
/**
 * `deep` (Session V Part 6, "Think deeper"): the provider's deep model and twice the data cap. `spendConfirmed`: the
 * person chose to send although their monthly cap is reached ("ask first").
 */
export type SendOptions = {withContext?: boolean; confirmed?: boolean; reuse?: boolean; extra?: ExtraData; deep?: boolean; spendConfirmed?: boolean;
  /** Session V Part 7: a meal photo for this message only (never stored), and "talk to log" (proposals, no advice). */
  images?: readonly ChatImage[]; log?: boolean;
  /**
   * Session V Part 10: /ask skips ZIGi's on-device answer for this message; /plan asks the person's AI for plan cards;
   * `replace` is the person's last question being edited (it and its answers make way once the new words are asked).
   */
  direct?: boolean; plan?: boolean; replace?: string};
/** One lookup the person's AI asked for in a reply: the exact text sent back, kept in memory for this session only. */
export type Lookup = {label: string; args: Record<string, unknown> | null; result: ToolResult; text: string};
/** A chip's words: the lookup, and whether it was refused (a closed area or the Health gate) or could not be answered. */
const lookupLabel = (result: ToolResult) => result.ok ? result.label : `${result.label} (${result.reason === 'gate' || result.reason === 'area' ? 'not shared' : 'not answered'})`;
/** A lookup as the chat keeps it: arguments only when they are small and plain (the chat record's own limits). */
const storedArgs = (args: Record<string, unknown> | null) => args && JSON.stringify(args).length <= 2000 && Object.keys(args).every(k => k.length <= 60) ? {args} : {};
/** Before sending past the monthly cap, when the person chose "ask first". */
export type SpendCheck = {text: string; note: string; options: SendOptions};
/** The answer cap with "Think deeper": twice the usual data per answer. */
export const DEEP_ANSWER_CHARS = ANSWER_CHARS * 2;
/** A local answer's choices or examples, kept in memory for the chips (they are not stored with the chat). */
export type LocalInfo = {reply: LocalReply; question: string;
  /** Session V Part 10: the records the answer used, made at answer time for its chart; in memory for this session only. */
  results?: readonly ToolResult[]};
export type ChatSession = {
  chat: Chat; status: 'idle' | 'pending' | 'streaming'; draft: string; failure: ChatFailure | null; confirmation: Confirmation | null; saveNote: string | null;
  parsed: ReadonlyMap<string, ParsedReply>; handlesFor: (turnId: string) => readonly Handle[];
  /** Session Y Part 4 (SECURITY_REVIEW_Y F1): true once for a reply that arrived in this session; its cards may be auto-added then, never again. */
  claimFresh: (turnId: string) => boolean;
  send: (text: string, options?: SendOptions) => Promise<void>; stop: () => void; regenerate: () => Promise<void>; dismissFailure: () => void; cancelConfirmation: () => void;
  /** Session V Part 3: a question first meets the local answers; only what is not a lookup goes to the person's AI. */
  ask: (text: string, options?: SendOptions) => Promise<void>; choose: (question: string, choice: LocalChoice) => void;
  askMore: (question: string, calls: readonly ToolCallRecord[], options?: SendOptions) => Promise<void>; moreText: (calls: readonly ToolCallRecord[]) => ExtraData | null; localFor: (turnId: string) => LocalInfo | undefined;
  startNew: () => void; open: (id: string) => Promise<void>; list: () => Promise<ChatSummary[]>; search: (query: string) => Promise<ChatSummary[]>; rename: (id: string, title: string) => Promise<void>; remove: (id: string) => Promise<void>; removeAll: () => Promise<void>;
  /** Session V Part 6: what the person's AI looked at while answering (live), the exact results per reply (this session), the mode used. */
  looking: readonly string[]; lookupsFor: (turnId: string) => readonly Lookup[] | undefined; lastMode: {mode: DataMode; fellBack: boolean} | null;
  thinkDeeper: () => Promise<void>; spendCheck: SpendCheck | null; confirmSpend: () => void; cancelSpend: () => void; usageNote: string | null;
  toolState: (model: string | null) => {capability: Capability | null; fellBack: boolean};
  /** Session V Part 10: a chat pinned in History (a version 2 record), and the person's own note on an answer (device only, never sent). */
  pin: (id: string, pinned: boolean) => Promise<void>; setFeedback: (turnId: string, value: 'up' | 'down' | undefined) => void; say: (shown: string, text: string) => void;
};
const SAVE_NOTE = 'This chat could not be saved on this device; it stays here until you close it.';
/** A local answer's records once more, under the same gate, for its chart (Session V Part 10; nothing is stored). */
/** Session V Part 15: the person turned on Chrome's on-device model, and this browser has it. */
function onDeviceOn(): boolean {
  try { return readDeviceRecord(getAppStorage(), AI_OPTIONS).data.onDevice === true && languageModel() !== null; } catch { return false; }
}
function resultsFor(reply: LocalReply, env: ReturnType<typeof toolEnv> | null): ToolResult[] | undefined {
  if (reply.kind !== 'answer' || !env || !reply.calls.length) return undefined;
  try { return reply.calls.slice(0, 4).map(c => runTool(c.tool, c.args, env)); } catch { return undefined; }
}
/**
 * Session V Part 17: `hosted`, when ZIGoals hosted is in use (chosen, agreed to and entitled), answers through /api/zigi
 * instead of the person's own provider; its turns are marked hosted and its usage counts under "hosted".
 */
export function useChatSession({settings, scope, context, hosted = null}: {settings: AiSettings; scope: string; context: AiContextState; hosted?: HostedState['active']}): ChatSession {
  const store = useMemo<ChatStore>(() => currentChatStore(), [scope]); // eslint-disable-line react-hooks/exhaustive-deps -- the store follows the scope
  const [chat, setChatState] = useState<Chat>(() => newChat(scope, settings.provider, settings.model));
  const chatRef = useRef(chat);
  const setChat = useCallback((next: Chat) => { chatRef.current = next; setChatState(next); }, []);
  const [status, setStatus] = useState<ChatSession['status']>('idle'), [draft, setDraft] = useState(''), [failure, setFailure] = useState<ChatFailure | null>(null), [confirmation, setConfirmation] = useState<Confirmation | null>(null), [saveNote, setSaveNote] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null), handles = useRef(new Map<string, readonly Handle[]>()), frame = useRef<(() => void) | null>(null), pendingText = useRef('');
  const fresh = useRef(new Set<string>()), locals = useRef(new Map<string, LocalInfo>()), extras = useRef(new Map<string, ExtraData>()), photos = useRef(new Map<string, readonly ChatImage[]>());
  // Session V Part 6, all in memory for this session: provider metadata per model, models that refused tools, the exact
  // tool results of each reply, and the latest context (a private screen opening mid-answer stops the lookups).
  const capabilities = useRef(new Map<string, Promise<Capability>>()), known = useRef(new Map<string, Capability>()), fellBack = useRef(new Set<string>()), lookups = useRef(new Map<string, Lookup[]>());
  const contextRef = useRef(context), noted = useRef<string | null>(null);
  useEffect(() => { contextRef.current = context; }, [context]);
  const [looking, setLooking] = useState<readonly string[]>([]), [lastMode, setLastMode] = useState<ChatSession['lastMode']>(null), [spendCheck, setSpendCheck] = useState<SpendCheck | null>(null), [usageNote, setUsageNote] = useState<string | null>(null);
  // A new scope (account change) starts a fresh, empty conversation; nothing from the previous one is kept in memory.
  useEffect(() => { abort.current?.abort(); handles.current.clear(); fresh.current.clear(); setChat(newChat(scope, settings.provider, settings.model)); setFailure(null); setConfirmation(null); setDraft(''); setStatus('idle'); }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps -- only the scope resets the chat
  useEffect(() => () => { abort.current?.abort(); frame.current?.(); }, []);
  const persist = useCallback((next: Chat) => { if (!next.turns.length) return; store.save(next).then(() => setSaveNote(null)).catch(() => setSaveNote(SAVE_NOTE)); }, [store]);
  const parsed = useMemo(() => { const map = new Map<string, ParsedReply>(); for (const turn of chat.turns) if (turn.role === 'assistant') map.set(turn.id, parseReply(turn.text)); return map; }, [chat.turns]);
  // A reply's handles (h1, h2…) name the records of the page it was asked on, kept in memory for this session. A turn from
  // before a reload or from History has none: its cards may still name a record by its title on this page, never by a
  // handle, which could now mean another record (SECURITY_REVIEW_Y F1).
  const handlesFor = useCallback((turnId: string) => handles.current.get(turnId) ?? staleHandles(context.context?.handles ?? []), [context.context]);
  const claimFresh = useCallback((turnId: string) => fresh.current.delete(turnId), []);
  const finish = useCallback((text: string, usage: Usage | null, stopped: string | undefined, contextHandles: readonly Handle[], extra: {model?: string; lookups?: Lookup[]; deep?: boolean; careful?: boolean} = {}) => {
    if (!text && !stopped) return;
    // Session X-Local Part 4: the AI's one emotion hint is read and stripped here, before the turn is stored or shown.
    const {text: shown, hint} = extractHint(text);
    text = shown;
    const made = {...assistantTurn({text, provider: hosted ? null : settings.provider, model: extra.model ?? (hosted ? hosted.model : settings.model), usage, stopped}), ...(hosted ? {source: 'hosted' as const} : {})};
    // What the AI looked at (tool, arguments, label; never the results) and "deep" make the chat a version 2 record.
    const turn = {...made, ...(extra.lookups?.length ? {tools: extra.lookups.slice(0, 16).map(l => ({tool: l.result.tool.slice(0, 60) || 'tool', ...storedArgs(l.args), label: l.label.slice(0, 160) || 'Lookup'}))} : {}), ...(extra.deep ? {mode: 'deep'} : {})};
    if (extra.lookups?.length) lookups.current.set(turn.id, extra.lookups);
    handles.current.set(turn.id, contextHandles); fresh.current.add(turn.id);
    let next: Chat;
    try { next = appendTurn(chatRef.current, turn); } catch { next = {...chatRef.current, turns: [...chatRef.current.turns.slice(1), turn]}; }
    setChat(next); persist(next);
    // Session V Part 12: cards to present, else a gentle look after a careful-mode answer, else the insight; Session
    // X-Local Part 4: else the AI's hint, when it has one (validated; the controller may still refuse it).
    zigiSignals.emit(parseReply(text).proposals.length ? 'assistant_replied_with_proposals' : extra.careful ? 'careful_topic' : hint ? `hint_${hint}` : 'assistant_replied');
  }, [persist, setChat, settings.model, settings.provider, hosted]);
  /** Provider metadata for one model, read once per session by the person's own message (never stored). */
  const capabilityFor = useCallback((key: string | null, model: string, signal: AbortSignal): Promise<Capability> => {
    const id = fallbackKey(settings.provider!, model), cached = capabilities.current.get(id);
    if (cached) return cached;
    // A read cut short by Stop is not remembered; any other answer (unknown included) is, for this session.
    const read = readCapability({provider: settings.provider!, model, key, baseUrl: settings.baseUrl, localServer: settings.localServer, signal}).then(found => { known.current.set(id, found); return found; }, () => { capabilities.current.delete(id); return {tools: null, vision: null}; });
    capabilities.current.set(id, read);
    return read;
  }, [settings.baseUrl, settings.localServer, settings.provider]);
  /** The page a chat started on, for History's filter (Session V Part 10); never on Settings, which attaches nothing. */
  const rememberArea = useCallback((chatId: string) => { if (!context.attaches) return; try { rememberChatArea(getAppStorage(), chatId, context.area); } catch { /* History's filter is a convenience */ } }, [context.area, context.attaches]);
  const send = useCallback(async (raw: string, options: SendOptions = {}) => {
    const text = raw.trim(); if (!text || abort.current) return;
    // Session Y Part 4 (SECURITY_REVIEW_Y F4): a resend (Regenerate, Think deeper, "Send anyway", the monthly cap's confirm)
    // replays what the first send carried. It meets the gates of this moment: with Health no longer shared, a meal photo
    // and records chosen while Health was shared stay on the device.
    const healthNow = context.gates.health;
    if (options.extra && options.extra.health === undefined) options = {...options, extra: {...options.extra, health: healthNow}};
    if (!healthNow && (options.images?.length || options.extra?.health)) { const {images, extra, ...rest} = options; void images; options = {...rest, ...(extra && !extra.health ? {extra} : {})}; }
    if (!hosted && (!settings.enabled || !settings.provider || !settings.model || settings.mode === 'subscription')) { setFailure({kind: 'not-connected', title: 'ZIGi is not connected to your AI yet.', steps: ['Connect an API key or a local model in Settings → ZIGi · your AI.']}); return; }
    // ZIGoals hosted stands in for the person's provider: the relay chooses the model; the wire is OpenAI's.
    const providerId = hosted ? 'openai' as const : settings.provider!, account = hosted ? getAccountScope() : null;
    const before = !options.reuse && options.replace ? editTarget(chatRef.current, options.replace) ?? chatRef.current : chatRef.current;
    if (isFull(before) && !options.reuse) { setFailure({kind: 'full', title: 'This chat is full.', steps: ['Start a new chat to go on; this one stays in your history.']}); return; }
    let options_: AiOptions = {version: 1};
    try { options_ = readDeviceRecord(getAppStorage(), AI_OPTIONS).data; } catch { /* the defaults */ }
    const deepModel = options.deep && !hosted ? options_.deepModel?.[providerId] ?? null : null, model = hosted ? hosted.model : deepModel ?? settings.model!;
    // "Ask first": past the monthly cap from the person's own prices, ZIGi asks before sending (only when they chose it).
    if (!options.spendConfirmed) {
      let cap = null; try { cap = capState(readUsage(getAppStorage()).data, monthKey(new Date())); } catch { cap = null; }
      if (needsSpendConfirmation(cap)) { setSpendCheck({text, note: capNote(cap) ?? '', options}); return; }
    }
    setSpendCheck(null);
    const pageText = options.withContext === false ? null : context.context?.text ?? null;
    const provider = PROVIDERS[providerId], contextText = [pageText, options.extra?.text].filter(Boolean).join('\n\n') || null;
    const contextHandles = options.extra ? options.extra.handles : options.withContext === false ? [] : context.context?.handles ?? [];
    const providerName = hosted ? `${hosted.provider} via ZIGoals hosted` : settings.provider === 'local' ? (settings.localServer === 'ollama' ? 'Ollama' : 'your local server') : provider.name;
    const base = {area: context.area, customInstructions: settings.customInstructions, providerName, today: localDate()};
    // Session V Part 11: words that touch a sensitive health topic put this one message in careful mode.
    const risk = detectRisk(text);
    const notes = [options.images?.length ? PHOTO_NOTE : null, options.log ? LOG_MODE_NOTE : null, options.plan ? PLAN_NOTE : null, risk ? carefulNote(risk) : null].filter((n): n is string => !!n);
    const withNotes = (prompt: string) => [prompt, ...notes].join('\n\n');
    // Session Z-Local Part 3 (ADR-020 L3): the prompt is the same string as before, joined from the page's and the question's
    // records exactly as `contextText` was; it also travels as blocks, so the Anthropic wire can cache the stable prefix.
    const partsFor = (tools: boolean) => { const p = buildSystemParts({...base, pageContext: pageText, context: options.extra?.text ?? null, tools}); const notes_ = notes.length ? `\n\n${notes.join('\n\n')}` : ''; return {prompt: withNotes(p.prompt), blocks: p.blocks.map((b, i) => i === p.blocks.length - 1 ? {...b, text: b.text + notes_} : b)}; };
    const systemOnly = buildSystemPrompt({...base, context: null}), attachParts = partsFor(false), toolParts = partsFor(true), system = attachParts.prompt;
    // A photo is kept in memory for this session (a regenerate sends it again); the chat records only that one was attached.
    const asking = options.images?.length ? {...userTurn(text), attachments: [{kind: 'photo' as const}]} : userTurn(text);
    const started = options.reuse ? chatRef.current : appendTurn(before, asking);
    const fit = fitToBudget({system: systemOnly, context: contextText ?? '', turns: messagesFor(started.turns), budgetTokens: settings.contextBudgetTokens});
    if (fit.overBudget && !options.confirmed) { setConfirmation({text, fit, budget: settings.contextBudgetTokens, reuse: !!options.reuse, ...(options.extra ? {extra: options.extra} : {}), ...(options.deep ? {deep: true} : {}), ...(options.images ? {images: options.images} : {}), ...(options.log ? {log: true} : {}), options}); return; }
    setConfirmation(null); setFailure(null);
    const next = {...started, provider: hosted ? null : settings.provider, model: hosted ? hosted.model : settings.model};
    const asked = [...next.turns].reverse().find(t => t.role === 'user');
    if (asked && options.extra) extras.current.set(asked.id, options.extra);
    if (asked && options.images?.length) photos.current.set(asked.id, options.images);
    setChat(next); persist(next);
    if (!options.reuse && !before.turns.length) rememberArea(next.id);
    let key: string | null = null;
    if (!hosted) try { key = await readKey(scope, providerId); } catch { key = null; }
    if (hosted && !account) { setFailure({kind: 'blocked', title: 'Sign in again to use ZIGoals hosted.', steps: ['ZIGoals hosted works with your account; sign in under Settings → Account & sync.']}); return; }
    if (!hosted && key === null && settings.provider !== 'local') { setFailure({kind: 'missing-key', title: 'Your key is not on this device.', steps: ['Enter it again in Settings → ZIGi · your AI. Keys stay on the device where you typed them; they are never synced.']}); return; }
    const controller = new AbortController(); abort.current = controller;
    setStatus('pending'); setDraft(''); setLooking([]); pendingText.current = ''; zigiSignals.emit('assistant_thinking');
    let reply = '', usage: Usage | null = null, reason: string | null = null, first = false, requests = 0, limit: string | null = null, writing = false;
    // Session Z-Local Part 3: the prompt-cache counts go to the usage meter only; the stored turn keeps its two fields.
    let cache: {cacheWrite: number | null; cacheRead: number | null} = {cacheWrite: null, cacheRead: null};
    const found: Lookup[] = [];
    const flush = () => { frame.current = null; setDraft(pendingText.current); };
    // The photo travels with the question it belongs to, the last user message, and nowhere else.
    const lastUser = fit.messages.map(m => m.role).lastIndexOf('user');
    const messages = options.images?.length && lastUser >= 0 ? fit.messages.map((m, i) => i === lastUser && m.role === 'user' ? {...m, images: options.images} : m) : fit.messages;
    // Session X-Local Part 6d: a thinking model thinks only for "Think deeper"; a quick reply spends its cap on the answer.
    const request = {provider: providerId, localServer: settings.localServer ?? undefined, model, system, systemBlocks: attachParts.blocks, messages, maxOutputTokens: settings.maxOutputTokens, key, baseUrl: settings.baseUrl ?? undefined, appOrigin: window.location.origin, signal: controller.signal, think: !!options.deep};
    // Session V Part 6: how this message gets the data. Tools only with the page's data shared for this message, never
    // after this model refused them in this session; the setting first, then the provider's own metadata.
    const toolMode = options_.toolMode ?? 'auto', fbKey = fallbackKey(providerId, hosted ? `hosted:${model}` : model);
    let mode: DataMode = 'attach';
    if (options.withContext !== false && toolMode !== 'attach' && !fellBack.current.has(fbKey)) mode = dataMode(toolMode, toolMode === 'auto' ? hosted ? {tools: true, vision: null} : await capabilityFor(key, model, controller.signal).catch(() => null) : null, false);
    const sources = mode === 'tools' ? context.toolSources() : null, toolHandles = new Handles(contextHandles);
    const env = sources ? toolEnv(sources, context.gates, 'provider', toolHandles) : null;
    if (!env || !toolsFor(env).length) mode = 'attach';
    const onText = (delta: string) => {
      reply += delta; pendingText.current = reply;
      if (!first) { first = true; setStatus('streaming'); zigiSignals.emit('assistant_speaking'); }
      // Session V Part 12: ZIGi writes while a proposal block streams in (the cards show once it is complete).
      if (!writing && hasOpenFence(reply)) { writing = true; zigiSignals.emit('assistant_writing_proposal'); }
      // The chat's own window: the mini window keeps streaming while the tab is in the background (Part 14).
      if (!frame.current) frame.current = nextFrame(flush);
    };
    // A request counts once the provider answers it (a refused one costs nothing and is not counted).
    const counted = async function* (r: Parameters<typeof streamChat>[0]) { let seen = false; for await (const event of hosted && account ? streamHosted(r, account) : streamChat(r)) { if (!seen) { seen = true; requests++; } yield event; } };
    const record = () => {
      if (!requests) return;
      try { recordUsage(getAppStorage(), hosted ? 'hosted' : providerId, {...(usage ?? {input: null, output: null}), ...cache}, requests); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: AI_USAGE_KEY})); } catch { /* the meter is a convenience; the reply stands */ }
      try { const cap = capState(readUsage(getAppStorage()).data, monthKey(new Date())), line = capNote(cap); if (line && noted.current !== `${monthKey(new Date())}:${cap?.level}`) { noted.current = `${monthKey(new Date())}:${cap?.level}`; setUsageNote(line); } } catch { /* no note */ }
    };
    const run = async (current: DataMode, msgs = messages, extra: Partial<Pick<ChatRequest, 'format'>> = {}) => {
      if (current === 'tools' && env) {
        const shouldStop = () => contextRef.current.gates.paused ? 'ZIGi paused its lookups: this screen holds a private form.' : null;
        for await (const event of runWithTools({...request, system: toolParts.prompt, systemBlocks: toolParts.blocks, env, stream: counted, answerChars: options.deep ? DEEP_ANSWER_CHARS : ANSWER_CHARS, shouldStop})) {
          if (event.type === 'text') onText(event.delta);
          else if (event.type === 'usage') { usage = {input: event.input, output: event.output}; cache = {cacheWrite: event.cacheWrite ?? null, cacheRead: event.cacheRead ?? null}; }
          else if (event.type === 'done') reason = event.reason;
          else if (event.type === 'tool-result') { found.push({label: lookupLabel(event.result), args: event.args, result: event.result, text: event.text}); setLooking(found.map(l => l.label)); zigiSignals.emit('assistant_reading_records'); }
          else if (event.type === 'tool-limit') limit = event.reason;
        }
        return;
      }
      for await (const event of counted({...request, ...extra, messages: msgs})) {
        if (event.type === 'text') onText(event.delta);
        else if (event.type === 'usage') { usage = {input: event.input, output: event.output}; cache = {cacheWrite: event.cacheWrite ?? null, cacheRead: event.cacheRead ?? null}; }
        else if (event.type === 'done') reason = event.reason;
      }
    };
    /**
     * Session X-Local Part 5c, one automatic repair round: in log or plan mode, when the reply held proposal blocks and
     * every one was refused, the same model is asked once more for valid blocks (the first answer goes with it as the
     * assistant's turn of the request; neither the ask nor the first answer is stored). The second answer replaces the
     * first under a note; if the retry fails or stops, the first answer stands.
     */
    const repair = async () => {
      if (controller.signal.aborted || !reply) return;
      // Careful mode (a sensitive health topic): the reply is warm and figure-free by the note's own rule; no second ask for cards.
      if (risk) return;
      // Phase 2 (P2.2b): also when a card was asked for (log or plan mode, or a logging or planning intent read on the
      // device) and no block came back at all; on Ollama the retry asks for structured output (the JSON schema).
      // Log or plan mode alone does not force a retry ("thanks" in log mode is a normal reply); the message's own intent does.
      const check = parseReply(reply), intent = detectIntent(text);
      if (!needsRepair(check, {askedForCard: wantsCard(intent, reply), refusedMayRepair: refusedBlocksMayRepair(intent, reply)})) return;
      const firstTry = reply, firstUsage = usage;
      const again = [...messages, {role: 'assistant' as const, content: firstTry}, {role: 'user' as const, content: repairPrompt(check)}];
      reply = ''; pendingText.current = ''; writing = false; setDraft(''); setStatus('pending'); zigiSignals.emit('assistant_thinking');
      const structured = !hosted && settings.provider === 'local' && settings.localServer === 'ollama' ? {format: structuredFormat()} : {};
      try { await run('attach', again, structured); } catch (error) { if (isAbortLike(error)) throw error; reply = ''; }
      if (!reply.trim()) { reply = firstTry; usage = firstUsage; return; }
      reply = `${REPAIR_NOTE}\n\n${fenceStructured(reply)}`; pendingText.current = reply;
    };
    // Round 6 (ADR-017 S69): a log card that says today while the message names yesterday, the day before, or a weekday takes that day.
    // Round 8 (ADR-017 S74): a correction of a card the previous reply only proposed (an edit of a record that does not exist) becomes that card again, corrected.
    // Round 9 (ADR-017 S75): a money ask the reply declines in words carries no card (the protocol's own rule, enforced).
    const previousReply = [...before.turns].reverse().find(t => t.role === 'assistant')?.text ?? null;
    const done = (stopped: string | undefined) => finish(stripDeclinedBlocks(reviseEdits(applyDayCue(reply, text, localDate()), previousReply, mode === 'tools' ? [...toolHandles.list] : contextHandles), text), usage, stopped, mode === 'tools' ? [...toolHandles.list] : contextHandles, {model, lookups: found, deep: !!options.deep, careful: !!risk});
    try {
      try { await run(mode); }
      catch (error) {
        // A provider that does not take the tool fields: the same message again with the records attached, and this
        // model stays on "attach" for the rest of the session.
        if (mode !== 'tools' || controller.signal.aborted || !isToolRejection(error)) throw error;
        fellBack.current.add(fbKey); mode = 'attach'; found.length = 0; reply = ''; first = false; writing = false; pendingText.current = ''; setDraft(''); setLooking([]); setStatus('pending');
        await run('attach');
      }
      setLastMode({mode, fellBack: fellBack.current.has(fbKey)});
      await repair();
      done(limit ?? stopReason(reason, false));
    } catch (error) {
      if (isAbortLike(error)) { done('Stopped'); }
      else {
        const aiError = error instanceof AiError ? error : mapNetworkError(providerId, error, {local: !hosted && settings.provider === 'local', online: navigator.onLine});
        if (reply) done(`Interrupted: ${aiError.message}`.slice(0, 200));
        const hostedPage = !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
        setFailure({kind: aiError.kind, title: aiError.message, steps: hosted ? [] : errorSteps(aiError, {providerName, local: settings.provider === 'local' ? {server: settings.localServer, baseUrl: settings.baseUrl ?? ''} : undefined, hostedPage, keysUrl: provider.keysUrl})});
        zigiSignals.emit('recoverable_error');
      }
    } finally {
      record();
      abort.current = null; frame.current?.(); frame.current = null;
      setStatus('idle'); setDraft(''); setLooking([]); pendingText.current = '';
    }
  }, [capabilityFor, context, finish, persist, rememberArea, scope, setChat, settings, hosted]);
  const stop = useCallback(() => abort.current?.abort(), []);
  const again = useCallback(async (deep: boolean) => {
    if (abort.current) return;
    const target = regenerateTarget(chatRef.current); if (!target) return;
    const asked = target.chat.turns.at(-1), extra = asked ? extras.current.get(asked.id) : undefined, images = asked ? photos.current.get(asked.id) : undefined;
    setChat(target.chat); persist(target.chat);
    await send(target.question, {reuse: true, ...(extra ? {extra} : {}), ...(images ? {images} : {}), ...(deep ? {deep: true} : {})});
  }, [persist, send, setChat]);
  const regenerate = useCallback(() => again(false), [again]);
  /** "Think deeper" (Session V Part 6): the same question again with the provider's deep model and twice the data cap. */
  const thinkDeeper = useCallback(() => again(true), [again]);
  const confirmSpend = useCallback(() => { const check = spendCheck; if (!check) return; setSpendCheck(null); void send(check.text, {...check.options, spendConfirmed: true}); }, [send, spendCheck]);
  const cancelSpend = useCallback(() => setSpendCheck(null), []);
  const lookupsFor = useCallback((turnId: string) => lookups.current.get(turnId), []);
  /** What this session knows about the current model: its published capability and whether it refused tools. */
  const toolState = useCallback((model: string | null) => { if (!settings.provider || !model) return {capability: null, fellBack: false}; const id = fallbackKey(settings.provider, model); return {capability: known.current.get(id) ?? null, fellBack: fellBack.current.has(id)}; }, [settings.provider]);
  const connected = !!hosted || (settings.enabled && settings.mode !== 'subscription' && !!settings.provider && !!settings.model);
  /** A local answer: the person's question and ZIGi's answer from the records, both marked local (never sent to an AI later). */
  const answerLocally = useCallback((shown: string, question: string, reply: LocalReply, {replace, results, source = 'local'}: {replace?: string; results?: readonly ToolResult[]; source?: 'local' | 'on-device'} = {}) => {
    if (reply.kind === 'none') return;
    const before = replace ? editTarget(chatRef.current, replace) ?? chatRef.current : chatRef.current;
    const user = {...userTurn(shown), source};
    const answer = {...assistantTurn({text: reply.text, provider: null, model: null, usage: null}), source, ...(reply.calls.length ? {tools: reply.calls.slice(0, 16).map(c => ({tool: c.tool, args: c.args, label: c.label.slice(0, 160)}))} : {})};
    let next: Chat;
    try { next = appendTurn(appendTurn(before, user), answer); }
    catch { setFailure({kind: 'full', title: 'This chat is full.', steps: ['Start a new chat to go on; this one stays in your history.']}); return; }
    locals.current.set(answer.id, {reply, question, ...(results?.length ? {results} : {})}); fresh.current.add(answer.id);
    setFailure(null); setConfirmation(null); setChat(next); persist(next);
    if (!before.turns.length) rememberArea(next.id);
    zigiSignals.emit(localSignal(reply, question));
  }, [persist, rememberArea, setChat]);
  const localEnv = useCallback(() => { const sources = context.toolSources(); return sources ? toolEnv(sources, context.gates, 'local') : null; }, [context]);
  /**
   * Session V Part 15: a question ZIGi's lookups did not recognise, with no AI connected and Chrome's on-device model
   * turned on. The model first puts the question in plain words for ZIGi's own lookup, whose numbers come from the
   * records; otherwise it answers briefly itself. It gets only the person's own words (lib/ai/on-device-chat.ts), runs
   * inside Chrome on this computer, and Stop ends it. Both turns stay on this device: never sent to a provider later.
   */
  const askOnDevice = useCallback(async (text: string, env: ReturnType<typeof toolEnv> | null, replace?: string) => {
    const controller = new AbortController(), signal = controller.signal, prompts = onDevicePrompts(text);
    abort.current = controller; setFailure(null); setStatus('pending'); zigiSignals.emit('model_loading');
    let failed = ON_DEVICE_FAILED;
    try {
      // A question never starts Chrome's download (it is large): only Settings does, from its own button.
      if (await onDeviceAvailability() !== 'available') { failed = ON_DEVICE_NOT_READY; throw new Error(failed); }
      const sorter = await onDeviceSession({system: prompts.rewrite.system, signal});
      let rewritten: string | null = null;
      try { rewritten = parseRewrite(await sorter.prompt(prompts.rewrite.input, {signal})); } finally { sorter.destroy(); }
      if (rewritten && env) {
        let reply: LocalReply = {kind: 'none'};
        try { reply = localAnswer(rewritten, env); } catch { reply = {kind: 'none'}; }
        if (reply.kind === 'answer' || reply.kind === 'choices' || reply.kind === 'refusal') {
          answerLocally(text, rewritten, {...reply, text: `${readAs(rewritten)}\n\n${reply.text}`}, {replace, results: resultsFor(reply, env), source: 'on-device'});
          return;
        }
      }
      const chat = await onDeviceSession({system: prompts.chat.system, signal});
      let answer = '';
      try { answer = shortReply(await chat.prompt(prompts.chat.input, {signal})); } finally { chat.destroy(); }
      if (!answer) throw new Error('No answer from the on-device model.');
      answerLocally(text, text, {kind: 'answer', text: answer, calls: []}, {replace, source: 'on-device'});
    } catch {
      if (signal.aborted) return;
      const examples = examplesReply(env);
      answerLocally(text, text, examples.kind === 'examples' ? {...examples, text: `${failed} ${examples.text}`} : examples, {replace});
    } finally {
      if (abort.current === controller) abort.current = null;
      setStatus('idle'); zigiSignals.emit('model_ready');
    }
  }, [answerLocally]);
  const ask = useCallback(async (raw: string, options: SendOptions = {}) => {
    const text = raw.trim(); if (!text || abort.current) return;
    if (connected && (options.images?.length || options.log || options.direct || options.plan)) return send(text, options);
    const env = localEnv();
    let reply: LocalReply = {kind: 'none'};
    try { if (env) reply = localAnswer(text, env); } catch { reply = {kind: 'none'}; }
    if (reply.kind === 'none' && connected) return send(text, options);
    if (reply.kind === 'none' && onDeviceOn()) return askOnDevice(text, env, options.replace);
    answerLocally(text, text, reply.kind === 'none' ? examplesReply(env) : reply, {replace: options.replace, results: resultsFor(reply, env)});
  }, [answerLocally, askOnDevice, connected, localEnv, send]);
  const choose = useCallback((question: string, choice: LocalChoice) => {
    const env = localEnv(); if (!env || abort.current) return;
    let reply: LocalReply = {kind: 'none'};
    try { reply = localAnswer(question, env, choice.subject); } catch { reply = {kind: 'none'}; }
    answerLocally(choice.label, question, reply.kind === 'none' ? examplesReply(env) : reply, {results: resultsFor(reply, env)});
  }, [answerLocally, localEnv]);
  /** The records a local answer used, recomputed now for the person's AI (its gate: switches, Health, sensitive screens). */
  const moreText = useCallback((calls: readonly ToolCallRecord[]): ExtraData | null => {
    const sources = context.toolSources();
    return sources ? recordsForAi(calls, sources, context.gates, context.context?.handles ?? []) : null;
  }, [context]);
  const askMore = useCallback(async (question: string, calls: readonly ToolCallRecord[], options: SendOptions = {}) => {
    const extra = moreText(calls);
    await send(question, {...options, ...(extra ? {extra} : {})});
  }, [moreText, send]);
  const localFor = useCallback((turnId: string) => locals.current.get(turnId), []);
  /** Session V Part 10: words ZIGi writes on the device (the /help list, a command that needs an AI), kept as a local turn. */
  const say = useCallback((shown: string, text: string) => answerLocally(shown, shown, {kind: 'answer', text, calls: []}), [answerLocally]);
  const startNew = useCallback(() => { abort.current?.abort(); fresh.current.clear(); setChat(newChat(scope, settings.provider, settings.model)); setFailure(null); setConfirmation(null); setSpendCheck(null); setUsageNote(null); }, [scope, setChat, settings.model, settings.provider]);
  const open = useCallback(async (id: string) => { const found = await store.read(id); if (found) { abort.current?.abort(); fresh.current.clear(); setChat(found); setFailure(null); setConfirmation(null); } }, [setChat, store]);
  const rename = useCallback(async (id: string, title: string) => { await store.rename(id, title); if (chatRef.current.id === id) setChat({...chatRef.current, title: title.trim() || chatRef.current.title}); }, [setChat, store]);
  const remove = useCallback(async (id: string) => { await store.remove(id); if (chatRef.current.id === id) startNew(); }, [startNew, store]);
  const removeAll = useCallback(async () => { await store.removeAll(); startNew(); }, [startNew, store]);
  const list = useCallback(() => store.list(), [store]), search = useCallback((query: string) => store.search(query), [store]);
  const dismissFailure = useCallback(() => setFailure(null), []), cancelConfirmation = useCallback(() => setConfirmation(null), []);
  const pin = useCallback(async (id: string, pinned: boolean) => {
    const pinnedAs = (chat: Chat): Chat => { const next = {...chat}; if (pinned) next.pinned = true; else delete next.pinned; return next; };
    const current = chatRef.current.id === id && chatRef.current.turns.length ? chatRef.current : await store.read(id);
    if (!current) return;
    await store.save(pinnedAs(current));
    if (chatRef.current.id === id) setChat(pinnedAs(chatRef.current));
  }, [setChat, store]);
  const setFeedback = useCallback((turnId: string, value: 'up' | 'down' | undefined) => {
    const turns = chatRef.current.turns.map(t => { if (t.id !== turnId || t.role !== 'assistant') return t; const next = {...t}; if (value) next.feedback = value; else delete next.feedback; return next; });
    const next = {...chatRef.current, turns}; setChat(next); persist(next);
  }, [persist, setChat]);
  return {chat, status, draft, failure, confirmation, saveNote, parsed, handlesFor, claimFresh, send, stop, regenerate, dismissFailure, cancelConfirmation, ask, choose, askMore, moreText, localFor, startNew, open, list, search, rename, remove, removeAll,
    looking, lookupsFor, lastMode, thinkDeeper, spendCheck, confirmSpend, cancelSpend, usageNote, toolState, pin, setFeedback, say};
}
