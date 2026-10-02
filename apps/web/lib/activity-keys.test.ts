import {describe, expect, it} from 'vitest';
import {activityKeys} from '../components/activity-keys';
import {emptyPlatform, platformSchema} from './positions';
import {manualSourcePosition} from './manual-source';

// QA-35 (Session I, Part 10): duplicate asset-event ids stay readable, and the feed still renders each event once.
describe('QA-35: duplicate asset-event ids', () => {
  const position = manualSourcePosition({category: 'Cash', name: 'Fictional cash', quantity: '10', currency: 'USD'}, 'cash', '2026-09-01T00:00:00.000Z');
  const event = (kind: 'added' | 'edited', at: string) => ({id: 'same-id', positionId: 'cash', name: 'Fictional cash', assetClass: 'Cash' as const, kind, at, provenance: 'PRIVATE_EDIT' as const});
  it('saved data with a repeated id still reads, with both events kept (the format is not tightened)', () => {
    const parsed = platformSchema.parse({...emptyPlatform(), positions: [position], assetEvents: [event('added', '2026-09-01T00:00:00.000Z'), event('edited', '2026-09-02T00:00:00.000Z')]});
    expect(parsed.assetEvents.map(e => [e.id, e.kind])).toEqual([['same-id', 'added'], ['same-id', 'edited']]);
  });
  it('gives each feed entry its own key, numbering only the repeats', () => {
    const keys = activityKeys([{category: 'WEALTH', id: 'same-id'}, {category: 'GOAL', id: 'same-id'}, {category: 'WEALTH', id: 'same-id'}, {category: 'WEALTH', id: 'other'}, {category: 'WEALTH', id: 'same-id'}]);
    expect(keys).toEqual(['WEALTH-same-id', 'GOAL-same-id', 'WEALTH-same-id#1', 'WEALTH-other', 'WEALTH-same-id#2']);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
