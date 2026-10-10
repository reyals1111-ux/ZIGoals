import {expect, test} from 'vitest';
import {STALE_HANDLE, staleHandles} from './handles';
import {handleAmong} from './actions/plan';

// Session Y Part 4, second security read: a reloaded reply's stale handles never match, not even when the reply spells
// the stale marker itself; the record is still found by its exact title.
test('a stale handle matches nothing, even spelled out by a reply; the exact title still names the record', () => {
  const handles = staleHandles([{handle: 'g1', kind: 'goal', id: 'goal-a', label: 'Emergency fund'}, {handle: 'g2', kind: 'goal', id: 'goal-b', label: 'Trip'}]);
  expect(handles.every(h => h.handle === STALE_HANDLE)).toBe(true);
  expect(handleAmong(handles, 'goal', STALE_HANDLE)).toBeUndefined();
  expect(handleAmong(handles, 'goal', ` ${STALE_HANDLE.toUpperCase()} `)).toBeUndefined();
  expect(handleAmong(handles, 'goal', 'g1')).toBeUndefined();
  expect(handleAmong(handles, 'goal', 'Emergency fund')?.id).toBe('goal-a');
});
