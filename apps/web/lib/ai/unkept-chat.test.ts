// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {useChatSession, type ChatSession, type NovaSurface} from '../../components/ai/use-chat-session';
import type {AiContextState} from '../../components/ai/use-ai-context';
import {ProposalList, UNKEPT_MEMORY} from '../../components/ai/proposal-list';
import type {ProposalRunner} from '../../components/ai/use-proposals';
import {AI_CHATS_DATABASE, indexedDbChatStore} from './chats';
import {dropMemoryKeys, holdKey} from './keys';
import {defaultAiSettings, type AiSettings} from './settings';
import {ZIGI_KEY} from './store/keys';
import {ZIGI_CARDS_KEY} from '../z-device-keys';
import {NOVA_BRIDGE_KEY, rememberNovaChat, forgetNovaChats} from '../nova/bridge';

/**
 * Session AK (G1 #20, "A chat that isn't kept"): once the person presses "Don't keep this chat", nothing of that
 * conversation is written on this device — not the chat store (History, NOVA's Conversations), not History's page index
 * (`zigoals:zigi:v1` chatAreas), not NOVA's bridge record, not a card outcome, not a "Remember this?" note — while the
 * message itself still goes to the person's AI (a MOCK Anthropic wire here). A copy saved before the switch is removed.
 */
const KEY = 'sk-ant-api03-FAKE-AK-UNKEPT-0000';
const sse = (text: string) => ['event: message_start', 'data: {"type":"message_start","message":{"usage":{"input_tokens":5}}}', '',
  'event: content_block_delta', `data: ${JSON.stringify({type: 'content_block_delta', index: 0, delta: {type: 'text_delta', text}})}`, '',
  'event: message_stop', 'data: {"type":"message_stop"}', '', ''].join('\n');
const settings: AiSettings = {...defaultAiSettings(), enabled: true, mode: 'api', provider: 'anthropic', model: 'claude-mock'};
const ctx = {area: 'today', pathname: '/app', attaches: true, consent: {page: true, health: false, reasons: []}, context: {area: 'today', text: 'PAGE: Today', handles: [], included: ['Today'], omitted: [], estimatedTokens: 5},
  preview: null, ready: true, gates: {paused: false, health: false, areas: {}}, toolSources: () => null} as unknown as AiContextState;
let session: ChatSession | null = null, root: Root, calls = 0;
function Zigi() { const current = useChatSession({settings, scope: 'local', context: ctx}); useEffect(() => { session = current; }); return null; }
const surface: NovaSurface = {persona: 'Rey', novaPack: () => null, pack: () => null, remember: chatId => rememberNovaChat(localStorage, chatId), forget: chatId => forgetNovaChats(localStorage, [chatId])};
function Nova() { const current = useChatSession({settings, scope: 'local', context: ctx, nova: surface}); useEffect(() => { session = current; }); return null; }
const settle = async () => { for (let i = 0; i < 20; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
const saved = () => indexedDbChatStore('local').list();
const areas = () => (JSON.parse(localStorage.getItem(ZIGI_KEY) ?? '{}') as {chatAreas?: Record<string, string>}).chatAreas ?? {};
const origins = () => (JSON.parse(localStorage.getItem(NOVA_BRIDGE_KEY) ?? '{}') as {origins?: Record<string, string>}).origins ?? {};
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; calls = 0; session = null;
  vi.stubGlobal('fetch', async () => { calls++; return new Response(new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode(sse('Noted.'))); c.close(); }}), {status: 200, headers: {'content-type': 'text/event-stream'}}); });
  holdKey('local', 'anthropic', KEY);
  localStorage.setItem('zigoals:ai-options:v1', JSON.stringify({version: 1, toolMode: 'attach'}));
  root = createRoot(document.body.appendChild(document.createElement('div')));
});
afterEach(async () => {
  await act(async () => root.unmount()); dropMemoryKeys(); localStorage.clear(); vi.unstubAllGlobals();
  await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(AI_CHATS_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); });
});

test('a chat is kept by default: saved, and its page noted for History (the baseline the switch changes)', async () => {
  await act(async () => { root.render(h(Zigi)); });
  expect(session!.kept).toBe(true);
  await act(async () => { await session!.send('How was my week?'); }); await settle();
  expect(calls).toBeGreaterThan(0);
  expect((await saved()).map(c => c.id)).toEqual([session!.chat.id]);
  expect(areas()[session!.chat.id]).toBe('today');
});

