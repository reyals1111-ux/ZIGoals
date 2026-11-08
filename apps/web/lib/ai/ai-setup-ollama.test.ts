// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {AiSetup} from '../../components/ai/ai-setup';
import type {AiSettingsStore} from '../../components/ai/use-ai-settings';
import {NOT_OLLAMA} from '../nova/local-servers';
import {defaultAiSettings} from './settings';

/**
 * Security delta A (SA-7, 8 Nov; docs/review/session-al/SECURITY_DELTA_A.md): ZIGi's own setup (Settings → ZIGi, and NOVA's
 * brain planet, which shows the same form) runs the same "is it really Ollama" check NOVA's scan runs (BN-035). A MOCK on
 * port 11434 that answers {"version":"0.0.0-mock"} and a bare model list gets NOT_OLLAMA: no "Found Ollama", no model
 * list, no Connect. A real Ollama answer still connects. MOCK fetch; nothing leaves.
 */
const BASE = 'http://127.0.0.1:11434';
let root: Root, asked: string[] = [];
const json = (body: unknown) => new Response(JSON.stringify(body), {status: 200, headers: {'content-type': 'application/json'}});
function ollama(real: boolean) {
  vi.stubGlobal('fetch', async (url: RequestInfo | URL) => {
    const u = String(url); asked.push(u);
    if (u.endsWith('/api/version')) return json({version: real ? '0.40.14' : '0.0.0-mock'});
    if (u.endsWith('/api/tags')) return json({models: [real ? {name: 'qwen2.5:0.5b', model: 'qwen2.5:0.5b', modified_at: '2026-11-03T22:00:00Z', size: 397821319, digest: 'a'.repeat(64), details: {format: 'gguf', family: 'qwen2'}} : {name: 'mock:latest'}]});
    return new Response('not found', {status: 404});
  });
}
const store = (): AiSettingsStore => { let data = defaultAiSettings(); return {get data() { return data; }, loaded: true, unreadable: false, installed: false, update: change => (data = change(data)), turnOff: () => data}; };
const button = (name: string | RegExp) => [...document.querySelectorAll('button')].find(b => typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent ?? ''));
const settle = async () => { for (let i = 0; i < 10; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
async function testLocal() {
  await act(async () => { root.render(h(AiSetup, {settings: store(), scope: 'local'})); });
  await act(async () => { button(/I run a model on this computer/)!.click(); });
  await act(async () => { button('Ollama (11434)')!.click(); });
  await act(async () => { button('Test connection')!.click(); }); await settle();
}
beforeEach(() => { (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true; asked = []; root = createRoot(document.body.appendChild(document.createElement('div'))); });
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.unstubAllGlobals(); });

test('SA-7: a mock on 11434 that only looks like Ollama gets NOT_OLLAMA, never "Found Ollama", a model list or Connect', async () => {
  ollama(false); await testLocal();
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(NOT_OLLAMA(BASE));
  expect(document.body.textContent).not.toContain('Found Ollama');
  expect(document.querySelector('[role="option"], [role="listbox"]')).toBeNull();
  expect(button('Connect')).toBeUndefined();
  expect(asked.every(u => u.startsWith(`${BASE}/`))).toBe(true); // only this computer was asked
});
test('SA-7: a real Ollama answer is still found and its models listed', async () => {
  ollama(true); await testLocal();
  expect(document.querySelector('[role="alert"]')).toBeNull();
  expect(document.body.textContent).toContain(`Found Ollama at ${BASE}.`);
  expect(document.body.textContent).toContain('qwen2.5:0.5b');
});
