// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {arriveAt, arriveHere} from '../components/jump/arrive';

/**
 * Session AV lane 2 (fr-layout, FR-TJ-6, FR-S-9, FR-L-7): an address's #part lands on its element once that element has
 * rendered (Wealth's, Sleep's and Your data's sections draw after the page opens), opens what it should, and the person
 * scrolling first wins.
 */
class FakeObserver { observe() {} disconnect() {} }
let frames: FrameRequestCallback[] = [];
const flush = (n = 1) => { for (let i = 0; i < n; i++) { const run = frames; frames = []; for (const f of run) f(0); } };
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeObserver);
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { frames.push(f); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
  Element.prototype.scrollIntoView = vi.fn();
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/app/wealth#spending');
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); frames = []; });

test('waits for a section that renders later, then brings it into view and readies it', () => {
  const ready = vi.fn();
  arriveAt('spending', {ready});
  flush(3);
  expect(ready).not.toHaveBeenCalled();
  document.body.innerHTML = '<section id="spending"><button>Log spending</button></section>';
  flush();
  const el = document.getElementById('spending')!;
  expect(el.scrollIntoView).toHaveBeenCalledWith({block: 'start', behavior: 'instant'});
  expect(ready).toHaveBeenCalledWith(el);
});

test('an action address lands on its section (`at`), and a fold row is what comes into view (`reveal`)', () => {
  window.history.replaceState(null, '', '/app/wealth#log-spending');
  document.body.innerHTML = '<div class="row" id="row"></div><section id="spending"></section>';
  const row = document.getElementById('row')!;
  arriveHere(id => id === 'log-spending' ? {at: 'spending', reveal: () => row} : null);
  expect(row.scrollIntoView).toHaveBeenCalled();
});

test('the person scrolling before the section exists wins: nothing moves', () => {
  const ready = vi.fn();
  arriveAt('spending', {ready});
  window.dispatchEvent(new Event('wheel'));
  document.body.innerHTML = '<section id="spending"></section>';
  flush(2);
  expect(ready).not.toHaveBeenCalled();
});

test('a missing part falls back to its section after half the wait', () => {
  window.history.replaceState(null, '', '/app/wealth#watch-address');
  document.body.innerHTML = '<section id="holdings"></section>';
  const now = vi.spyOn(Date, 'now'), ready = vi.fn();
  now.mockReturnValue(0);
  arriveAt('watch-address', {fallback: 'holdings', ready, wait: 1000});
  expect(ready).not.toHaveBeenCalled();
  now.mockReturnValue(600); flush();
  expect(ready).toHaveBeenCalledWith(document.getElementById('holdings'));
});

test('an address the page leaves alone does nothing', () => {
  document.body.innerHTML = '<section id="spending"></section>';
  arriveHere(() => null);
  expect(document.getElementById('spending')!.scrollIntoView).not.toHaveBeenCalled();
});
