// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {CAPTURE_BUDGET, gateViewTransitions, namedCaptureArea, releaseLeavingPages, viewTransitionsAllowed} from './view-transition-gate';

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
    /* Assertion changed (Session AL P14-D, deliberate: a leaving page over the budget now crossfades through the window-sized
       root picture). Equal strength: an over-budget capture still never reaches the browser — a short element that is not a
       page (954 × 1 000 px at 3×, about 8.6 M) is declined and the browser is not asked; the Settings case below proves the
       released page is no longer captured. */
    size(954, 1000);
    const dpr = vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3);
    expect(namedCaptureArea(document)).toBe(954 * 1000 * 9);
    expect(() => document.startViewTransition(() => {})).toThrow(DOMException);
    expect(native).toHaveBeenCalledTimes(2);
    expect(page.style.viewTransitionName).toBe('_t_0_');
    // Settings after a # jump (954 × 21 769 px) at 2×: about 83 million device pixels. The page's own name is released (it
    // is not captured), so the browser is asked with nothing over the budget left.
    dpr.mockReturnValue(2);
    size(954, 21_769);
    expect(namedCaptureArea(document)).toBe(954 * 21_769 * 4);
    expect(document.startViewTransition(() => {})).toBe('started');
    expect(native).toHaveBeenCalledTimes(3);
    expect(namedCaptureArea(document)).toBe(0);
    page.style.viewTransitionName = '_t_0_';
    // "none" is no name.
    page.style.viewTransitionName = 'none';
    expect(namedCaptureArea(document)).toBe(0);
    dpr.mockRestore();
    page.remove();
  });
  it('Session AL (P14-D): leaving a page over the budget, the window-sized root picture crossfades instead, then is put back', async () => {
    let finish!: () => void;
    const seen: {mode?: string; root?: string; page?: string}[] = [];
    const page = document.createElement('main');
    const native = vi.fn(() => {
      seen.push({mode: document.documentElement.dataset.zgVtPage, root: document.documentElement.style.viewTransitionName, page: page.style.viewTransitionName});
      return {finished: new Promise<void>(r => { finish = r; })};
    });
    proto.startViewTransition = native;
    gateViewTransitions(document, 'full');
    document.body.append(page);
    // Today with the Showcase at 390 × 844 and 3×: about 24 M device pixels, React's exit class on it.
    page.getBoundingClientRect = () => ({width: 390, height: 6900, top: 0, left: 0, right: 390, bottom: 6900, x: 0, y: 0, toJSON: () => ({})});
    page.style.viewTransitionName = '_t_1_';
    (page.style as CSSStyleDeclaration & {viewTransitionClass?: string}).viewTransitionClass = 'zg-page-out';
    const dpr = vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3);
    const small = document.createElement('h1');
    small.getBoundingClientRect = () => ({width: 300, height: 40, top: 0, left: 0, right: 300, bottom: 40, x: 0, y: 0, toJSON: () => ({})});
    small.style.viewTransitionName = 'zg-goal-1';
    document.body.append(small);
    document.startViewTransition(() => {});
    expect(native).toHaveBeenCalledTimes(1);
    // When the browser was asked: the page carried no name, the root kept its picture, the crossfade mode was on;
    // a small shared element (a goal title) keeps its name and still morphs.
    expect(seen[0]).toEqual({mode: 'root', root: 'root', page: 'none'});
    expect(small.style.viewTransitionName).toBe('zg-goal-1');
    finish();
    await Promise.resolve(); await Promise.resolve();
    expect(document.documentElement.dataset.zgVtPage).toBeUndefined();
    expect(document.documentElement.style.viewTransitionName).toBe('');
    // Within the budget nothing is released and no mode is set (the page keeps its own crossfade).
    page.getBoundingClientRect = () => ({width: 390, height: 800, top: 0, left: 0, right: 390, bottom: 800, x: 0, y: 0, toJSON: () => ({})});
    page.style.viewTransitionName = '_t_2_';
    document.startViewTransition(() => {});
    expect(seen[1]).toEqual({mode: undefined, root: '', page: '_t_2_'});
    dpr.mockRestore();
    page.remove(); small.remove();
  });
  it('Session AL (P14-D): releases leaving pages largest first, only as many as needed, never a small element', () => {
    const mk = (h: number, name: string) => { const el = document.createElement('div'); el.getBoundingClientRect = () => ({width: 1000, height: h, top: 0, left: 0, right: 1000, bottom: h, x: 0, y: 0, toJSON: () => ({})}); el.style.viewTransitionName = name; document.body.append(el); return el; };
    const a = mk(5000, 'a'), b = mk(4000, 'b'), c = mk(500, 'c');
    expect(releaseLeavingPages(document, 6_000_000)).toEqual([a]); // 9.5 M named; the 5 M page goes, 4.5 M fit
    expect([a.style.viewTransitionName, b.style.viewTransitionName, c.style.viewTransitionName]).toEqual(['none', 'b', 'c']);
    // Over the budget with only small elements: null (declined), nothing released.
    expect(releaseLeavingPages(document, 100_000)).toBeNull();
    expect(b.style.viewTransitionName).toBe('b');
    a.remove(); b.remove(); c.remove();
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
