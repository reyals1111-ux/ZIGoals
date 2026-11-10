import {describe, expect, it} from 'vitest';
import {dismissToast, enqueueToast, MAX_TOAST_MS, MIN_TOAST_MS, TOAST_CAP, TOAST_MS, toastMs} from './toast-queue';

describe('the toast queue (Session AL 3e)', () => {
  const t = (id: number, message = `m${id}`, undo?: () => void) => ({id, message, undo});
  it('never holds more than the cap; the newest stays', () => {
    for (const cap of [1, 2]) {
      let shown: ReturnType<typeof t>[] = [];
      for (let i = 1; i <= 20; i++) { shown = enqueueToast(shown, t(i), cap); expect(shown.length).toBeLessThanOrEqual(cap); expect(shown.at(-1)!.id).toBe(i); }
      expect(shown.map(x => x.id)).toEqual(cap === 1 ? [20] : [19, 20]);
    }
    expect(TOAST_CAP).toBe(1);
    expect(enqueueToast([t(1)], t(2), 0)).toHaveLength(1);
  });
  it('the same words without Undo are not stacked; an Undo toast is never merged away by a status', () => {
    expect(enqueueToast([t(1, 'Saved.')], t(2, 'Saved.'), 2).map(x => x.id)).toEqual([2]);
    const undo = () => {};
    expect(enqueueToast([t(1, 'Saved.', undo)], t(2, 'Saved.'), 2).map(x => x.id)).toEqual([1, 2]);
  });
  it('dismisses by id, or the newest', () => {
    const shown = [t(1), t(2)];
    expect(dismissToast(shown, 1).map(x => x.id)).toEqual([2]);
    expect(dismissToast(shown).map(x => x.id)).toEqual([1]);
    expect(dismissToast(shown, 9)).toBe(shown);
    expect(dismissToast([])).toEqual([]);
  });
  it('time on screen: 8 s by default, 5 s to 60 s', () => {
    expect(toastMs()).toBe(TOAST_MS); expect(toastMs(10)).toBe(MIN_TOAST_MS); expect(toastMs(1e9)).toBe(MAX_TOAST_MS); expect(toastMs(10_000)).toBe(10_000); expect(toastMs(Number.NaN)).toBe(TOAST_MS);
  });
});
