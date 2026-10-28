import {expect, test} from 'vitest';
import {countEvent, metricsSchema, setMetricsOn} from './metrics';

test('Session AI (G14): counts only while on, per month, nothing else; turning off forgets them', () => {
  const at = new Date('2026-10-28T10:00:00Z');
  expect(countEvent({version: 1}, 'card-added', at)).toEqual({version: 1});
  let r = setMetricsOn({version: 1}, true);
  r = countEvent(countEvent(countEvent(r, 'card-added', at), 'card-added', at), 'device-answer', new Date('2026-11-01T10:00:00Z'));
  expect(r.months).toEqual({'2026-10': {'card-added': 2}, '2026-11': {'device-answer': 1}});
  expect(setMetricsOn(r, false)).toEqual({version: 1, on: false});
  expect(Object.keys(metricsSchema.shape)).toEqual(['version', 'on', 'months']);
});
