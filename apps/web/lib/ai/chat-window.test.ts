// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest';
import {chatWindow, copyText, nextFrame, setChatWindow} from './chat-window';

// Session V Part 14: while the mini window is open, copying and frames use its own window, not the tab's.
afterEach(() => { setChatWindow(null); vi.useRealTimers(); });
const fakeWindow = () => {
  const written: string[] = [], frames: (() => void)[] = [];
  const win = {closed: false, navigator: {clipboard: {writeText: async (text: string) => { written.push(text); }}}, requestAnimationFrame: (run: () => void) => frames.push(run), cancelAnimationFrame: vi.fn()};
  return {win: win as unknown as Window, written, frames};
};
it('without a mini window, the tab\'s own window and frames, as before', () => {
  expect(chatWindow()).toBe(window);
  const raf = vi.spyOn(window, 'requestAnimationFrame');
  nextFrame(() => undefined);
  expect(raf).toHaveBeenCalledOnce();
});
it('with one, its clipboard; a closed one counts as gone', async () => {
  const mini = fakeWindow();
  setChatWindow(mini.win);
  expect(chatWindow()).toBe(mini.win);
  await copyText('hello');
  expect(mini.written).toEqual(['hello']);
  (mini.win as unknown as {closed: boolean}).closed = true;
  expect(chatWindow()).toBe(window);
});
it('its frame, raced against a short timer of the tab: whichever comes first runs, once', () => {
  vi.useFakeTimers();
  const mini = fakeWindow();
  setChatWindow(mini.win);
  let ran = 0;
  nextFrame(() => { ran++; });
  mini.frames[0]!();
  expect(ran).toBe(1);
  vi.advanceTimersByTime(500);
  expect(ran).toBe(1);
  // A window the browser froze runs no frames: the tab's timer runs it, and a late frame does not run it again.
  let late = 0;
  nextFrame(() => { late++; });
  vi.advanceTimersByTime(150);
  expect(late).toBe(1);
  mini.frames[1]!();
  expect(late).toBe(1);
  // Cancelled: neither runs.
  let never = 0;
  const cancel = nextFrame(() => { never++; });
  cancel(); vi.advanceTimersByTime(500); mini.frames[2]!();
  expect(never).toBe(0);
});
it('no clipboard there: the copy fails plainly', async () => {
  const mini = fakeWindow();
  (mini.win as unknown as {navigator: object}).navigator = {};
  setChatWindow(mini.win);
  await expect(copyText('x')).rejects.toThrow('No clipboard here');
});
