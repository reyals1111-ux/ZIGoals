import {describe, expect, it} from 'vitest';
import {visiblePoll, type PollEnv} from './visible-poll';

// Session AF (P1.16, the Gate C ledger pass): Earn reads its live figures only while the page is visible.
function fakePage() {
  let t = 0, visible = true, nextId = 1;
  const timers = new Map<number, {at: number; fn: () => void}>(), listeners = new Set<() => void>();
  const env: PollEnv = {
    visible: () => visible, now: () => t,
    setTimer: (fn, ms) => { const id = nextId++; timers.set(id, {at: t + ms, fn}); return id; },
    clearTimer: id => { timers.delete(id); },
    onVisibility: fn => { listeners.add(fn); return () => listeners.delete(fn); },
  };
  const flush = () => new Promise(r => setTimeout(r, 0));
  return {env,
    async advance(ms: number) { const end = t + ms; for (;;) { const due = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!due) break; t = due[1].at; timers.delete(due[0]); due[1].fn(); await flush(); await flush(); } t = end; },
    async show(on: boolean) { visible = on; for (const fn of listeners) fn(); await flush(); await flush(); },
    listeners, timers};
}

describe('Earn polls only while the page is visible', () => {
  it('reads at once, then at the cadence while visible', async () => {
    const page = fakePage(); let reads = 0;
    visiblePoll(async () => { reads++; }, 120_000, page.env);
    await page.advance(0); expect(reads).toBe(1);
    await page.advance(119_999); expect(reads).toBe(1);
    await page.advance(1); expect(reads).toBe(2);
    await page.advance(240_000); expect(reads).toBe(4);
  });
  it('a hidden page reads nothing; coming back reads at once only when the last read is older than the cadence', async () => {
    const page = fakePage(); let reads = 0;
    visiblePoll(async () => { reads++; }, 120_000, page.env);
    await page.advance(0); expect(reads).toBe(1);
    await page.show(false);
    await page.advance(600_000); expect(reads).toBe(1); // the timer fires, the hidden page does not read
    await page.show(true); expect(reads).toBe(2);      // back after 10 minutes: at once
    await page.advance(30_000); await page.show(false); await page.show(true);
    expect(reads).toBe(2);                              // back after 30 s: the last read is fresh, nothing read
    await page.advance(120_000); expect(reads).toBe(3); // the cadence goes on
  });
  it('one read at a time, and stopping ends the timer and the listener', async () => {
    const page = fakePage(); let reads = 0, release: () => void = () => {};
    const stop = visiblePoll(() => { reads++; return new Promise<void>(r => { release = r; }); }, 1_000, page.env);
    await page.advance(5_000); expect(reads).toBe(1);  // the first read is still running
    release(); await new Promise(r => setTimeout(r, 0)); // the finished read lets go
    await page.advance(1_000); expect(reads).toBe(2);
    stop(); release();
    expect(page.listeners.size).toBe(0); expect(page.timers.size).toBe(0);
    await page.advance(10_000); await page.show(false); await page.show(true); expect(reads).toBe(2);
  });
});
