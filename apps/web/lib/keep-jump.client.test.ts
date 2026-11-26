// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {holdInView, whenOnPage} from '../components/settings/keep-jump';

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

// Session AW (Part 2; CI run 2034, j06): a jump to an anchor of a group that loads from its own chunk lands once the
// target appears; a scroll by the person, or a newer jump, ends the wait; a target already there is found at once.
test('a target already on the page is found at once', () => {
  document.body.innerHTML = '<section id="now-here"></section>';
  const found = vi.fn();
  whenOnPage('now-here', found);
  expect(found).toHaveBeenCalledWith(document.getElementById('now-here'));
});

test('a target that arrives later is found when it appears, once', async () => {
  document.body.innerHTML = '<main></main>';
  const found = vi.fn();
  whenOnPage('late-card', found);
  expect(found).not.toHaveBeenCalled();
  document.querySelector('main')!.insertAdjacentHTML('beforeend', '<section id="late-card"></section>');
  await new Promise(r => setTimeout(r, 0));
  expect(found).toHaveBeenCalledTimes(1);
  document.querySelector('main')!.insertAdjacentHTML('beforeend', '<p>more</p>');
  await new Promise(r => setTimeout(r, 0));
  expect(found).toHaveBeenCalledTimes(1);
});

test('the person scrolling, or a newer jump, ends the wait; a click does not', async () => {
  document.body.innerHTML = '<main></main>';
  const scrolled = vi.fn(), newer = vi.fn(), clicked = vi.fn();
  whenOnPage('a1', scrolled);
  window.dispatchEvent(new Event('wheel'));
  let current = true;
  whenOnPage('a2', newer, 10_000, () => current);
  whenOnPage('a3', clicked);
  window.dispatchEvent(new Event('pointerdown'));
  current = false;
  document.querySelector('main')!.insertAdjacentHTML('beforeend', '<i id="a1"></i><i id="a2"></i><i id="a3"></i>');
  await new Promise(r => setTimeout(r, 0));
  expect(scrolled).not.toHaveBeenCalled();
  expect(newer).not.toHaveBeenCalled();
  expect(clicked).toHaveBeenCalledTimes(1);
});
