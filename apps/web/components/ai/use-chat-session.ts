'use client';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {parseReply, type ParsedReply} from '../../lib/ai/actions/parse';
import {streamChat} from '../../lib/ai/chat';
import {newChat, type Chat, type ChatStore, type ChatSummary} from '../../lib/ai/chats';
import {fitToBudget, type Fit} from '../../lib/ai/context/budget';
import {buildSystemPrompt} from '../../lib/ai/context/specialists';
import type {Handle} from '../../lib/ai/context/types';
import {AiError, errorSteps, isAbortLike, mapNetworkError} from '../../lib/ai/errors';
import {readKey} from '../../lib/ai/keys';
import {PROVIDERS} from '../../lib/ai/providers';
import {currentChatStore} from '../../lib/ai/scope';
import {appendTurn, assistantTurn, isFull, messagesFor, regenerateTarget, stopReason, userTurn, type Usage} from '../../lib/ai/session';
import type {AiSettings} from '../../lib/ai/settings';
import {zigiEvents} from '../zigi/events';
import type {AiContextState} from './use-ai-context';
import {examplesReply, localAnswer, type LocalChoice, type LocalReply, type ToolCallRecord} from '../../lib/ai/local-answers/engine';
import {toolEnv} from '../../lib/ai/tools/env';
import {recordsForAi} from '../../lib/ai/local-answers/more';

/**
 * One conversation with the person's own AI (ADR-012, Part 6). The request goes from this browser straight to the
 * provider with the key read for that call only; the reply streams in and is rendered in batches of one animation
 * frame; proposals are parsed after the reply ends. Chats are saved on this device per scope. Errors carry plain
 * words and fix steps, never request headers or bodies.
 */
