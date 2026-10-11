// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {useChatSession, type ChatSession} from '../../components/ai/use-chat-session';
import type {AiContextState} from '../../components/ai/use-ai-context';
import {dropMemoryKeys, holdKey} from './keys';
import {defaultAiSettings, type AiSettings} from './settings';

/**
 * Session Y Part 4 (docs/verification/y-cloud/SECURITY_REVIEW_Y.md, F4): Regenerate, Think deeper, "Send anyway" and the
 * monthly cap's confirm send a question again with what it first carried. Once Health is no longer shared with ZIGi, a
 * meal photo and records chosen while it was shared stay on the device. Owner edit 5: the Anthropic key goes only to
 * https://api.anthropic.com in `x-api-key`, never in a URL or a body, and is never stored with the chat.
 */
const KEY = 'sk-ant-api03-FAKE-Y4-RESEND-0000';
const calls: {url: string; init: RequestInit}[] = [];
const sse = (text: string) => ['event: message_start', 'data: {"type":"message_start","message":{"usage":{"input_tokens":5}}}', '',
  'event: content_block_delta', `data: ${JSON.stringify({type: 'content_block_delta', index: 0, delta: {type: 'text_delta', text}})}`, '',
  'event: message_stop', 'data: {"type":"message_stop"}', '', ''].join('\n');
const settings: AiSettings = {...defaultAiSettings(), enabled: true, mode: 'api', provider: 'anthropic', model: 'claude-mock', includeHealth: true, pageShare: {...defaultAiSettings().pageShare, health: true}};
const ctx = (healthOpen: boolean): AiContextState => ({area: 'health', pathname: '/app/health', attaches: true,
  consent: {page: healthOpen, health: healthOpen, reasons: healthOpen ? [] : ['Health: "Include Health" is off (its default).']},
  context: healthOpen ? {area: 'health', text: 'PAGE: Health diary today', handles: [], included: ['Health'], omitted: [], estimatedTokens: 10} : null,
  preview: null, ready: true, gates: {paused: false, health: healthOpen, areas: {}} as never, toolSources: () => null} as unknown as AiContextState);
let session: ChatSession | null = null, root: Root;
function Harness({open}: {open: boolean}) { const current = useChatSession({settings, scope: 'local', context: ctx(open)}); useEffect(() => { keep(current); }); return null; }
const keep = (current: ChatSession) => { session = current; };
const settle = async () => { for (let i = 0; i < 20; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; calls.length = 0;
  vi.stubGlobal('fetch', async (url: RequestInfo | URL, init?: RequestInit) => { calls.push({url: String(url), init: init ?? {}}); return new Response(new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode(sse('A plate of pasta.'))); c.close(); }}), {status: 200, headers: {'content-type': 'text/event-stream'}}); });
  holdKey('local', 'anthropic', KEY);
  localStorage.setItem('zigoals:ai-options:v1', JSON.stringify({version: 1, toolMode: 'attach'}));
  root = createRoot(document.body.appendChild(document.createElement('div')));
});
afterEach(async () => { await act(async () => root.unmount()); dropMemoryKeys(); localStorage.clear(); vi.unstubAllGlobals(); });
const ask = async () => { await act(async () => { await session!.send('What is in this meal?', {images: [{mime: 'image/jpeg', data: 'PHOTOBYTES_AAAA'}], extra: {text: 'HEALTH-RECORD: lunch 640 kcal', handles: []}}); }); await settle(); };

test('F4: with Health still shared, Regenerate sends the photo and the chosen records again', async () => {
  await act(async () => { root.render(h(Harness, {open: true})); });
  await ask();
  expect(String(calls.at(-1)!.init.body)).toContain('PHOTOBYTES_AAAA');
  await act(async () => { await session!.regenerate(); }); await settle();
  expect(calls).toHaveLength(2);
  const body = String(calls[1]!.init.body);
  expect(body).toContain('PHOTOBYTES_AAAA'); expect(body).toContain('HEALTH-RECORD');
});
test('F4: once Health is no longer shared, Regenerate and Think deeper leave the photo and the Health records on the device', async () => {
  await act(async () => { root.render(h(Harness, {open: true})); });
  await ask();
  await act(async () => { root.render(h(Harness, {open: false})); }); await settle();
  await act(async () => { await session!.regenerate(); }); await settle();
  expect(calls, 'Regenerate sends the question again').toHaveLength(2);
  await act(async () => { await session!.thinkDeeper(); }); await settle();
  expect(calls, 'Think deeper sends it once more').toHaveLength(3);
  for (const call of calls.slice(1)) { const body = String(call.init.body); expect(body).not.toContain('PHOTOBYTES_AAAA'); expect(body).not.toContain('HEALTH-RECORD'); expect(body).not.toContain('PAGE: Health diary'); }
});
test('API key (owner edit 5): only to https://api.anthropic.com in x-api-key; never in a URL, a body, or the stored chat', async () => {
  await act(async () => { root.render(h(Harness, {open: true})); });
  await ask();
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) {
    expect(call.url.startsWith('https://api.anthropic.com/')).toBe(true); expect(call.url).not.toContain(KEY);
    expect(String(call.init.body)).not.toContain(KEY); expect(call.init.credentials).toBe('omit');
    const headers = new Headers(call.init.headers); expect(headers.get('x-api-key')).toBe(KEY); expect(headers.has('authorization')).toBe(false);
  }
  const {indexedDbChatStore} = await import('./chats');
  const store = indexedDbChatStore('local'), list = await store.list(), saved = JSON.stringify(await Promise.all(list.map(s => store.read(s.id))));
  expect(saved).not.toContain(KEY); expect(saved).not.toContain('PHOTOBYTES');
});
