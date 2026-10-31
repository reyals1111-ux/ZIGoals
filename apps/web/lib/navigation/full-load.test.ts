import {describe, expect, it, vi} from 'vitest';
import {fullLoad, fullLoadTarget} from './full-load';

describe('fullLoad (Session AK F0, zigi-memory:188)', () => {
  it('goes to the same path and query, never the fragment, so the browser loads the document again', () => {
    expect(fullLoadTarget({pathname: '/app/settings', search: ''})).toBe('/app/settings');
    expect(fullLoadTarget({pathname: '/app/settings', search: '?tab=data'})).toBe('/app/settings?tab=data');
    // `location.search` never carries the hash; a bare "?" adds nothing.
    expect(fullLoadTarget({pathname: '/app/settings', search: '?'})).toBe('/app/settings');
  });
  it('never leaves this origin: a path that is not a plain absolute path falls back to Today', () => {
    expect(fullLoadTarget({pathname: '//evil.example/app', search: ''})).toBe('/app');
    expect(fullLoadTarget({pathname: 'app/settings', search: ''})).toBe('/app');
  });
  it('replaces the entry (no extra Back step) and does not call reload', () => {
    const replace = vi.fn(), reload = vi.fn();
    fullLoad({location: {pathname: '/app/settings', search: '', hash: '#zigi-notes', replace, reload} as unknown as Location});
    expect(replace).toHaveBeenCalledExactlyOnceWith('/app/settings');
    expect(reload).not.toHaveBeenCalled();
  });
});
