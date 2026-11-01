// @vitest-environment jsdom
// Session AK P8b: the number ticker's frames change characters only, never the page's tree. A tree change runs every
// :has() check on the page; on Today at CPU 4× that made each frame of the Wealth total's count restyle ~335–2,500
// elements while the person scrolled (8 long tasks, TBT 991 ms).
import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {NumberTicker} from '../../components/motion/number-ticker';

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
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ''; document.documentElement.removeAttribute('data-app-hydrated'); });

describe('NumberTicker frames (Session AK P8b)', () => {
  it('count by changing the one text node’s characters: no node is added or removed between the start and the end', async () => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => root.render(createElement(NumberTicker, {text: '$1,250.00'})));
    const run = host.querySelector('.zg-ticker-run')!;
    const text = run.firstChild;
    const records: MutationRecord[] = [];
    const observer = new MutationObserver(list => records.push(...list));
    observer.observe(host, {childList: true, subtree: true, characterData: true});
    await act(async () => { for (let i = 0; i < 5; i++) flushFrames(100); });
    await Promise.resolve();
    records.push(...observer.takeRecords());
    expect(records.length).toBeGreaterThan(0);
    expect(records.filter(r => r.type === 'childList')).toEqual([]);
    expect(run.firstChild).toBe(text);
    expect(run.textContent).toMatch(/^\$[\d,]+\.\d\d$/);
    // The end swaps back to the plain final text once.
    await act(async () => { for (let i = 0; i < 10; i++) flushFrames(120); });
    expect(host.querySelector('[data-running]')).toBeNull();
    expect(host.textContent).toBe('$1,250.00');
    observer.disconnect();
    await act(async () => root.unmount());
  });
});
