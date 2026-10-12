import {describe, expect, it} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {MAX_RECENT, SEARCH_RECENT, SEARCH_RECENT_KEY, clearRecent, emptySearchRecent, rememberQuery} from './recent';

describe('recent searches (zigoals:search-recent:v1, device-only)', () => {
  it('keeps the newest eight, once each, newest first', () => {
    let s = emptySearchRecent();
    for (let i = 0; i < 10; i++) s = rememberQuery(s, `query ${i}`);
    s = rememberQuery(s, '  QUERY   9 ');
    expect(s.queries).toHaveLength(MAX_RECENT);
    expect(s.queries[0]).toBe('QUERY 9');
    expect(s.queries.filter(q => q.toLowerCase() === 'query 9')).toHaveLength(1);
    expect(rememberQuery(s, '   ')).toBe(s);
    expect(clearRecent(s).queries).toEqual([]);
  });
  it('reads tolerantly and keeps unknown fields', () => {
    const read = (v: string | null) => readDeviceRecord({getItem: k => (k === SEARCH_RECENT_KEY ? v : null)}, SEARCH_RECENT);
    expect(read(null)).toEqual({data: emptySearchRecent(), unreadable: false});
    expect(read('nope').unreadable).toBe(true);
    expect((read(JSON.stringify({version: 1, queries: ['a'], later: true})).data as Record<string, unknown>).later).toBe(true);
  });
});
