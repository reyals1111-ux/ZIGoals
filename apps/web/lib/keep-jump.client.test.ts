// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {holdInView} from '../components/settings/keep-jump';

// D-088 (CI10): a hold keeps a jump's target in place while content above it grows, and lets go once a newer jump
// (another fragment) has scrolled the page, instead of pulling the page back to the old target.
let fire = () => {};
class FakeObserver { constructor(cb: () => void) { fire = cb; } observe() {} disconnect() {} }
let top = 100;
const target = {getBoundingClientRect: () => ({top})} as unknown as HTMLElement;
beforeEach(() => { vi.stubGlobal('ResizeObserver', FakeObserver); top = 100; });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

test('content growing above the target scrolls the page by as much', () => {
  const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
  const stop = holdInView(target);
  top = 400; fire();
  expect(scroll).toHaveBeenCalledWith(0, 300);
  stop();
});

test('after a newer jump the hold lets go and never scrolls back', () => {
  const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
  let current = true;
  holdInView(target, 2000, 10_000, () => current);
  current = false; top = -1450; fire();
  top = 900; fire();
  expect(scroll).not.toHaveBeenCalled();
});
