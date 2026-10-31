// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {useChatSession, type ChatSession} from '../../components/ai/use-chat-session';
import type {AiContextState} from '../../components/ai/use-ai-context';
import {dropMemoryKeys, holdKey} from '../ai/keys';
import {defaultAiSettings, type AiSettings} from '../ai/settings';
import {ZIGI_SECRET_TITLE} from './guard';

/**
 * Session AK (BUILD list 2 #1): a ZIGi message that looks like recovery words or a private key is refused on the device
 * with a plain message, before any network call, and is not kept in the chat. An ordinary message still goes out.
 * (Harness as lib/ai/resend-gate.test.ts.)
 */
const KEY = 'sk-ant-api03-FAKE-AK-GUARD-0000';
const list = readFileSync(join(__dirname, '../../../../scripts/bip39-english.txt'), 'utf8').trim().split('\n');
const phrase = list.slice(300, 312).join(' ');
const calls: string[] = [];
const sse = (text: string) => ['event: message_start', 'data: {"type":"message_start","message":{"usage":{"input_tokens":5}}}', '',
  'event: content_block_delta', `data: ${JSON.stringify({type: 'content_block_delta', index: 0, delta: {type: 'text_delta', text}})}`, '',
  'event: message_stop', 'data: {"type":"message_stop"}', '', ''].join('\n');
const settings: AiSettings = {...defaultAiSettings(), enabled: true, mode: 'api', provider: 'anthropic', model: 'claude-mock'};
const ctx = {area: 'today', pathname: '/app', attaches: true, consent: {page: true, health: false, reasons: []}, context: {area: 'today', text: 'PAGE: Today', handles: [], included: ['Today'], omitted: [], estimatedTokens: 5},
  preview: null, ready: true, gates: {paused: false, health: false, areas: {}}, toolSources: () => null} as unknown as AiContextState;
let session: ChatSession | null = null, root: Root;
function Harness() { const current = useChatSession({settings, scope: 'local', context: ctx}); useEffect(() => { session = current; }); return null; }
const settle = async () => { for (let i = 0; i < 20; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; calls.length = 0;
  vi.stubGlobal('fetch', async (url: RequestInfo | URL, init?: RequestInit) => { calls.push(`${String(url)} ${String(init?.body ?? '')}`); return new Response(new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode(sse('Noted.'))); c.close(); }}), {status: 200, headers: {'content-type': 'text/event-stream'}}); });
  holdKey('local', 'anthropic', KEY);
  localStorage.setItem('zigoals:ai-options:v1', JSON.stringify({version: 1, toolMode: 'attach'}));
  root = createRoot(document.body.appendChild(document.createElement('div')));
});
afterEach(async () => { await act(async () => root.unmount()); dropMemoryKeys(); localStorage.clear(); vi.unstubAllGlobals(); });

test('send: recovery words never reach the provider, and the chat keeps nothing', async () => {
  await act(async () => { root.render(h(Harness)); });
  await act(async () => { await session!.send(`Is this right? ${phrase}`); }); await settle();
  expect(calls).toHaveLength(0);
  expect(session!.failure?.title).toBe(ZIGI_SECRET_TITLE);
  expect(session!.chat.turns).toHaveLength(0);
});
test('ask (the local answers first): refused the same way, nothing answered or kept', async () => {
  await act(async () => { root.render(h(Harness)); });
  await act(async () => { await session!.ask(`private key ${'ab'.repeat(32)}`); }); await settle();
  expect(calls).toHaveLength(0);
  expect(session!.failure?.title).toBe(ZIGI_SECRET_TITLE);
  expect(session!.chat.turns).toHaveLength(0);
});
test('an ordinary message still goes to the provider', async () => {
  await act(async () => { root.render(h(Harness)); });
  await act(async () => { await session!.send('How much did I spend on groceries last month compared with the month before?'); }); await settle();
  expect(calls.length).toBeGreaterThan(0);
  expect(session!.failure).toBeNull();
  for (const call of calls) expect(call).not.toContain(phrase);
});
test('the field line: shown for recovery words with "Remove it", absent for ordinary words', async () => {
  const {default: SecretGuardNote} = await import('../../components/secret-guard/secret-guard-note');
  let removed = 0;
  await act(async () => { root.render(h(SecretGuardNote, {text: phrase, onRemove: () => { removed++; }})); });
  const line = document.querySelector('.secret-guard');
  expect(line?.getAttribute('role')).toBe('status');
  expect(line?.textContent).toContain('This looks like recovery words. ZIGoals never needs them, and nobody helping you should ask for them.');
  expect(line?.textContent).toContain('You can still save it; it stays on this device.');
  await act(async () => { (line!.querySelector('button') as HTMLButtonElement).click(); });
  expect(removed).toBe(1);
  await act(async () => { root.render(h(SecretGuardNote, {text: phrase, chat: true})); });
  expect(document.querySelector('.secret-guard')?.textContent).toContain('ZIGi will not send this message.');
  await act(async () => { root.render(h(SecretGuardNote, {text: 'A calm walk before work, then lunch with Sam at the market.'})); });
  expect(document.querySelector('.secret-guard')).toBeNull();
});
