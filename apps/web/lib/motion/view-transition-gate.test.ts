// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {gateViewTransitions, viewTransitionsAllowed} from './view-transition-gate';

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
    expect(document.startViewTransition).toBe(native);
    expect(gateViewTransitions(document, 'full')).toBe(true);
  });
  it('changes nothing where the browser has no view transitions', () => {
    expect(gateViewTransitions(document, 'off')).toBe(false);
    expect(gateViewTransitions(document, 'full')).toBe(false);
    expect(Object.getOwnPropertyNames(document)).not.toContain('startViewTransition');
  });
});