export type ChatFailure = {kind: AiError['kind'] | 'missing-key' | 'not-connected' | 'full' | 'save'; title: string; steps: string[]};
/** Records sent with a question on top of the page's data ("Ask my AI for more"): the exact text and the reply's handles. */
export type ExtraData = {text: string; handles: readonly Handle[]};
export type Confirmation = {text: string; fit: Fit; budget: number; reuse: boolean; extra?: ExtraData};
export type SendOptions = {withContext?: boolean; confirmed?: boolean; reuse?: boolean; extra?: ExtraData};
/** A local answer's choices or examples, kept in memory for the chips (they are not stored with the chat). */
export type LocalInfo = {reply: LocalReply; question: string};
export type ChatSession = {
  chat: Chat; status: 'idle' | 'pending' | 'streaming'; draft: string; failure: ChatFailure | null; confirmation: Confirmation | null; saveNote: string | null;
  parsed: ReadonlyMap<string, ParsedReply>; handlesFor: (turnId: string) => readonly Handle[];
  send: (text: string, options?: SendOptions) => Promise<void>; stop: () => void; regenerate: () => Promise<void>; dismissFailure: () => void; cancelConfirmation: () => void;
  /** Session V Part 3: a question first meets the local answers; only what is not a lookup goes to the person's AI. */
  ask: (text: string, options?: SendOptions) => Promise<void>; choose: (question: string, choice: LocalChoice) => void;
  askMore: (question: string, calls: readonly ToolCallRecord[], options?: SendOptions) => Promise<void>; moreText: (calls: readonly ToolCallRecord[]) => ExtraData | null; localFor: (turnId: string) => LocalInfo | undefined;
  startNew: () => void; open: (id: string) => Promise<void>; list: () => Promise<ChatSummary[]>; search: (query: string) => Promise<ChatSummary[]>; rename: (id: string, title: string) => Promise<void>; remove: (id: string) => Promise<void>; removeAll: () => Promise<void>;
};
const SAVE_NOTE = 'This chat could not be saved on this device; it stays here until you close it.';
export function useChatSession({settings, scope, context}: {settings: AiSettings; scope: string; context: AiContextState}): ChatSession {
  const store = useMemo<ChatStore>(() => currentChatStore(), [scope]); // eslint-disable-line react-hooks/exhaustive-deps -- the store follows the scope
  const [chat, setChatState] = useState<Chat>(() => newChat(scope, settings.provider, settings.model));
  const chatRef = useRef(chat);
  const setChat = useCallback((next: Chat) => { chatRef.current = next; setChatState(next); }, []);
  const [status, setStatus] = useState<ChatSession['status']>('idle'), [draft, setDraft] = useState(''), [failure, setFailure] = useState<ChatFailure | null>(null), [confirmation, setConfirmation] = useState<Confirmation | null>(null), [saveNote, setSaveNote] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null), handles = useRef(new Map<string, readonly Handle[]>()), frame = useRef(0), pendingText = useRef('');
  const locals = useRef(new Map<string, LocalInfo>()), extras = useRef(new Map<string, ExtraData>());
  // A new scope (account change) starts a fresh, empty conversation; nothing from the previous one is kept in memory.
  useEffect(() => { abort.current?.abort(); handles.current.clear(); setChat(newChat(scope, settings.provider, settings.model)); setFailure(null); setConfirmation(null); setDraft(''); setStatus('idle'); }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps -- only the scope resets the chat
  useEffect(() => () => { abort.current?.abort(); if (frame.current) cancelAnimationFrame(frame.current); }, []);
  const persist = useCallback((next: Chat) => { if (!next.turns.length) return; store.save(next).then(() => setSaveNote(null)).catch(() => setSaveNote(SAVE_NOTE)); }, [store]);
  const parsed = useMemo(() => { const map = new Map<string, ParsedReply>(); for (const turn of chat.turns) if (turn.role === 'assistant') map.set(turn.id, parseReply(turn.text)); return map; }, [chat.turns]);
  const handlesFor = useCallback((turnId: string) => handles.current.get(turnId) ?? context.context?.handles ?? [], [context.context]);
  const finish = useCallback((text: string, usage: Usage | null, stopped: string | undefined, contextHandles: readonly Handle[]) => {
    if (!text && !stopped) return;
    const turn = assistantTurn({text, provider: settings.provider, model: settings.model, usage, stopped});
    handles.current.set(turn.id, contextHandles);
    let next: Chat;
    try { next = appendTurn(chatRef.current, turn); } catch { next = {...chatRef.current, turns: [...chatRef.current.turns.slice(1), turn]}; }
    setChat(next); persist(next);
    zigiEvents.emit(parseReply(text).proposals.length ? 'reply-with-proposals' : 'reply-done');
  }, [persist, setChat, settings.model, settings.provider]);
  const send = useCallback(async (raw: string, options: SendOptions = {}) => {
    const text = raw.trim(); if (!text || abort.current) return;
    if (!settings.enabled || !settings.provider || !settings.model || settings.mode === 'subscription') { setFailure({kind: 'not-connected', title: 'ZIGi is not connected to your AI yet.', steps: ['Connect an API key or a local model in Settings → ZIGi · your AI.']}); return; }
    if (isFull(chatRef.current) && !options.reuse) { setFailure({kind: 'full', title: 'This chat is full.', steps: ['Start a new chat to go on; this one stays in your history.']}); return; }
    const pageText = options.withContext === false ? null : context.context?.text ?? null;
    const provider = PROVIDERS[settings.provider], contextText = [pageText, options.extra?.text].filter(Boolean).join('\n\n') || null;
    const contextHandles = options.extra ? options.extra.handles : options.withContext === false ? [] : context.context?.handles ?? [];
    const providerName = settings.provider === 'local' ? (settings.localServer === 'ollama' ? 'Ollama' : 'your local server') : provider.name;
    const base = {area: context.area, customInstructions: settings.customInstructions, providerName};
    const systemOnly = buildSystemPrompt({...base, context: null}), system = buildSystemPrompt({...base, context: contextText});
    const started = options.reuse ? chatRef.current : appendTurn(chatRef.current, userTurn(text));
    const fit = fitToBudget({system: systemOnly, context: contextText ?? '', turns: messagesFor(started.turns), budgetTokens: settings.contextBudgetTokens});
    if (fit.overBudget && !options.confirmed) { setConfirmation({text, fit, budget: settings.contextBudgetTokens, reuse: !!options.reuse, ...(options.extra ? {extra: options.extra} : {})}); return; }
    setConfirmation(null); setFailure(null);
    const next = {...started, provider: settings.provider, model: settings.model};
    const asked = [...next.turns].reverse().find(t => t.role === 'user');
    if (asked && options.extra) extras.current.set(asked.id, options.extra);
    setChat(next); persist(next);
    let key: string | null = null;
    try { key = await readKey(scope, settings.provider); } catch { key = null; }
    if (key === null && settings.provider !== 'local') { setFailure({kind: 'missing-key', title: 'Your key is not on this device.', steps: ['Enter it again in Settings → ZIGi · your AI. Keys stay on the device where you typed them; they are never synced.']}); return; }
    const controller = new AbortController(); abort.current = controller;
    setStatus('pending'); setDraft(''); pendingText.current = ''; zigiEvents.emit('reply-pending');
    let reply = '', usage: Usage | null = null, reason: string | null = null, first = false;
    const flush = () => { frame.current = 0; setDraft(pendingText.current); };
    try {
      for await (const event of streamChat({provider: settings.provider, localServer: settings.localServer ?? undefined, model: settings.model, system, messages: fit.messages, maxOutputTokens: settings.maxOutputTokens, key, baseUrl: settings.baseUrl ?? undefined, appOrigin: window.location.origin, signal: controller.signal})) {
        if (event.type === 'text') { reply += event.delta; pendingText.current = reply; if (!first) { first = true; setStatus('streaming'); zigiEvents.emit('reply-streaming'); } if (!frame.current) frame.current = requestAnimationFrame(flush); }
        else if (event.type === 'usage') usage = {input: event.input, output: event.output};
        else reason = event.reason;
      }
      finish(reply, usage, stopReason(reason, false), contextHandles);
    } catch (error) {
      if (isAbortLike(error)) { finish(reply, usage, 'Stopped', contextHandles); }
      else {
        const aiError = error instanceof AiError ? error : mapNetworkError(settings.provider, error, {local: settings.provider === 'local', online: navigator.onLine});
        if (reply) finish(reply, usage, `Interrupted: ${aiError.message}`.slice(0, 200), contextHandles);
        const hosted = !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
        setFailure({kind: aiError.kind, title: aiError.message, steps: errorSteps(aiError, {providerName, local: settings.provider === 'local' ? {server: settings.localServer, baseUrl: settings.baseUrl ?? ''} : undefined, hostedPage: hosted, keysUrl: provider.keysUrl})});
        zigiEvents.emit('error');
      }
    } finally {
      abort.current = null; if (frame.current) { cancelAnimationFrame(frame.current); frame.current = 0; }
      setStatus('idle'); setDraft(''); pendingText.current = '';
    }
  }, [context.area, context.context, finish, persist, scope, setChat, settings]);
  const stop = useCallback(() => abort.current?.abort(), []);
  const regenerate = useCallback(async () => {
    if (abort.current) return;
    const target = regenerateTarget(chatRef.current); if (!target) return;
    const asked = target.chat.turns.at(-1), extra = asked ? extras.current.get(asked.id) : undefined;
    setChat(target.chat); persist(target.chat);
    await send(target.question, {reuse: true, ...(extra ? {extra} : {})});
  }, [persist, send, setChat]);
  const connected = settings.enabled && settings.mode !== 'subscription' && !!settings.provider && !!settings.model;
  /** A local answer: the person's question and ZIGi's answer from the records, both marked local (never sent to an AI later). */
  const answerLocally = useCallback((shown: string, question: string, reply: LocalReply) => {
    if (reply.kind === 'none') return;
    const user = {...userTurn(shown), source: 'local' as const};
    const answer = {...assistantTurn({text: reply.text, provider: null, model: null, usage: null}), source: 'local' as const, ...(reply.calls.length ? {tools: reply.calls.slice(0, 16).map(c => ({tool: c.tool, args: c.args, label: c.label.slice(0, 160)}))} : {})};
    let next: Chat;
    try { next = appendTurn(appendTurn(chatRef.current, user), answer); }
    catch { setFailure({kind: 'full', title: 'This chat is full.', steps: ['Start a new chat to go on; this one stays in your history.']}); return; }
    locals.current.set(answer.id, {reply, question});
    setFailure(null); setConfirmation(null); setChat(next); persist(next);
    zigiEvents.emit('reply-done');
  }, [persist, setChat]);
  const localEnv = useCallback(() => { const sources = context.toolSources(); return sources ? toolEnv(sources, context.gates, 'local') : null; }, [context]);
  const ask = useCallback(async (raw: string, options: SendOptions = {}) => {
    const text = raw.trim(); if (!text || abort.current) return;
    const env = localEnv();
    let reply: LocalReply = {kind: 'none'};
    try { if (env) reply = localAnswer(text, env); } catch { reply = {kind: 'none'}; }
    if (reply.kind === 'none' && connected) return send(text, options);
    answerLocally(text, text, reply.kind === 'none' ? examplesReply(env) : reply);
  }, [answerLocally, connected, localEnv, send]);
  const choose = useCallback((question: string, choice: LocalChoice) => {
    const env = localEnv(); if (!env || abort.current) return;
    let reply: LocalReply = {kind: 'none'};
    try { reply = localAnswer(question, env, choice.subject); } catch { reply = {kind: 'none'}; }
    answerLocally(choice.label, question, reply.kind === 'none' ? examplesReply(env) : reply);
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
  const startNew = useCallback(() => { abort.current?.abort(); setChat(newChat(scope, settings.provider, settings.model)); setFailure(null); setConfirmation(null); }, [scope, setChat, settings.model, settings.provider]);
  const open = useCallback(async (id: string) => { const found = await store.read(id); if (found) { abort.current?.abort(); setChat(found); setFailure(null); setConfirmation(null); } }, [setChat, store]);
  const rename = useCallback(async (id: string, title: string) => { await store.rename(id, title); if (chatRef.current.id === id) setChat({...chatRef.current, title: title.trim() || chatRef.current.title}); }, [setChat, store]);
  const remove = useCallback(async (id: string) => { await store.remove(id); if (chatRef.current.id === id) startNew(); }, [startNew, store]);
  const removeAll = useCallback(async () => { await store.removeAll(); startNew(); }, [startNew, store]);
  const list = useCallback(() => store.list(), [store]), search = useCallback((query: string) => store.search(query), [store]);
  const dismissFailure = useCallback(() => setFailure(null), []), cancelConfirmation = useCallback(() => setConfirmation(null), []);
  return {chat, status, draft, failure, confirmation, saveNote, parsed, handlesFor, send, stop, regenerate, dismissFailure, cancelConfirmation, ask, choose, askMore, moreText, localFor, startNew, open, list, search, rename, remove, removeAll};
}
