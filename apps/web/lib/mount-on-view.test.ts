import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {DEFER_BELOW, ROOT_MARGIN, mountsAtOnce} from './mount-on-view';

describe('when a part below the first screen mounts (R11)', () => {
  const rule = {hashPrefixes: ['#dashboard-']};
  it('mounts at once for an address inside it, when forced, or on a wide screen', () => {
    expect(mountsAtOnce('#dashboard-widget-7', rule)).toBe(true);
    expect(mountsAtOnce('#dashboard-item-builtin-goals', rule)).toBe(true);
    expect(mountsAtOnce('', {...rule, force: true})).toBe(true);
    expect(mountsAtOnce('', {...rule, wide: true})).toBe(true);
  });
  it('waits (for view or idle) otherwise, including for an address elsewhere on the page', () => {
    expect(mountsAtOnce('', rule)).toBe(false);
    expect(mountsAtOnce('#', rule)).toBe(false);
    expect(mountsAtOnce('#for-you-weekly-review', rule)).toBe(false);
  });
  it('defers on phones only, with a 600 px look-ahead', () => {
    expect(DEFER_BELOW).toBe('(max-width: 1000px)');
    expect(ROOT_MARGIN).toBe('600px 0px');
  });
  it('Today mounts its widget area through it, keeps the PROTECTED hero, slogan and first cards out of it, and reserves its place', () => {
    const today = readFileSync(new URL('../components/dashboard/today-dashboard.tsx', import.meta.url), 'utf8');
    const area = today.slice(today.indexOf('<section aria-label="Your Today widgets"'));
    expect(area).toContain('widgetArea.mounted');
    expect(area).toContain('dashboard-widget-reserve');
    // The hero and its slogan render before the deferred area, unconditionally.
    expect(today.indexOf('<OrbitSlogan/>')).toBeLessThan(today.indexOf('<section aria-label="Your Today widgets"'));
    expect(today.slice(0, today.indexOf('<section aria-label="Your Today widgets"'))).not.toMatch(/widgetArea\.mounted\s*&&|widgetArea\.mounted\?/);
    expect(readFileSync(new URL('../components/dashboard/dashboard.css', import.meta.url), 'utf8')).toMatch(/\.dashboard-widget-reserve\s*\{[^}]*min-height/);
  });
});
