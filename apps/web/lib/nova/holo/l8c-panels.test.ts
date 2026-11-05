// @vitest-environment jsdom
import {act, createElement, createRef} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {NovaLeft} from '../../../components/nova/nova-left';
import {CommandField} from '../../../components/nova/nova-command';
import {NovaHermesCard} from '../../../components/nova/hermes/hermes-card';
import {holdKey, readKey} from '../../ai/keys';
import {defaultAiSettings, updateAiSettings} from '../../ai/settings';
import {NOVA_DRAFT_EVENT, takeNovaDraft} from '../bridge';
import {hermesStatus, NOVA_HERMES_KEY, type HermesStatus, type NovaHermes} from '../hermes-record';

/**
 * Session AL lane L8c (P14-B's requests): NOVA's panels say what the Hermes check found (a refused key was reached), the
 * command field notes its words as NOVA's draft (DV-070), and the Hermes card forgets the key (Z1A-I4) and says when a
 * local-model confirmation lapsed (Z1A-I5).
 */
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
  localStorage.clear(); takeNovaDraft();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const flush = () => act(async () => { for (let i = 0; i < 6; i++) await new Promise(r => setTimeout(r, 0)); });

const left = (hermes: HermesStatus | null) => createElement(NovaLeft, {
  state: 'open', onCycle() {}, you: 'Sam', brain: {kind: 'none', words: 'on-device answers'} as never, counts: {} as never, pages: () => false,
  earn: false, chess: false, persona: 'NOVA', onNova() {}, onZigi() {}, zigiStatus: 'on', hermes,
});
const AT = '2026-11-05T08:00:00.000Z', BASE = 'http://127.0.0.1:8642';
const record = (more: Partial<NovaHermes> = {}): NovaHermes => ({version: 1, baseUrl: BASE, model: 'hermes-agent', ...more});

describe('NOVA left panel: the Hermes line and row (EX3 left-over 1)', () => {
  it('a refused key reads "answered … refused the key", its row "key refused", never "not reachable"', async () => {
    await act(async () => root.render(left(hermesStatus(record({lastCheck: {at: AT, reachable: false, problem: 'wrong-key'}})))));
    const foot = host.querySelector('.nova-left-foot')!.textContent!;
    expect(foot).toContain('Hermes gateway answered at the last check, but refused the key');
    expect(foot).not.toContain('not reachable');
    const row = host.querySelector('a[href="/app/nova/hermes"]')!;
    expect(row.getAttribute('aria-label')).toBe('Hermes Agent, key refused');
    expect(row.querySelector('[data-status]')!.getAttribute('data-status')).toBe('calm');
    expect(host.querySelectorAll('.nova-left-brain')[1]!.querySelector('[data-kind]')!.getAttribute('data-kind')).toBe('on');
  });
  it('reachable reads ready; nothing answered stays "not reachable"', async () => {
    await act(async () => root.render(left(hermesStatus(record({lastCheck: {at: AT, reachable: true}})))));
    expect(host.querySelector('a[href="/app/nova/hermes"]')!.getAttribute('aria-label')).toBe('Hermes Agent, ready');
    expect(host.textContent).toContain('Hermes gateway reachable at the last check');
    await act(async () => root.render(left(hermesStatus(record({lastCheck: {at: AT, reachable: false}})))));
    expect(host.querySelector('a[href="/app/nova/hermes"]')!.getAttribute('aria-label')).toBe('Hermes Agent, not reachable');
    expect(host.textContent).toContain('Hermes gateway not reachable at the last check');
    expect(host.querySelectorAll('.nova-left-brain')[1]!.querySelector('[data-kind]')!.getAttribute('data-kind')).toBe('offline');
  });
});

