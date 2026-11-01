// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {CAPTURE_BUDGET, gateViewTransitions, namedCaptureArea, viewTransitionsAllowed} from './view-transition-gate';

const proto = Document.prototype as unknown as {startViewTransition?: unknown};
afterEach(() => { gateViewTransitions(document, 'full'); delete proto.startViewTransition; });

describe('the view-transition gate', () => {
  it('allows page transitions in Full and Calm, not Off', () => {
    expect([viewTransitionsAllowed('full'), viewTransitionsAllowed('calm'), viewTransitionsAllowed('off')]).toEqual([true, true, false]);
  });
  it('under Off the page behaves as a browser without the API, and the browser method shows through again after', () => {
    const native = vi.fn();
    proto.startViewTransition = native;
    expect(gateViewTransitions(document, 'off')).toBe(false);
    expect(typeof document.startViewTransition).toBe('undefined');
    expect(gateViewTransitions(document, 'off')).toBe(false);
    expect(gateViewTransitions(document, 'calm')).toBe(true);
    /* Assertion changed (Session AK CI-W, lead decision, deliberate: Full and Calm wrap the method with a capture budget).
       Equal strength: the browser's own method shows through — a call reaches it with the same arguments and `this`, and
       its result comes back unchanged. */
    const done = {finished: Promise.resolve()};
    native.mockReturnValue(done);
    const arg = {update: () => {}};
    expect(document.startViewTransition(arg as never)).toBe(done);
    expect(native).toHaveBeenCalledTimes(1);
    expect(native.mock.calls[0]).toEqual([arg]);
    expect(native.mock.contexts[0]).toBe(document);
    expect(gateViewTransitions(document, 'full')).toBe(true);
  });
  it('declines a transition whose named elements would capture more than the budget, so React commits at once', () => {
    const native = vi.fn(() => 'started');
    proto.startViewTransition = native;
    expect(gateViewTransitions(document, 'full')).toBe(true);
    const page = document.createElement('div');
    document.body.append(page);
    const size = (w: number, h: number) => { page.getBoundingClientRect = () => ({width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({})}); };
    // No name: nothing is counted, whatever its size.
    size(954, 21_769);
    expect(namedCaptureArea(document)).toBe(0);
    expect(document.startViewTransition(() => {})).toBe('started');
    // Named and within the budget: the browser's method runs.
    page.style.viewTransitionName = '_t_0_';
    size(1000, Math.floor(CAPTURE_BUDGET / 1000));
    expect(namedCaptureArea(document)).toBe(1000 * Math.floor(CAPTURE_BUDGET / 1000));
    expect(document.startViewTransition(() => {})).toBe('started');
    // Settings after a # jump (954 × 21 769 px) at 2×: about 83 million device pixels — declined, the browser is not asked.
    size(954, 21_769);
    const dpr = vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2);
    expect(namedCaptureArea(document)).toBe(954 * 21_769 * 4);
    expect(() => document.startViewTransition(() => {})).toThrow(DOMException);
    expect(native).toHaveBeenCalledTimes(2);
    // "none" is no name.
    page.style.viewTransitionName = 'none';
    expect(namedCaptureArea(document)).toBe(0);
    dpr.mockRestore();
    page.remove();
  });
  it('Off removes the budget wrapper and shadows the method; Full puts the wrapper back', () => {
    proto.startViewTransition = vi.fn();
    expect(gateViewTransitions(document, 'full')).toBe(true);
    expect(gateViewTransitions(document, 'off')).toBe(false);
    expect(typeof document.startViewTransition).toBe('undefined');
    expect(gateViewTransitions(document, 'full')).toBe(true);
    expect(typeof document.startViewTransition).toBe('function');
  });
  it('changes nothing where the browser has no view transitions', () => {
    expect(gateViewTransitions(document, 'off')).toBe(false);
    expect(gateViewTransitions(document, 'full')).toBe(false);
    expect(Object.getOwnPropertyNames(document)).not.toContain('startViewTransition');
  });
});
