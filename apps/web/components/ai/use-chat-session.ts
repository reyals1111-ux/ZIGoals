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

/**
 * One conversation with the person's own AI (ADR-012, Part 6). The request goes from this browser straight to the
 * provider with the key read for that call only; the reply streams in and is rendered in batches of one animation
 * frame; proposals are parsed after the reply ends. Chats are saved on this device per scope. Errors carry plain
 * words and fix steps, never request headers or bodies.
 */
export type ChatFailure = {kind: AiError['kind'] | 'missing-key' | 'not-connected' | 'full' | 'save'; title: string; steps: string[]};
export type Confirmation = {text: string; fit: Fit; budget: number; reuse: boolean};
export type SendOptions = {withContext?: boolean; confirmed?: boolean; reuse?: boolean};
export type ChatSession = {
  chat: Chat; status: 'idle' | 'pending' | 'streaming'; draft: string; failure: ChatFailure | null; confirmation: Confirmation | null; saveNote: string | null;
  parsed: ReadonlyMap<string, ParsedReply>; handlesFor: (turnId: string) => readonly Handle[];
  send: (text: string, options?: SendOptions) => Promise<void>; stop: () => void; regenerate: () => Promise<void>; dismissFailure: () => void; cancelConfirmation: () => void;
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
    const provider = PROVIDERS[settings.provider], contextText = options.withContext === false ? null : context.context?.text ?? null, contextHandles = options.withContext === false ? [] : context.context?.handles ?? [];
    const providerName = settings.provider === 'local' ? (settings.localServer === 'ollama' ? 'Ollama' : 'your local server') : provider.name;
    const base = {area: context.area, customInstructions: settings.customInstructions, providerName};
    const systemOnly = buildSystemPrompt({...base, context: null}), system = buildSystemPrompt({...base, context: contextText});
    const started = options.reuse ? chatRef.current : appendTurn(chatRef.current, userTurn(text));
    const fit = fitToBudget({system: systemOnly, context: contextText ?? '', turns: messagesFor(started.turns), budgetTokens: settings.contextBudgetTokens});
    if (fit.overBudget && !options.confirmed) { setConfirmation({text, fit, budget: settings.contextBudgetTokens, reuse: !!options.reuse}); return; }
    setConfirmation(null); setFailure(null);
    const next = {...started, provider: settings.provider, model: settings.model};
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
    setChat(target.chat); persist(target.chat);
    await send(target.question, {reuse: true});
  }, [persist, send, setChat]);
  const startNew = useCallback(() => { abort.current?.abort(); setChat(newChat(scope, settings.provider, settings.model)); setFailure(null); setConfirmation(null); }, [scope, setChat, settings.model, settings.provider]);
  const open = useCallback(async (id: string) => { const found = await store.read(id); if (found) { abort.current?.abort(); setChat(found); setFailure(null); setConfirmation(null); } }, [setChat, store]);
  const rename = useCallback(async (id: string, title: string) => { await store.rename(id, title); if (chatRef.current.id === id) setChat({...chatRef.current, title: title.trim() || chatRef.current.title}); }, [setChat, store]);
  const remove = useCallback(async (id: string) => { await store.remove(id); if (chatRef.current.id === id) startNew(); }, [startNew, store]);
  const removeAll = useCallback(async () => { await store.removeAll(); startNew(); }, [startNew, store]);
  const list = useCallback(() => store.list(), [store]), search = useCallback((query: string) => store.search(query), [store]);
  const dismissFailure = useCallback(() => setFailure(null), []), cancelConfirmation = useCallback(() => setConfirmation(null), []);
  return {chat, status, draft, failure, confirmation, saveNote, parsed, handlesFor, send, stop, regenerate, dismissFailure, cancelConfirmation, startNew, open, list, search, rename, remove, removeAll};
}