test('"Don\'t keep this chat" before the first message: the AI still answers, and nothing is written anywhere', async () => {
  await act(async () => { root.render(h(Zigi)); });
  await act(async () => { session!.setKept(false); });
  expect(session!.kept).toBe(false);
  await act(async () => { await session!.send('How was my week?'); }); await settle();
  await act(async () => { await session!.send('And the week before?'); }); await settle();
  expect(calls).toBeGreaterThan(0);
  expect(session!.chat.turns.filter(t => t.role === 'assistant').map(t => t.text)).toEqual(['Noted.', 'Noted.']);
  const reply = session!.chat.turns.find(t => t.role === 'assistant')!;
  await act(async () => { session!.setFeedback(reply.id, 'up'); await session!.pin(session!.chat.id, true); }); await settle();
  expect(await saved()).toEqual([]);
  expect(areas()).toEqual({});
  expect(session!.saveNote).toBeNull();
});

test('pressed mid-conversation: the saved copy and its History index entry are removed, and nothing more is written', async () => {
  await act(async () => { root.render(h(Zigi)); });
  await act(async () => { await session!.send('How was my week?'); }); await settle();
  const id = session!.chat.id;
  expect((await saved()).map(c => c.id)).toEqual([id]);
  await act(async () => { session!.setKept(false); }); await settle();
  expect(await saved()).toEqual([]);
  expect(areas()[id]).toBeUndefined();
  await act(async () => { await session!.send('One more thing.'); }); await settle();
  expect(await saved()).toEqual([]);
  expect(session!.chat.turns).toHaveLength(4);
});

test('"Keep this chat" after all saves it as it is now; a new chat or another one opened starts kept again', async () => {
  await act(async () => { root.render(h(Zigi)); });
  await act(async () => { session!.setKept(false); });
  await act(async () => { await session!.send('How was my week?'); }); await settle();
  await act(async () => { session!.setKept(true); }); await settle();
  const kept = await indexedDbChatStore('local').read(session!.chat.id);
  expect(kept?.turns).toHaveLength(2);
  await act(async () => { session!.setKept(false); }); await settle();
  await act(async () => { session!.startNew(); });
  expect(session!.kept).toBe(true);
  expect(session!.chat.turns).toHaveLength(0);
});

test('NOVA: a chat that is not kept leaves no origin in the bridge record; switching mid-way removes the one it had', async () => {
  await act(async () => { root.render(h(Nova)); });
  await act(async () => { session!.setKept(false); });
  await act(async () => { await session!.send('Plan my evening.', {area: 'today'}); }); await settle();
  expect(origins()).toEqual({});
  expect(await saved()).toEqual([]);
  await act(async () => { session!.startNew(); });
  await act(async () => { await session!.send('Plan my morning.', {area: 'today'}); }); await settle();
  const id = session!.chat.id;
  expect(Object.keys(origins())).toEqual([id]);
  await act(async () => { session!.setKept(false); }); await settle();
  expect(origins()).toEqual({});
  expect(await saved()).toEqual([]);
});

test('cards of a chat that is not kept: no "Remember this?" is offered and no card outcome is kept', async () => {
  const memoryPlan = {target: 'memory', card: {kind: 'remember', title: 'Remember this?', lines: ['I train before work'], where: 'ZIGi · What ZIGi knows about me', day: null, estimate: false}, write: (s: unknown) => s};
  const runner = {ready: true, stores: {memory: {version: 1}} as never, plan: () => ({ok: true, plan: memoryPlan}), apply: vi.fn(), applyAll: vi.fn(), undo: vi.fn(), openForm: vi.fn()} as unknown as ProposalRunner;
  const proposals = [{kind: 'remember', text: 'I train before work', category: 'schedule'}] as never;
  await act(async () => { root.render(h(ProposalList, {proposals, rejected: [], handles: [], runner, replyId: 'turn-1', unkept: true})); });
  const list = document.querySelector('[data-testid="ai-proposals"]')!;
  expect(list.textContent).toContain(UNKEPT_MEMORY);
  expect([...list.querySelectorAll('button')].map(b => b.textContent)).not.toContain('Remember');
  await settle();
  expect(localStorage.getItem(ZIGI_CARDS_KEY)).toBeNull();
  expect(runner.apply).not.toHaveBeenCalled();
});
