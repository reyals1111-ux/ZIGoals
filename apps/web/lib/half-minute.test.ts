import {afterEach, beforeEach, expect, test, vi} from 'vitest';

// Session AB-Design Phase 2 (ADR-024): the shared 30-second clock (components/half-minute.ts).
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', globalThis); vi.resetModules(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const load = async () => (await import('../components/half-minute')).everyHalfMinute;

test('every listener runs every 30 s on one timer, and the last one to leave stops it', async () => {
  const everyHalfMinute = await load();
  const a = vi.fn(), b = vi.fn();
  const stopA = everyHalfMinute(a), stopB = everyHalfMinute(b);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(29_999); expect(a).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1); expect(a).toHaveBeenCalledTimes(1); expect(b).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(60_000); expect(a).toHaveBeenCalledTimes(3); expect(b).toHaveBeenCalledTimes(3);
  stopA(); vi.advanceTimersByTime(30_000); expect(a).toHaveBeenCalledTimes(3); expect(b).toHaveBeenCalledTimes(4);
  expect(vi.getTimerCount()).toBe(1);
  stopB(); expect(vi.getTimerCount()).toBe(0);
  stopB(); expect(vi.getTimerCount()).toBe(0); // a second stop changes nothing
  const c = vi.fn(), stopC = everyHalfMinute(c);
  vi.advanceTimersByTime(30_000); expect(c).toHaveBeenCalledTimes(1); stopC();
});

test('a listener that stops itself while the clock fires does not skip the others', async () => {
  const everyHalfMinute = await load();
  const b = vi.fn(); let stopA = () => {};
  const a = vi.fn(() => stopA());
  stopA = everyHalfMinute(a); const stopB = everyHalfMinute(b);
  vi.advanceTimersByTime(30_000); expect(a).toHaveBeenCalledTimes(1); expect(b).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(30_000); expect(a).toHaveBeenCalledTimes(1); expect(b).toHaveBeenCalledTimes(2);
  stopB();
});

test('new timer functions on the page (a fake clock installed later) re-arm the clock on them for everyone', async () => {
  const everyHalfMinute = await load();
  const a = vi.fn(), b = vi.fn();
  const stopA = everyHalfMinute(a);
  vi.useRealTimers(); vi.useFakeTimers(); // the page's setInterval is now a different function
  const stopB = everyHalfMinute(b);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(30_000); expect(a).toHaveBeenCalledTimes(1); expect(b).toHaveBeenCalledTimes(1);
  stopA(); stopB(); expect(vi.getTimerCount()).toBe(0);
});
