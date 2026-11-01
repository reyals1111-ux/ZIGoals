// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {useOpening} from '../../components/nova/use-opening';
import {NovaOrb} from '../../components/nova/orb';
import {Starfield} from '../../components/nova/starfield';
import {OPENING} from './orb';

/**
 * The one-time "system online" sequence and NOVA's motion rules, rendered: it plays once (and marks itself seen as it
 * starts), any key or tap finishes it, under reduced motion or Motion Off it never plays and everything is in place, and
 * a replay is refused (in words, by the caller) while motion is off. The orb says each state in words; the sky is a still
 * frame without motion and never runs on a low-end device.
 */
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });

type Opening = ReturnType<typeof useOpening>;
function mount(props: {ready: boolean; seen: boolean; motion: boolean}, markSeen = vi.fn()) {
  const seen: {current: Opening | null} = {current: null};
  function Probe(p: typeof props) { seen.current = useOpening({...p, markSeen}); return null; }
  act(() => root.render(createElement(Probe, props)));
  return {state: () => seen.current!, markSeen, rerender: (next: typeof props) => act(() => root.render(createElement(Probe, next)))};
}

test('first open with motion: plays about two seconds, marks itself seen as it starts, then rests', () => {
  const m = mount({ready: true, seen: false, motion: true});
  expect(m.state().phase).toBe('play');
  expect(m.markSeen).toHaveBeenCalledTimes(1);
  act(() => { vi.advanceTimersByTime(OPENING.end + 100); });
  expect(m.state().phase).toBe('done');
});
test('any key or tap finishes it at once', () => {
  const m = mount({ready: true, seen: false, motion: true});
  act(() => { window.dispatchEvent(new KeyboardEvent('keydown', {key: 'x'})); });
  expect(m.state().phase).toBe('done');
  const t = mount({ready: true, seen: false, motion: true});
  act(() => { window.dispatchEvent(new Event('pointerdown')); });
  expect(t.state().phase).toBe('done');
});
test('reduced motion or Motion Off: never plays; the finished dashboard shows at once, and the visit still counts as seen', () => {
  const m = mount({ready: true, seen: false, motion: false});
  expect(m.state().phase).toBe('done');
  expect(m.markSeen).toHaveBeenCalledTimes(1);
  let replayed = true;
  act(() => { replayed = m.state().replay(); });
  expect(replayed).toBe(false);
  expect(m.state().phase).toBe('done');
});
test('seen before: no sequence; Customize can replay it while motion is allowed', () => {
  const m = mount({ready: true, seen: true, motion: true});
  expect(m.state().phase).toBe('done'); expect(m.markSeen).not.toHaveBeenCalled();
  act(() => { m.state().replay(); });
  expect(m.state().phase).toBe('play');
});
test('waits for the record before deciding', () => {
  const m = mount({ready: false, seen: false, motion: true});
  expect(m.state().phase).toBe('waiting');
  m.rerender({ready: true, seen: false, motion: true});
  expect(m.state().phase).toBe('play');
});

test('the orb: four states, each with its name in words when it is named; decorative otherwise', () => {
  act(() => root.render(createElement('div', null, createElement(NovaOrb, {state: 'thinking', label: ''}), createElement(NovaOrb, {state: 'idle'}))));
  const [named, plain] = [...host.querySelectorAll('svg')];
  expect(named!.getAttribute('role')).toBe('img'); expect(named!.getAttribute('aria-label')).toBe('NOVA · Thinking'); expect(named!.dataset.state).toBe('thinking');
  expect(plain!.getAttribute('aria-hidden')).toBe('true');
  // Ids are unique per orb, so two orbs on one page never share gradients.
  const ids = [...host.querySelectorAll('[id]')].map(e => e.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('the sky: a still frame without motion, nothing on a low-end device; hidden from assistive technology', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Object.defineProperty(navigator, 'hardwareConcurrency', {value: 8, configurable: true});
  await act(async () => root.render(createElement(Starfield, {motion: false, accent: 'violet'})));
  const canvas = host.querySelector('canvas')!;
  expect(canvas.dataset.sky).toBe('still'); expect(canvas.getAttribute('aria-hidden')).toBe('true');
  await act(async () => root.render(createElement(Starfield, {motion: true, accent: 'violet'})));
  expect(host.querySelector('canvas')!.dataset.sky).toBe('running');
  Object.defineProperty(navigator, 'hardwareConcurrency', {value: 2, configurable: true});
  act(() => root.unmount()); root = createRoot(host);
  await act(async () => root.render(createElement(Starfield, {motion: true, accent: 'violet'})));
  expect(host.querySelector('canvas')!.dataset.sky).toBe('none');
});
