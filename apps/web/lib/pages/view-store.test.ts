// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {PAGES_VIEW_KEY, type Pages} from './schema';
import {pagesViewSnapshot, resetPagesViewForTests, serverPagesView, setSyncedPages, subscribePagesView} from './view-store';

const AT = '2026-10-07T10:00:00.000Z';
const hidden = (...ids: string[]): Pages => ({version: 1, items: Object.fromEntries(ids.map(id => [id, {v: 'hidden', at: AT}]))});

describe('the shell\'s visible pages and the device mirror (Session W Part 2)', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); resetPagesViewForTests(); });
  afterEach(() => { vi.restoreAllMocks(); });
  test('the server and a device without a mirror show the defaults; nothing is written by reading', () => {
    expect(serverPagesView()).toEqual({version: 1, hidden: ['chess', 'music']});
    expect(pagesViewSnapshot()).toEqual({version: 1, hidden: ['chess', 'music']});
    expect(pagesViewSnapshot()).toBe(pagesViewSnapshot());
    expect(localStorage.length).toBe(0);
  });
  test('before the settings open the mirror answers; a broken mirror reads as the defaults and is kept', () => {
    localStorage.setItem(PAGES_VIEW_KEY, JSON.stringify({version: 1, hidden: ['today', 'chess', 'music'], start: 'health'}));
    expect(pagesViewSnapshot()).toEqual({version: 1, hidden: ['today', 'chess', 'music'], start: 'health'});
    localStorage.setItem(PAGES_VIEW_KEY, '{"version":2}');
    expect(pagesViewSnapshot()).toEqual({version: 1, hidden: ['chess', 'music']});
    expect(localStorage.getItem(PAGES_VIEW_KEY)).toBe('{"version":2}');
  });
  test('the synced choice wins once read and the mirror follows it; back at the defaults the mirror is removed', () => {
    const listener = vi.fn();
    const stop = subscribePagesView(listener);
    expect(setSyncedPages({state: 'ready', pages: hidden('today', 'markets')})).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(pagesViewSnapshot()).toEqual({version: 1, hidden: ['today', 'markets', 'chess', 'music']});
    expect(JSON.parse(localStorage.getItem(PAGES_VIEW_KEY)!)).toEqual({version: 1, hidden: ['today', 'markets', 'chess', 'music']});
    // The same record again changes nothing (no write, no notification).
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const same = hidden('today', 'markets');
    setSyncedPages({state: 'ready', pages: same});
    expect(setItem).not.toHaveBeenCalled();
    setSyncedPages({state: 'ready', pages: undefined});
    expect(localStorage.getItem(PAGES_VIEW_KEY)).toBeNull();
    expect(pagesViewSnapshot()).toEqual({version: 1, hidden: ['chess', 'music']});
    stop();
  });
  test('a person who never hides anything never gets a mirror', () => {
    setSyncedPages({state: 'ready', pages: undefined});
    setSyncedPages({state: 'ready', pages: {version: 1, items: {goals: {v: 'shown', at: AT}}}});
    expect(localStorage.length).toBe(0);
  });
  test('unreadable settings show every page and keep the mirror as it was', () => {
    localStorage.setItem(PAGES_VIEW_KEY, JSON.stringify({version: 1, hidden: ['today', 'chess', 'music']}));
    setSyncedPages({state: 'unreadable'});
    expect(pagesViewSnapshot()).toEqual({version: 1, hidden: []});
    expect(JSON.parse(localStorage.getItem(PAGES_VIEW_KEY)!).hidden).toEqual(['today', 'chess', 'music']);
    setSyncedPages({state: 'pending'});
    expect(pagesViewSnapshot().hidden).toEqual(['today', 'chess', 'music']);
  });
  test('a storage that refuses writes costs only the mirror', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    expect(() => setSyncedPages({state: 'ready', pages: hidden('goals')})).not.toThrow();
    expect(pagesViewSnapshot().hidden).toEqual(['goals', 'chess', 'music']);
  });
});