describe('NOVA command field: the words become NOVA’s draft (DV-070)', () => {
  const type = (input: HTMLInputElement, value: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', {bubbles: true}));
  };
  it('every change is noted (typed, pasted, cleared) and the composer can take it', async () => {
    const seen: unknown[] = []; const on = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener(NOVA_DRAFT_EVENT, on);
    await act(async () => root.render(createElement(CommandField, {you: '', persona: 'NOVA', inputRef: createRef<HTMLInputElement>(), onOpen() {}})));
    const input = host.querySelector('input')!;
    await act(async () => type(input, 'How far'));
    expect(seen.at(-1)).toEqual({text: 'How far', pasted: false});
    await act(async () => { input.dispatchEvent(new Event('paste', {bubbles: true})); type(input, 'How far am I on my goals?'); });
    expect(seen.at(-1)).toEqual({text: 'How far am I on my goals?', pasted: true});
    expect(takeNovaDraft()).toEqual({text: 'How far am I on my goals?', pasted: true});
    await act(async () => type(input, ''));
    expect(seen.at(-1)).toBeNull();
    expect(takeNovaDraft()).toBeNull();
    window.removeEventListener(NOVA_DRAFT_EVENT, on);
  });
});

describe('Hermes card: forget the key, and a lapsed confirmation (Z1A-I4, Z1A-I5)', () => {
  it('"Forget the Hermes key" shows while a key is kept, forgets the guide’s and the brain’s key when the brain is this Hermes', async () => {
    localStorage.setItem(NOVA_HERMES_KEY, JSON.stringify(record({lastCheck: {at: AT, reachable: true}})));
    updateAiSettings(localStorage, () => ({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', localServer: 'openai-compatible', baseUrl: BASE, model: 'hermes-agent'}));
    holdKey('local', 'hermes', 'hermes-secret'); holdKey('local', 'local', 'hermes-secret'); holdKey('local', 'openai', 'sk-other');
    await act(async () => root.render(createElement(NovaHermesCard))); await flush();
    const button = [...host.querySelectorAll('button')].find(b => b.textContent === 'Forget the Hermes key');
    expect(button).toBeTruthy();
    await act(async () => button!.click()); await flush();
    expect(await readKey('local', 'hermes')).toBeNull();
    expect(await readKey('local', 'local')).toBeNull();
    expect(await readKey('local', 'openai')).toBe('sk-other');
    expect(host.querySelector('[role="status"]')!.textContent).toContain('The Hermes key is forgotten on this device');
    expect([...host.querySelectorAll('button')].some(b => b.textContent === 'Forget the Hermes key')).toBe(false);
  });
  it('another local server as the brain keeps its key; no key kept, no button', async () => {
    localStorage.setItem(NOVA_HERMES_KEY, JSON.stringify(record({lastCheck: {at: AT, reachable: true}})));
    updateAiSettings(localStorage, () => ({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', localServer: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234/v1', model: 'qwen'}));
    holdKey('local', 'local', 'lm-studio-key');
    await act(async () => root.render(createElement(NovaHermesCard))); await flush();
    expect([...host.querySelectorAll('button')].some(b => b.textContent === 'Forget the Hermes key')).toBe(false);
    holdKey('local', 'hermes', 'hermes-secret');
    await act(async () => root.unmount()); root = createRoot(host);
    await act(async () => root.render(createElement(NovaHermesCard))); await flush();
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Forget the Hermes key')!.click()); await flush();
    expect(await readKey('local', 'hermes')).toBeNull();
    expect(await readKey('local', 'local')).toBe('lm-studio-key');
  });
  it('a confirmation given for another Hermes version says so; one that still holds says it is confirmed', async () => {
    const confirmed = {localModelConfirmed: true, confirmedOn: '2026-11-01', confirmedBase: BASE, confirmedVersion: '0.22.5'};
    localStorage.setItem(NOVA_HERMES_KEY, JSON.stringify(record({...confirmed, lastCheck: {at: AT, reachable: true, version: '0.23.0'}})));
    await act(async () => root.render(createElement(NovaHermesCard))); await flush();
    expect(host.textContent).toContain('Your Hermes changed since you confirmed it runs a local model');
    await act(async () => root.unmount()); root = createRoot(host);
    localStorage.setItem(NOVA_HERMES_KEY, JSON.stringify(record({...confirmed, lastCheck: {at: AT, reachable: true, version: '0.22.5'}})));
    await act(async () => root.render(createElement(NovaHermesCard))); await flush();
    expect(host.textContent).toContain('You confirmed it runs a local model.');
    expect(host.textContent).not.toContain('Your Hermes changed');
  });
});
