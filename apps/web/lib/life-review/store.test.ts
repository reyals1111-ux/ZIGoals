import {describe, expect, it} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {LIFE_REVIEW, LIFE_REVIEW_KEY, emptyLifeReview, previousFocus, setFocus, setPeriod} from './store';

const at = '2026-10-12T09:00:00.000Z';
describe('Life review record (zigoals:life-review:v1, device-only)', () => {
  it('keeps one focus per period, clears it with empty text and finds the last period\'s', () => {
    let s = setFocus(emptyLifeReview(), 'week:2026-09-29', 'Walk after lunch', at);
    s = setFocus(s, 'week:2026-10-06', '  Bed by 23:00 ', at);
    s = setFocus(s, 'month:2026-09', 'Pay down the card', at);
    expect(s.focus['week:2026-10-06']!.text).toBe('Bed by 23:00');
    expect(previousFocus(s, 'week:2026-10-06')).toEqual({key: 'week:2026-09-29', text: 'Walk after lunch'});
    expect(previousFocus(s, 'month:2026-10')).toEqual({key: 'month:2026-09', text: 'Pay down the card'});
    expect(previousFocus(s, 'week:2026-09-29')).toBeNull();
    expect(setFocus(s, 'week:2026-10-06', ' ', at).focus['week:2026-10-06']).toBeUndefined();
    expect(setPeriod(s, 'month').period).toBe('month');
    expect(() => setFocus(s, 'year:2026', 'x', at)).toThrow();
  });
  it('reads tolerantly and keeps unknown fields', () => {
    const read = (v: string | null) => readDeviceRecord({getItem: k => (k === LIFE_REVIEW_KEY ? v : null)}, LIFE_REVIEW);
    expect(read(null)).toEqual({data: emptyLifeReview(), unreadable: false});
    expect(read('{').unreadable).toBe(true);
    expect((read(JSON.stringify({version: 1, focus: {}, later: 1})).data as Record<string, unknown>).later).toBe(1);
  });
});
