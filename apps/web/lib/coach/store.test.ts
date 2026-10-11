import {expect, test} from 'vitest';
import {GUIDE_KEY, emptyGuide} from './schema';
import {dismissNudge, nudgeHidden, readGuide, setGuideEnabled} from './store';

// ADR-011 "Store": unreadable data reads as off and is left untouched; writes only on the switch and "Not today".
function storage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial)), writes: string[] = [];
  return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); writes.push(k); }, map, writes};
}
const TODAY = '2026-10-05';
test('off by default; unreadable or invalid bytes read as off, say so, and are never rewritten by a read', () => {
  const s = storage();
  expect(readGuide(s)).toEqual({data: emptyGuide(), unreadable: false});
  s.setItem(GUIDE_KEY, '{"version":1,"enabled":"yes","dismissed":{}}'); s.writes.length = 0;
  expect(readGuide(s)).toEqual({data: emptyGuide(), unreadable: true});
  expect(s.writes).toEqual([]); expect(s.map.get(GUIDE_KEY)).toBe('{"version":1,"enabled":"yes","dismissed":{}}');
  expect(readGuide({getItem: () => { throw Error('blocked'); }})).toEqual({data: emptyGuide(), unreadable: true});
});
test('the switch writes the choice and the day it was turned on; turning off keeps dismissals and drops the day', () => {
  const s = storage();
  expect(setGuideEnabled(s, true, TODAY)).toEqual({version: 1, enabled: true, enabledOn: TODAY, dismissed: {}});
  const later = setGuideEnabled(s, true, '2026-10-09');
  expect(later.enabledOn).toBe(TODAY);
  const off = setGuideEnabled(s, false, '2026-10-09');
  expect(off).toEqual({version: 1, enabled: false, dismissed: {}});
  expect(setGuideEnabled(s, true, '2026-10-12').enabledOn).toBe('2026-10-12');
  const refusing = {getItem: s.getItem, setItem: () => { throw Error('QuotaExceededError'); }};
  expect(() => setGuideEnabled(refusing, false, TODAY)).toThrow();
});
test('"Not today" hides that nudge for its own window: one day for most, 7 for the quiet day, 28 for a streak or an insight', () => {
  const s = storage(); setGuideEnabled(s, true, TODAY);
  const data = dismissNudge(s, 'habits-open', TODAY);
  expect(data.dismissed).toEqual({'habits-open': TODAY});
  expect(nudgeHidden(data, 'habits-open', TODAY)).toBe(true); expect(nudgeHidden(data, 'habits-open', '2026-10-06')).toBe(false); expect(nudgeHidden(data, 'review-ready', TODAY)).toBe(false);
  const quiet = dismissNudge(s, 'quiet-day', TODAY);
  expect(nudgeHidden(quiet, 'quiet-day', '2026-10-11')).toBe(true); expect(nudgeHidden(quiet, 'quiet-day', '2026-10-12')).toBe(false);
  const streak = dismissNudge(s, 'streak-notice:habit-1:7', TODAY);
  expect(nudgeHidden(streak, 'streak-notice:habit-1:7', '2026-11-01')).toBe(true); expect(nudgeHidden(streak, 'streak-notice:habit-1:7', '2026-11-02')).toBe(false); expect(nudgeHidden(streak, 'streak-notice:habit-1:14', TODAY)).toBe(false);
  const insight = dismissNudge(s, 'insight-ready:steps-water', TODAY);
  expect(nudgeHidden(insight, 'insight-ready:steps-water', '2026-11-01')).toBe(true);
  // A dismissal dated after today (another device's clock) does not hide; old dismissals are pruned at the next write.
  expect(nudgeHidden({...insight, dismissed: {'habits-open': '2026-10-06'}}, 'habits-open', TODAY)).toBe(false);
  const pruned = dismissNudge(s, 'habits-open', '2026-11-30');
  expect(Object.keys(pruned.dismissed)).toEqual(['habits-open']);
  s.setItem(GUIDE_KEY, 'not json');
  expect(() => dismissNudge(s, 'habits-open', TODAY)).toThrow('could not be hidden');
});
