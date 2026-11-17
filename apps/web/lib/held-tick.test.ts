import {describe, expect, test} from 'vitest';
import {heldSave, holdTick, releaseTick, type HeldTicks} from './held-tick';

/** Session AR (6a): the held tick of a box whose save is async (lib/held-tick.ts, used by components/use-held-tick.ts). */
function store() {
  let held: HeldTicks = {};
  return {get: () => held, set: (change: (h: HeldTicks) => HeldTicks) => { held = change(held); }};
}
describe('held tick (Session AR 6a)', () => {
  test('hold and release by key', () => {
    const h = holdTick({}, 'a', true);
    expect(h).toEqual({a: true});
    expect(releaseTick(h, 'a', true)).toEqual({});
    // a later tick of the same box keeps its own hold
    expect(releaseTick(holdTick(h, 'a', false), 'a', true)).toEqual({a: false});
    expect(releaseTick(h, 'b', true)).toBe(h);
  });
  test('the tick is held from the click, in the same task, until the save settles', async () => {
    const s = store(); let finish!: () => void; let started = false;
    const saving = heldSave(s.set, 'a', true, () => { started = true; return new Promise<void>(r => { finish = r; }); });
    expect(started).toBe(true);
    expect(s.get()).toEqual({a: true});
    await Promise.resolve();
    expect(s.get()).toEqual({a: true});
    finish(); await saving;
    expect(s.get()).toEqual({});
  });
  test('a refused save lets go and keeps its rejection for the caller', async () => {
    const s = store();
    await expect(heldSave(s.set, 'a', true, () => Promise.reject(Error('full')))).rejects.toThrow('full');
    expect(s.get()).toEqual({});
    await expect(heldSave(s.set, 'a', true, () => { throw Error('sync'); })).rejects.toThrow('sync');
    expect(s.get()).toEqual({});
  });
  test('an untick while the tick still saves: the later choice is held until its own save settles', async () => {
    const s = store(); let first!: () => void, second!: () => void;
    const a = heldSave(s.set, 'a', true, () => new Promise<void>(r => { first = r; }));
    const b = heldSave(s.set, 'a', false, () => new Promise<void>(r => { second = r; }));
    first(); await a;
    expect(s.get()).toEqual({a: false});
    second(); await b;
    expect(s.get()).toEqual({});
  });
});
