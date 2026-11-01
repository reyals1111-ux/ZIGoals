// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {NumberTicker} from '../../components/motion/number-ticker';
import {celebrateCompletion, SPARKS} from '../../components/motion/completion';
import {MOTION_KEY} from './level';
import {UI_PREFS_KEY} from '../ab-design-keys';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
let frames: FrameRequestCallback[] = [], now = 0;
const flushFrames = (ms: number) => { now += ms; const run = frames; frames = []; for (const f of run) f(now); };
beforeEach(() => {
  localStorage.clear(); frames = []; now = 0;
  vi.stubGlobal('matchMedia', vi.fn(() => ({matches: false})));
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('IntersectionObserver', class { constructor(private cb: IntersectionObserverCallback) {} observe(el: Element) { this.cb([{isIntersecting: true, target: el} as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver); } unobserve() {} disconnect() {} });
  document.documentElement.setAttribute('data-app-hydrated', '');
  Element.prototype.getBoundingClientRect = function () { return {left: 10, top: 20, width: 40, height: 40, right: 50, bottom: 60, x: 10, y: 20, toJSON() {}} as DOMRect; };
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ''; document.documentElement.removeAttribute('data-app-hydrated'); });

async function mount(text: string) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(NumberTicker, {text})));
  return {host, root};
}

describe('NumberTicker', () => {
  it('counts up once in Full motion, keeps the final value readable throughout, and lands on the exact text', async () => {
    const {host, root} = await mount('$1,250.00');
    expect(host.querySelector('[data-running]')).not.toBeNull();
    expect(host.querySelector('.sr-only')?.textContent).toBe('$1,250.00');
    expect(host.querySelector('.zg-ticker-run')?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('.zg-ticker-run')?.textContent).toBe('$0.00');
    await act(async () => flushFrames(300));
    const mid = host.querySelector('.zg-ticker-run')?.textContent ?? '';
    expect(mid).toMatch(/^\$[\d,]+\.\d\d$/);
    await act(async () => { for (let i = 0; i < 10; i++) flushFrames(120); });
    expect(host.querySelector('[data-running]')).toBeNull();
    expect(host.textContent).toBe('$1,250.00');
    await act(async () => root.unmount());
  });
  it('shows the final value at once in Calm, Off and under reduced motion, and never ticks unknown text', async () => {
    for (const setup of [() => localStorage.setItem(MOTION_KEY, 'calm'), () => localStorage.setItem(MOTION_KEY, 'off'), () => vi.stubGlobal('matchMedia', vi.fn(() => ({matches: true})))]) {
      localStorage.clear(); vi.stubGlobal('matchMedia', vi.fn(() => ({matches: false}))); setup();
      const {host, root} = await mount('$1,250.00');
      expect(host.querySelector('[data-running]')).toBeNull();
      expect(host.textContent).toBe('$1,250.00');
      await act(async () => root.unmount());
    }
    localStorage.clear();
    const {host, root} = await mount('Unknown');
    expect(host.querySelector('[data-running]')).toBeNull();
    expect(host.textContent).toBe('Unknown');
    await act(async () => root.unmount());
  });
  it('on the first page load, a figure already on screen keeps its painted value', async () => {
    document.documentElement.removeAttribute('data-app-hydrated');
    Object.defineProperty(window, 'innerHeight', {value: 800, configurable: true});
    const {host, root} = await mount('42');
    expect(host.querySelector('[data-running]')).toBeNull();
    await act(async () => root.unmount());
  });
});

describe('the completion moment', () => {
  it('Full: a ring and eight sparks that never take a tap and remove themselves', () => {
    vi.useFakeTimers();
    const button = document.createElement('button'); document.body.appendChild(button);
    expect(celebrateCompletion(button, {level: 'full', haptic: false})).toBe('burst');
    const layer = document.querySelector<HTMLElement>('.zg-burst')!;
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.querySelectorAll('.zg-burst-ring')).toHaveLength(1);
    expect(layer.querySelectorAll('.zg-burst-spark')).toHaveLength(SPARKS);
    expect(layer.style.getPropertyValue('--zg-x')).toBe('30px');
    vi.advanceTimersByTime(1000);
    expect(document.querySelector('.zg-burst')).toBeNull();
    vi.useRealTimers();
  });
  it('Calm: the ring alone; Off: nothing; no target: nothing', () => {
    const button = document.createElement('button'); document.body.appendChild(button);
    expect(celebrateCompletion(button, {level: 'calm', haptic: false})).toBe('ring');
    expect(document.querySelectorAll('.zg-burst-spark')).toHaveLength(0);
    document.body.innerHTML = ''; document.body.appendChild(button);
    expect(celebrateCompletion(button, {level: 'off', haptic: false})).toBe('none');
    expect(document.querySelector('.zg-burst')).toBeNull();
    expect(celebrateCompletion(null)).toBe('none');
  });
  it('vibrates once on a touch device with the switch on, and not when the person turned vibration off', () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', {value: vibrate, configurable: true});
    vi.stubGlobal('matchMedia', vi.fn((q: string) => ({matches: q.includes('coarse')})));
    const button = document.createElement('button'); document.body.appendChild(button);
    celebrateCompletion(button, {level: 'full'});
    expect(vibrate).toHaveBeenCalledTimes(1);
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify({version: 1, checklist: {haptics: false}}));
    celebrateCompletion(button, {level: 'full'});
    expect(vibrate).toHaveBeenCalledTimes(1);
    delete (navigator as unknown as {vibrate?: unknown}).vibrate;
  });
});
