import {describe, expect, it} from 'vitest';
import {createFirstIdle, type IdleHost} from './first-idle';

function host(state = 'loading', idle = true) {
  const timers: {fn: () => void; ms: number}[] = [], idles: (() => void)[] = [], loads: (() => void)[] = [];
  let ready = state;
  const h: IdleHost = {readyState: () => ready, onLoad: fn => loads.push(fn), timer: (fn, ms) => timers.push({fn, ms}), ...(idle ? {idle: (fn: () => void) => idles.push(fn)} : {})};
  return {h, timers, idles, loads, load: () => { ready = 'complete'; loads.splice(0).forEach(f => f()); }};
}
const tick = () => new Promise(r => setTimeout(r, 0));

describe('the first-idle gate (F8 proposal 5)', () => {
  it('waits for the page to load and then for the first idle moment', async () => {
    const t = host(); const gate = createFirstIdle(t.h); let passed = false;
    void gate.wait().then(() => { passed = true; });
    await tick(); expect(passed).toBe(false); expect(t.idles).toHaveLength(0);
    t.load(); expect(t.idles).toHaveLength(1);
    await tick(); expect(passed).toBe(false);
    t.idles[0]!(); await tick(); expect(passed).toBe(true); expect(gate.isOpen()).toBe(true);
  });
  it('opens after the cap even when the page never goes idle, and stays open for later callers', async () => {
    const t = host(); const gate = createFirstIdle(t.h, {cap: 4000});
    const first = gate.wait();
    expect(t.timers.find(x => x.ms === 4000)).toBeTruthy();
    t.timers.find(x => x.ms === 4000)!.fn(); await first;
    expect(gate.wait()).toBe(first); // one gate per page
    expect(gate.isOpen()).toBe(true);
  });
  it('an already loaded page waits only for idle; without requestIdleCallback a short timer stands in', async () => {
    const t = host('complete'); createFirstIdle(t.h).wait(); expect(t.idles).toHaveLength(1);
    const s = host('complete', false); createFirstIdle(s.h).wait(); expect(s.timers.map(x => x.ms)).toContain(300);
  });
});
